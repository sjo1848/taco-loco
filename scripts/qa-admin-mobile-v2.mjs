import fs from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const baseUrl = process.env.TACO_LOCO_QA_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const email = process.env.TACO_LOCO_ADMIN_EMAIL;
const password = process.env.TACO_LOCO_ADMIN_PASSWORD;
const outputDir = path.resolve(process.env.TACO_LOCO_QA_OUTPUT ?? "output/playwright/admin-mobile-v2");
const browserNames = (process.env.TACO_LOCO_QA_BROWSERS ?? "chromium").split(",").map((x) => x.trim()).filter(Boolean);
const browserTypes = { chromium, firefox, webkit };
const screenshotsEnabled = process.env.TACO_LOCO_QA_SCREENSHOTS !== "false";
const viewports = [360, 390, 430, 768, 1024, 1440];
const results = { baseUrl, captureMode: screenshotsEnabled ? "screenshots" : "interaction-only", browsers: [], browserFailures: [], screenshots: [], viewportChecks: [], journeys: [], externalBlocked: [] };
const personalDataMasks = [".order-ticket__identity strong", ".attention-ticket__customer strong", ".history-row__main strong", ".detail-grid dd"];

if (!email || !password) throw new Error("Set TACO_LOCO_ADMIN_EMAIL and TACO_LOCO_ADMIN_PASSWORD in the process environment.");
if (!/^https:\/\/taco-loco-staging-20260913\.sjo1848\.workers\.dev$/.test(baseUrl)) throw new Error("QA script only permits the authorized staging origin.");
await fs.mkdir(outputDir, { recursive: true });

async function saveScreenshot(page, options) {
  if (!screenshotsEnabled) return false;
  await page.screenshot(options);
  return true;
}

async function capture(page, name, route, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  if (!response || response.status() >= 500) throw new Error(`${name} returned HTTP ${response?.status() ?? "no response"}`);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    () => ![...document.querySelectorAll(".admin-skeleton-list")].some((element) => element.getClientRects().length > 0),
    undefined,
    { timeout: 15000 },
  );
  if (route === "/admin/orders") await page.locator(".connection--live").waitFor({ state: "visible", timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  if (overflow.content > overflow.viewport + 1) throw new Error(`${name} horizontal overflow ${overflow.content}/${overflow.viewport}`);
  results.viewportChecks.push({ browser: page.context().browser()?.browserType().name(), screen: name, width, overflow: false });
  const browserName = page.context().browser()?.browserType().name() ?? "unknown";
  const file = path.join(outputDir, `${name}-${width}-${browserName}.png`);
  if (await saveScreenshot(page, { path: file, fullPage: browserName !== "webkit", animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)).filter(Boolean), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), file));
  return response;
}

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  // WebKit can expose the server-rendered form before React has hydrated it.
  // Wait for the login page's short request burst to settle before clicking.
  await page.waitForLoadState("networkidle", { timeout: 10000 });
  await page.getByLabel("Email").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/admin\/orders(?:\?|$)/, { timeout: 20000 });
  await page.getByRole("heading", { name: "Pedidos" }).waitFor({ state: "visible" });
}

async function selectAvailableProduct(page) {
  const select = page.locator(".order-form__add select");
  await select.waitFor({ state: "visible" });
  const options = await select.locator("option").evaluateAll((items) => items.map((option) => ({
    value: option.value,
    label: option.textContent?.trim() ?? "",
    disabled: option.disabled,
  })));
  const product = options.find((option) => option.value && !option.disabled);
  if (!product) throw new Error(`Manual order has no selectable published/available products (option count: ${options.length}).`);
  // A client-side navigation can expose the server-rendered form before its
  // controlled React select hydrates. Reapply only this non-mutating selection
  // until React commits it; no order is created by this helper.
  for (let attempt = 0; attempt < 4; attempt++) {
    await select.selectOption({ value: product.value });
    try {
      await page.waitForFunction(() => {
        const button = document.querySelector(".order-form__add button");
        return button instanceof HTMLButtonElement && !button.disabled;
      }, undefined, { timeout: 1200 });
      return;
    } catch {
      if (attempt === 3) throw new Error("The selected product was not committed to the manual-order form.");
      await page.waitForTimeout(250);
    }
  }
}

async function assertAboveMobileNavigation(page, locator) {
  // Center the CTA in the usable viewport; scrollIntoViewIfNeeded aligns to
  // the visual bottom edge and does not account for the fixed navigation.
  await locator.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await page.waitForTimeout(50);
  const button = await locator.boundingBox();
  const nav = await page.locator('nav[aria-label="Navegación administrativa móvil"]').boundingBox();
  if (!button || (nav && button.y + button.height > nav.y - 4)) {
    throw new Error("Primary form action is obscured by the fixed mobile navigation.");
  }
}

async function clickAboveMobileNavigation(page, locator) {
  await assertAboveMobileNavigation(page, locator);
  await locator.click();
}

async function createAndAdvanceSyntheticPickup(page) {
  let orderCode = process.env.TACO_LOCO_QA_EXISTING_ORDER_CODE ?? null;
  const marker = `S7c QA ${new Date().toISOString().slice(0, 10)}`;
  if (orderCode) {
    if (!/^TL-\d{4}$/.test(orderCode)) throw new Error("Existing synthetic order code must use TL-XXXX format.");
    await page.goto(`${baseUrl}/admin/orders/history?q=${encodeURIComponent(orderCode)}`, { waitUntil: "domcontentloaded" });
    const row = page.locator(".history-row").filter({ hasText: orderCode });
    await row.waitFor({ state: "visible", timeout: 15000 });
    await row.click();
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+/i);
  } else {
    await page.goto(`${baseUrl}/admin/orders/history?q=${encodeURIComponent(marker)}`, { waitUntil: "domcontentloaded" });
    await page.locator(".history-list").waitFor({ state: "visible", timeout: 15000 });
    await page.locator('[aria-label="Cargando historial"]').waitFor({ state: "detached", timeout: 15000 });
    const matchingRow = page.locator(".history-row").filter({ hasText: marker }).first();
    if (await matchingRow.count()) {
      orderCode = (await matchingRow.locator(".history-row__code").innerText()).trim();
      await matchingRow.click();
      await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+/i);
    } else {
      await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
      await selectAvailableProduct(page);
      await page.getByRole("button", { name: "Agregar", exact: true }).click();
      const line = page.locator(".order-form__line").first();
      const modifierLabels = line.locator("label");
      for (let i = 0; i < await modifierLabels.count(); i++) {
        const label = modifierLabels.nth(i);
        if ((await label.innerText()).includes("obligatorio")) await label.locator("select").selectOption({ index: 1 });
      }
      await clickAboveMobileNavigation(page, page.getByRole("button", { name: "Continuar" }));
      await page.getByLabel("Nombre del cliente").fill(marker);
      await clickAboveMobileNavigation(page, page.getByRole("button", { name: "Registrar pedido" }));
      await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+(?:\?|$)/i, { timeout: 20000 });
      const heading = await page.locator(".admin-order-detail .eyebrow").innerText();
      orderCode = heading.trim().split(/\s+/).at(-1) ?? null;
      if (!orderCode) throw new Error("Created synthetic order did not show a human-readable code.");
      results.journeys.push({ journey: "synthetic manual pickup created through two-step form", result: "PASS", orderCode });
    }
  }

  const beforeTransitionScreenshot = path.join(outputDir, "order-detail-before-transition-390.png");
  if (await saveScreenshot(page, { path: beforeTransitionScreenshot, fullPage: name !== "webkit", animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), beforeTransitionScreenshot));
  const orderId = new URL(page.url()).pathname.split("/").at(-1);
  const readStatus = async () => page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read synthetic order status (${response.status}).`);
    return (await response.json()).status;
  }, orderId);
  let status = await readStatus();
  if (status === "RECEIVED") {
    await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
    await page.getByRole("heading", { name: "Confirmado", exact: true }).waitFor({ state: "visible", timeout: 15000 });
    status = "CONFIRMED";
  }
  if (status === "CONFIRMED") {
    await page.goto(`${baseUrl}/admin/orders?cola=iniciar`, { waitUntil: "domcontentloaded" });
    const ticket = page.locator(".order-ticket").filter({ hasText: orderCode });
    await ticket.getByRole("button", { name: "Iniciar preparación", exact: true }).click();
    await ticket.waitFor({ state: "detached", timeout: 15000 });
    await page.goto(`${baseUrl}/admin/orders/${orderId}`, { waitUntil: "domcontentloaded" });
    status = "IN_PREPARATION";
  }
  if (status === "IN_PREPARATION") {
    await page.getByRole("button", { name: "Marcar listo", exact: true }).click();
    await page.getByRole("heading", { name: "Listo", exact: true }).waitFor({ state: "visible", timeout: 15000 });
    status = "READY";
  }
  if (status === "READY") {
    await page.getByRole("button", { name: "Marcar entregado", exact: true }).click();
    await page.getByRole("heading", { name: "Entregado", exact: true }).waitFor({ state: "visible", timeout: 15000 });
    status = "DELIVERED";
  }
  if (status !== "DELIVERED" || await readStatus() !== "DELIVERED") throw new Error(`Synthetic pickup lifecycle stopped at ${status}.`);
  results.journeys.push({ journey: "pickup confirm → preparation → ready → delivered through authorized transitions", result: "PASS" });
  return orderCode;
}

for (const name of browserNames) {
  const type = browserTypes[name];
  if (!type) throw new Error(`Unknown browser ${name}`);
  let browser;
  try {
    browser = await type.launch({
      headless: true,
      ...(name === "chromium" && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    });
  } catch (error) {
    results.externalBlocked.push({ browser: name, reason: `Browser runtime unavailable: ${error instanceof Error ? error.message.split("\n")[0] : "unknown"}` });
    continue;
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pageErrors = [];
  const trackPageErrors = (target) => target.on("pageerror", (error) => pageErrors.push(error.name));
  trackPageErrors(page);
  try {
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    await saveScreenshot(page, { path: path.join(outputDir, `login-390-${name}.png`), fullPage: name !== "webkit", animations: "disabled" });
    await login(page);
    results.browsers.push({ name, login: "PASS" });

    const orderCode = name === "chromium" ? await createAndAdvanceSyntheticPickup(page) : null;
    await capture(page, "orders", "/admin/orders", 390);
    await capture(page, "attention", "/admin/orders/attention", 390);
    await capture(page, "history", "/admin/orders/history", 390);
    await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
    await selectAvailableProduct(page);
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const reviewLine = page.locator(".order-form__line").first();
    const reviewModifierLabels = reviewLine.locator("label");
    for (let i = 0; i < await reviewModifierLabels.count(); i++) {
      const label = reviewModifierLabels.nth(i);
      if ((await label.innerText()).includes("obligatorio")) await label.locator("select").selectOption({ index: 1 });
    }
    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      await assertAboveMobileNavigation(page, page.getByRole("button", { name: "Continuar" }));
      await page.evaluate(() => window.scrollTo(0, 0));
      const file = path.join(outputDir, `new-order-step-1-${width}-${name}.png`);
      if (await saveScreenshot(page, { path: file, fullPage: name !== "webkit", animations: "disabled" })) results.screenshots.push(path.relative(process.cwd(), file));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const prematureOrderPosts = [];
    const watchPrematureOrderPost = (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/admin/orders") prematureOrderPosts.push(true);
    };
    page.on("request", watchPrematureOrderPost);
    await clickAboveMobileNavigation(page, page.getByRole("button", { name: "Continuar" }));
    await page.locator('.order-stepper li[aria-current="step"] span').filter({ hasText: "Datos y confirmación" }).waitFor({ state: "visible" });
    await page.waitForTimeout(200);
    page.off("request", watchPrematureOrderPost);
    if (prematureOrderPosts.length) throw new Error("The step 1 Continue action submitted an order before operator confirmation.");
    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      await assertAboveMobileNavigation(page, page.getByRole("button", { name: "Registrar pedido" }));
      await page.evaluate(() => window.scrollTo(0, 0));
      const file = path.join(outputDir, `new-order-step-2-${width}-${name}.png`);
      if (await saveScreenshot(page, { path: file, fullPage: name !== "webkit", animations: "disabled" })) results.screenshots.push(path.relative(process.cwd(), file));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "products", "/admin/products", 390);
    const firstProduct = page.locator(".catalog-product").first();
    if (await firstProduct.count()) {
      await firstProduct.getByRole("link", { name: "Editar" }).click();
      await page.locator(".product-image-editor").waitFor({ state: "visible" });
      const productEditScreenshot = path.join(outputDir, `product-edit-390-${name}.png`);
      if (await saveScreenshot(page, { path: productEditScreenshot, fullPage: name !== "webkit", animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), productEditScreenshot));
    }
    await capture(page, "categories", "/admin/categories", 390);
    await capture(page, "settings", "/admin/settings", 390);
    for (const width of viewports) await capture(page, `settings-responsive-${width}`, "/admin/settings", width, width < 500 ? 844 : 900);
    await capture(page, "more", "/admin/more", 390);
    await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded" });
    const assertQueue = async (index, expected) => {
      await page.waitForFunction(({ value, buttonIndex }) =>
        new URLSearchParams(window.location.search).get("cola") === value &&
        document.querySelectorAll(".queue-tabs button")[buttonIndex]?.getAttribute("aria-pressed") === "true",
      { value: expected, buttonIndex: index });
    };
    for (const [index, expected] of [[0, "iniciar"], [1, "preparando"], [2, "listos"]]) {
      await page.locator(".queue-tabs button").nth(index).click();
      await assertQueue(index, expected);
      await page.waitForTimeout(100);
      const file = path.join(outputDir, `orders-queue-${expected}-390-${name}.png`);
      if (await saveScreenshot(page, { path: file, fullPage: name !== "webkit", animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), file));
    }
    await page.goBack();
    await assertQueue(1, "preparando");
    await page.goBack();
    await assertQueue(0, "iniciar");
    await page.goForward();
    await assertQueue(1, "preparando");
    if (name === "webkit") {
      results.journeys.push({ journey: "kitchen queue state survives browser back/forward", result: "PASS" });
      results.externalBlocked.push({ browser: "webkit", journey: "same-page reload immediately after multiple queue history transitions", reason: "Headless WebKit renderer crashes on this sequence. Direct query navigation and reload pass independently; the harness opens a fresh page in the same authenticated context to continue QA." });
      await page.close();
      page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      trackPageErrors(page);
      await page.goto(`${baseUrl}/admin/orders?cola=preparando`, { waitUntil: "domcontentloaded" });
      await assertQueue(1, "preparando");
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertQueue(1, "preparando");
      results.journeys.push({ journey: "kitchen queue deep-link and reload in fresh page with same session", result: "PASS" });
    } else {
      await page.reload({ waitUntil: "domcontentloaded" });
      await assertQueue(1, "preparando");
      results.journeys.push({ journey: "kitchen queues serialize approved URL state and survive reload/back/forward", result: "PASS" });
    }
    await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded" });
    const desktopRoutes = [
      ["orders-desktop", "/admin/orders"], ["attention-desktop", "/admin/orders/attention"],
      ["history-desktop", "/admin/orders/history"], ["new-order-desktop", "/admin/orders/new"],
      ["products-desktop", "/admin/products"], ["product-new-desktop", "/admin/products/new"],
      ["categories-desktop", "/admin/categories"], ["settings-desktop", "/admin/settings"], ["more-desktop", "/admin/more"],
    ];
    for (const [screen, route] of desktopRoutes) await capture(page, screen, route, 1440, 1000);
    if (orderCode) {
      await page.goto(`${baseUrl}/admin/orders/history?q=${encodeURIComponent(orderCode)}`, { waitUntil: "domcontentloaded" });
      await page.locator(".history-row").first().waitFor({ state: "visible" });
      results.journeys.push({ journey: "completed synthetic order discoverable in filtered history", result: "PASS" });
    }
    for (const width of viewports) await capture(page, `orders-responsive-${width}`, "/admin/orders", width, width < 500 ? 844 : 900);
    await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded" });
    await page.request.post(`${baseUrl}/api/auth/logout`);
    const session = await page.request.get(`${baseUrl}/api/auth/session`);
    if (session.status() !== 401) throw new Error(`Admin logout did not invalidate session (${session.status()})`);
    results.journeys.push({ journey: "admin logout and session invalidation", result: "PASS" });
    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(", ")}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    results.browsers.push({ name, result: "FAIL", reason });
    results.browserFailures.push({ name, reason: reason.split("\n")[0] });
    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ outputDir: path.relative(process.cwd(), outputDir), browsers: results.browsers, screenshots: results.screenshots.length, viewportChecks: results.viewportChecks.length, journeys: results.journeys, externalBlocked: results.externalBlocked }, null, 2));
if (!results.browsers.some((browser) => browser.login === "PASS") || results.browserFailures.length > 0) process.exitCode = 1;
