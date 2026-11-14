import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, firefox, webkit } from "playwright";

const baseUrl = process.env.TACO_LOCO_QA_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const email = process.env.TACO_LOCO_ADMIN_EMAIL;
const password = process.env.TACO_LOCO_ADMIN_PASSWORD;
const outputDir = path.resolve(process.env.TACO_LOCO_QA_OUTPUT ?? "output/playwright/admin-mobile-v2");
const browserNames = (process.env.TACO_LOCO_QA_BROWSERS ?? "chromium").split(",").map((x) => x.trim()).filter(Boolean);
const browserTypes = { chromium, firefox, webkit };
const screenshotsEnabled = process.env.TACO_LOCO_QA_SCREENSHOTS !== "false";
const viewports = [360, 390, 430, 768, 1024, 1440];
const results = { baseUrl, captureMode: screenshotsEnabled ? "screenshots" : "interaction-only", browsers: [], browserFailures: [], diagnostics: [], screenshots: [], viewportChecks: [], journeys: [], externalBlocked: [] };
const personalDataMasks = [".order-ticket__identity strong", ".attention-ticket__customer strong", ".history-row__main strong", ".detail-grid dd"];
function instrumentEventSource() {
  window.__adminSseCreated = 0;
  window.__adminSseEvents = [];
  window.__adminSseActive = 0;
  const NativeEventSource = window.EventSource;
  window.EventSource = new Proxy(NativeEventSource, { construct(target, args) {
    window.__adminSseCreated += 1;
    window.__adminSseActive += 1;
    const source = Reflect.construct(target, args);
    for (const event of ["open", "error"]) source.addEventListener(event, () => window.__adminSseEvents.push({ event, readyState: source.readyState, at: new Date().toISOString() }));
    source.addEventListener("order", (event) => {
      let order = null;
      try { order = JSON.parse(event.data)?.order ?? null; } catch { /* Keep diagnostics non-fatal. */ }
      window.__adminSseEvents.push({ event: "order", readyState: source.readyState, sequence: event.lastEventId, orderNumber: order?.orderNumber ?? null, status: order?.status ?? null, at: new Date().toISOString() });
    });
    const nativeClose = source.close.bind(source);
    let closed = false;
    source.close = () => { if (!closed) { closed = true; window.__adminSseActive -= 1; } nativeClose(); };
    return source;
  } });
}

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
  const card = page.locator('[class*="productCard"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const name = (await card.locator("h2").innerText()).trim();
  const add = card.getByRole("button", { name: "Agregar", exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll('[class*="productCard"] button')].some((button) => Object.keys(button).some((key) => key.startsWith("__reactProps$"))), undefined, { timeout: 10000 });
  await add.click();
  const dialog = page.getByRole("dialog");
  const summary = page.getByRole("region", { name: "Resumen del pedido" });
  const openedDialog = await dialog.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  if (!openedDialog) {
    await summary.getByText(name, { exact: true }).waitFor({ state: "visible", timeout: 5000 });
    return name;
  }
  const dialogTitle = (await dialog.locator("h2").innerText()).trim();
  if (dialogTitle !== name) throw new Error("The product customizer did not match the selected product.");
  const requiredGroups = dialog.locator("fieldset").filter({ hasText: "obligatorio" });
  for (let index = 0; index < await requiredGroups.count(); index++) await requiredGroups.nth(index).locator('input[type="radio"]').first().check();
  const plus = dialog.getByRole("button", { name: "Agregar una unidad" });
  if (await plus.isEnabled()) await plus.click();
  await dialog.getByRole("button", { name: /^Agregar ·/ }).click();
  await summary.getByText(name).waitFor({ state: "visible" });
  return name;
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

async function createAndAdvanceSyntheticPickup(page, attentionObserver = null, releaseInitialSse = null, attentionCheckpoint = null) {
  let orderCode = process.env.TACO_LOCO_QA_EXISTING_ORDER_CODE ?? null;
  const marker = process.env.TACO_LOCO_QA_ORDER_MARKER?.trim() || `S7c QA ${randomUUID().slice(0, 8)}`;
  let createdThisRun = false;
  if (orderCode) {
    if (!/^TL-\d{4}$/.test(orderCode)) throw new Error("Existing synthetic order code must use TL-XXXX format.");
    await page.goto(`${baseUrl}/admin/orders/history?q=${encodeURIComponent(orderCode)}`, { waitUntil: "domcontentloaded" });
    const row = page.locator(".history-row").filter({ hasText: orderCode });
    await row.waitFor({ state: "visible", timeout: 15000 });
    await row.click();
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+/i);
  } else {
    await page.goto(`${baseUrl}/admin/orders/history?q=${encodeURIComponent(marker)}`, { waitUntil: "domcontentloaded" });
    await page.locator(".history-group").first().waitFor({ state: "visible", timeout: 15000 });
    await page.locator('[aria-label="Cargando historial"]').waitFor({ state: "detached", timeout: 15000 });
    const matchingRow = page.locator(".history-row").filter({ hasText: marker }).first();
    if (await matchingRow.count()) {
      orderCode = (await matchingRow.locator(".history-row__code").innerText()).trim();
      await matchingRow.click();
      await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+/i);
    } else {
      await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
      await selectAvailableProduct(page);
      await clickAboveMobileNavigation(page, page.getByRole("button", { name: "Continuar" }));
      await page.getByLabel("Nombre del cliente").fill(marker);
      await clickAboveMobileNavigation(page, page.getByRole("button", { name: "Registrar pedido" }));
      await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+(?:\?|$)/i, { timeout: 20000 });
      const heading = await page.locator(".admin-order-detail .eyebrow").innerText();
      orderCode = heading.trim().split(/\s+/).at(-1) ?? null;
      if (!orderCode) throw new Error("Created synthetic order did not show a human-readable code.");
      createdThisRun = true;
      results.journeys.push({ journey: "synthetic manual pickup created through two-step form", result: "PASS", orderCode });
      if (attentionObserver && releaseInitialSse) releaseInitialSse();
    }
  }
  if (!createdThisRun && attentionObserver && releaseInitialSse) releaseInitialSse();

  const beforeTransitionScreenshot = path.join(outputDir, "order-detail-before-transition-390.png");
  if (await saveScreenshot(page, { path: beforeTransitionScreenshot, fullPage: true, animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), beforeTransitionScreenshot));
  const orderId = new URL(page.url()).pathname.split("/").at(-1);
  if (createdThisRun && attentionObserver) {
    await attentionObserver.locator(".connection--live").waitFor({ state: "visible", timeout: 15000 });
    const liveTicket = attentionObserver.locator(".attention-ticket").filter({ hasText: marker });
    await liveTicket.waitFor({ state: "visible", timeout: 20000 });
    if (await liveTicket.count() !== 1) throw new Error("The SSE-open reconciliation duplicated the new attention order.");
    if (attentionCheckpoint) {
      const previousBucket = attentionObserver.locator(".attention-bucket").nth(1);
      const currentCodes = await previousBucket.locator(".attention-ticket__head strong").allTextContents();
      if (attentionCheckpoint.codes.some((value) => !currentCodes.includes(value))) throw new Error("Open-time reconciliation dropped a previously loaded Attention page.");
      if (new Set(currentCodes).size !== currentCodes.length) throw new Error("Open-time reconciliation duplicated an order across loaded Attention pages.");
      if (!(await attentionObserver.getByRole("button", { name: /Sin confirmar/ }).getAttribute("aria-pressed") === "true")) throw new Error("Open-time reconciliation reset the selected Attention filter.");
      if (attentionCheckpoint.anchorCode) {
        const anchor = previousBucket.locator(".attention-ticket").filter({ hasText: attentionCheckpoint.anchorCode }).first();
        const box = await anchor.boundingBox();
        if (!box || Math.abs(box.y - attentionCheckpoint.anchorY) > 4) throw new Error("Open-time reconciliation changed the operator's reading position.");
      }
    }
    const liveShot = path.join(outputDir, "attention-new-order-live-390.png");
    if (await saveScreenshot(attentionObserver, { path: liveShot, fullPage: true, animations: "disabled", mask: personalDataMasks.map((selector) => attentionObserver.locator(selector)), maskColor: "#F6F7F4" })) results.screenshots.push(path.relative(process.cwd(), liveShot));
    results.journeys.push({ journey: "Attention remains open and receives a new synthetic order through shared SSE", result: "PASS", orderCode });
    results.journeys.push({ journey: "order created after the Attention snapshot but before the first SSE response is recovered by open-time reconciliation", result: "PASS", orderCode });
  }
  const readStatus = async () => page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read synthetic order status (${response.status}).`);
    return (await response.json()).status;
  }, orderId);
  let status = await readStatus();
  if (status === "RECEIVED") {
    if (createdThisRun && attentionObserver) {
      await page.waitForFunction(() => { const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Confirmar pedido"); return button instanceof HTMLButtonElement && !button.disabled; }, undefined, { timeout: 10000 });
      await attentionObserver.context().setOffline(true);
      await attentionObserver.locator(".connection--offline").waitFor({ state: "visible", timeout: 5000 });
      const external = await page.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus: "CONFIRMED" }) });
        return { status: response.status, body: await response.json().catch(() => null) };
      }, orderId);
      if (external.status !== 200) throw new Error(`Second operator could not confirm the synthetic order (${external.status}).`);
      const previousOpenCount = await attentionObserver.evaluate(() => window.__adminSseEvents.filter((entry) => entry.event === "open").length);
      await attentionObserver.context().setOffline(false);
      await attentionObserver.locator(".connection--live").waitFor({ state: "visible", timeout: 20000 });
      await attentionObserver.waitForFunction((count) => window.__adminSseEvents.filter((entry) => entry.event === "open").length > count && window.__adminSseActive === 1, previousOpenCount, { timeout: 15000 });
      await attentionObserver.locator(".attention-ticket").filter({ hasText: marker }).waitFor({ state: "detached", timeout: 20000 });
      if (attentionCheckpoint) {
        const previousCodesAfterReconnect = await attentionObserver.locator(".attention-bucket").nth(1).locator(".attention-ticket__head strong").allTextContents();
        if (attentionCheckpoint.codes.some((value) => !previousCodesAfterReconnect.includes(value))) throw new Error("SSE reconnection dropped previously loaded Attention history.");
        if (new Set(previousCodesAfterReconnect).size !== previousCodesAfterReconnect.length) throw new Error("SSE reconnection duplicated an order in loaded Attention history.");
        if (await attentionObserver.getByRole("button", { name: /Sin confirmar/ }).getAttribute("aria-pressed") !== "true") throw new Error("SSE reconnection reset the selected Attention tab.");
      }
      results.journeys.push({ journey: "Attention reconnect reconciles a second-operator status change missed while offline without resetting the selected tab or loaded history", result: "PASS", orderCode });
      const staleAction = page.getByRole("button", { name: "Confirmar pedido", exact: true });
      await page.waitForFunction(() => { const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Confirmar pedido"); return button instanceof HTMLButtonElement && !button.disabled; }, undefined, { timeout: 10000 });
      const conflictResponse = page.waitForResponse((response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === `/api/admin/orders/${orderId}`);
      await staleAction.click();
      const conflict = await conflictResponse;
      if (conflict.status() !== 409) throw new Error(`Expected stale operator transition to recover a 409 conflict, got ${conflict.status()}.`);
      await page.waitForFunction(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}`, { cache: "no-store" });
        return response.ok && (await response.json()).status === "CONFIRMED";
      }, orderId, { timeout: 15000 });
      results.journeys.push({ journey: "second operator updates Attention live; stale first-operator action receives and recovers 409", result: "PASS", orderCode });
      const previousOrderEvents = await attentionObserver.evaluate(() => window.__adminSseEvents.filter((entry) => entry.event === "order").length);
      const nextTransition = await page.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus: "IN_PREPARATION" }) });
        return response.status;
      }, orderId);
      if (nextTransition !== 200) throw new Error(`Post-reconnect transition failed (${nextTransition}).`);
      await attentionObserver.waitForFunction(({ previous, number }) => window.__adminSseEvents.filter((entry) => entry.event === "order").slice(previous).some((entry) => entry.orderNumber === number && entry.status === "IN_PREPARATION"), { previous: previousOrderEvents, number: Number(orderCode.slice(3)) }, { timeout: 15000 });
      if (await attentionObserver.evaluate(() => window.__adminSseActive) !== 1) throw new Error("SSE reconnection left more than one active stream.");
      results.journeys.push({ journey: "fresh SSE transport delivers a later operator transition after online recovery; exactly one stream remains active", result: "PASS", orderCode });
    } else {
      await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
      await page.getByRole("heading", { name: "Confirmado", exact: true }).waitFor({ state: "visible", timeout: 15000 });
    }
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
  await context.addInitScript(instrumentEventSource);
  let attentionContext = null;
  let attentionObserver = null;
  let page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pageErrors = [];
  const diagnostics = { browser: name, pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [] };
  const safePath = (raw) => { try { const url = new URL(raw); return url.pathname.replace(/\/[0-9a-f-]{24,}(?=\/|$)/gi, "/[id]").replace(/\/pedido\/[^/]+/g, "/pedido/[token]"); } catch { return "[invalid-url]"; } };
  const trackPageErrors = (target) => {
    target.on("pageerror", (error) => { pageErrors.push(error.name); diagnostics.pageErrors.push({ name: error.name, message: error.message.slice(0, 300) }); });
    target.on("console", (message) => { if (message.type() === "error") diagnostics.consoleErrors.push({ text: message.text().slice(0, 300) }); });
    target.on("requestfailed", (request) => diagnostics.failedRequests.push({ method: request.method(), path: safePath(request.url()), error: request.failure()?.errorText ?? "unknown" }));
    target.on("response", (response) => { if (response.status() >= 400) diagnostics.httpErrors.push({ status: response.status(), path: safePath(response.url()), cfRay: response.headers()["cf-ray"] ?? null }); });
  };
  trackPageErrors(page);
  try {
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    await saveScreenshot(page, { path: path.join(outputDir, `login-390-${name}.png`), fullPage: name !== "webkit", animations: "disabled" });
    await login(page);
    results.browsers.push({ name, login: "PASS" });

    let releaseInitialSse = null;
    if (name === "chromium") {
      attentionContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await attentionContext.addInitScript(instrumentEventSource);
      attentionObserver = await attentionContext.newPage();
      await attentionObserver.emulateMedia({ reducedMotion: "reduce" });
      trackPageErrors(attentionObserver);
      let holdFirstSse = true;
      let resolveSseStarted;
      const sseStarted = new Promise((resolve) => { resolveSseStarted = resolve; });
      let resolveFirstSse;
      const firstSseGate = new Promise((resolve) => { resolveFirstSse = resolve; });
      releaseInitialSse = () => resolveFirstSse();
      await attentionObserver.route("**/api/admin/orders/events**", async (route) => {
        if (holdFirstSse) {
          holdFirstSse = false;
          resolveSseStarted();
          await firstSseGate;
        }
        await route.continue();
      });
      await attentionObserver.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
      await login(attentionObserver);
      results.journeys.push({ journey: "second isolated administrative session authenticated", result: "PASS" });
      await Promise.race([sseStarted, new Promise((_, reject) => setTimeout(() => reject(new Error("Initial SSE request did not start.")), 15000))]);
      await attentionObserver.getByRole("link", { name: /Necesitan atención/ }).click();
      await attentionObserver.waitForURL(/\/admin\/orders\/attention/);
      await attentionObserver.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin/orders/attention" && new URL(response.url()).searchParams.get("countsOnly") !== "1", { timeout: 15000 });
      await attentionObserver.locator('[aria-label^="Cargando"]').first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
      await Promise.race([sseStarted, new Promise((_, reject) => setTimeout(() => reject(new Error("Initial SSE request did not start.")), 15000))]);
      results.journeys.push({ journey: "initial Attention snapshot completed while first SSE response is held", result: "PASS" });
      await attentionObserver.getByRole("link", { name: /Pedidos/ }).first().click();
      await attentionObserver.waitForURL(/\/admin\/orders(?:\?|$)/);
      await attentionObserver.getByRole("link", { name: /Necesitan atención/ }).click();
      await attentionObserver.waitForURL(/\/admin\/orders\/attention/);
      await attentionObserver.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/admin/orders/attention" && url.searchParams.get("countsOnly") !== "1";
      }, { timeout: 15000 });
      const unconfirmedTab = attentionObserver.getByRole("button", { name: /Sin confirmar/ });
      await unconfirmedTab.click();
      await attentionObserver.waitForFunction(() => [...document.querySelectorAll(".inbox-tabs button")].some((button) => button.textContent?.includes("Sin confirmar") && button.getAttribute("aria-pressed") === "true"));
      await attentionObserver.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/admin/orders/attention" && url.searchParams.get("kind") === "unconfirmed" && url.searchParams.get("countsOnly") !== "1";
      }, { timeout: 15000 });
      const previousBucket = attentionObserver.locator(".attention-bucket").nth(1);
      const more = previousBucket.getByRole("button", { name: "Cargar más" });
      if (await more.count()) {
        const loadedMore = attentionObserver.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === "/api/admin/orders/attention" && url.searchParams.has("cursor") && url.searchParams.get("kind") === "unconfirmed";
        }, { timeout: 15000 });
        await more.click();
        await loadedMore;
      }
      const checkpointCodes = await previousBucket.locator(".attention-ticket__head strong").allTextContents();
      await previousBucket.scrollIntoViewIfNeeded();
      const anchorCard = previousBucket.locator(".attention-ticket").first();
      const anchorCode = checkpointCodes[0] ?? null;
      const anchorBox = anchorCode ? await anchorCard.boundingBox() : null;
      const attentionCheckpoint = { codes: checkpointCodes, anchorCode, anchorY: anchorBox?.y ?? null };
      if (await attentionObserver.evaluate(() => window.__adminSseCreated) !== 1) throw new Error("Navigating between Pedidos and Atención opened a duplicate SSE connection.");
      results.journeys.push({ journey: "one EventSource is retained across Pedidos ↔ Atención client navigation", result: "PASS" });
      results.journeys.push({ journey: "Attention selected filter, loaded historical pages and reading position are checkpointed before the deterministic SSE race", result: "PASS" });
      attentionObserver.__s7cCheckpoint = attentionCheckpoint;
    }
    const orderCode = name === "chromium" ? await createAndAdvanceSyntheticPickup(page, attentionObserver, releaseInitialSse, attentionObserver?.__s7cCheckpoint ?? null) : null;
    await capture(page, "orders", "/admin/orders", 390);
    await capture(page, "attention", "/admin/orders/attention", 390);
    await capture(page, "history", "/admin/orders/history", 390);
    await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
    await selectAvailableProduct(page);
    const summary = page.getByRole("region", { name: "Resumen del pedido" });
    const summaryText = await summary.innerText();
    if (!/2 productos? ·/.test(summaryText)) throw new Error("The accessible product selector did not preserve selected quantity and summary.");
    const dialogTrigger = page.locator('[class*="productCard"]').first().getByRole("button", { name: "Agregar", exact: true });
    await dialogTrigger.click();
    const productDialog = page.getByRole("dialog");
    await productDialog.waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await productDialog.waitFor({ state: "detached" });
    if (!(await dialogTrigger.evaluate((element) => element === document.activeElement))) throw new Error("Closing product selector did not restore keyboard focus to its trigger.");
    const cancel = page.getByRole("link", { name: "Cancelar" });
    page.once("dialog", async (dialog) => { if (dialog.type() !== "confirm") throw new Error(`Expected unsaved-changes confirmation, received ${dialog.type()}`); await dialog.dismiss(); });
    await cancel.click();
    await page.waitForURL(/\/admin\/orders\/new$/);
    if (!(await summary.isVisible())) throw new Error("Dismissing the leave-page warning did not preserve the in-progress order.");
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
    await page.locator('ol[aria-label="Pasos del pedido"] li[aria-current="step"] span').filter({ hasText: "Datos y confirmación" }).waitFor({ state: "visible" });
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
    for (const width of viewports) await capture(page, `product-new-responsive-${width}`, "/admin/products/new", width, width < 500 ? 844 : 900);
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
    await page.locator(".connection--expired").waitFor({ state: "visible", timeout: 15000 });
    results.journeys.push({ journey: "admin logout and session invalidation", result: "PASS" });
    if (attentionObserver) {
      await attentionContext.request.post(`${baseUrl}/api/auth/logout`);
      await attentionObserver.locator(".connection--expired").waitFor({ state: "visible", timeout: 15000 });
      const observerSession = await attentionContext.request.get(`${baseUrl}/api/auth/session`);
      if (observerSession.status() !== 401) throw new Error(`Second admin session was not revoked (${observerSession.status()}).`);
      results.journeys.push({ journey: "independent administrative session revocation closes its SSE connection", result: "PASS" });
    }
    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join(", ")}`);
    diagnostics.eventSources = await Promise.all([page, attentionObserver].filter(Boolean).map(async (target) => await target.evaluate(() => ({ count: window.__adminSseCreated ?? 0, events: window.__adminSseEvents ?? [] })).catch(() => ({ count: null, events: [] }))));
    results.diagnostics.push(diagnostics);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    results.browsers.push({ name, result: "FAIL", reason });
    diagnostics.eventSources = await Promise.all([page, attentionObserver].filter(Boolean).map(async (target) => await target.evaluate(() => ({ count: window.__adminSseCreated ?? 0, events: window.__adminSseEvents ?? [] })).catch(() => ({ count: null, events: [] }))));
    results.diagnostics.push(diagnostics);
    results.browserFailures.push({ name, reason: reason.split("\n")[0] });
    await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
    throw error;
  } finally {
    await attentionContext?.close();
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ outputDir: path.relative(process.cwd(), outputDir), browsers: results.browsers, screenshots: results.screenshots.length, viewportChecks: results.viewportChecks.length, journeys: results.journeys, externalBlocked: results.externalBlocked }, null, 2));
if (!results.browsers.some((browser) => browser.login === "PASS") || results.browserFailures.length > 0) process.exitCode = 1;
