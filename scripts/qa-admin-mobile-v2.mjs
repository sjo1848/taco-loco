import fs from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const baseUrl = process.env.TACO_LOCO_QA_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const email = process.env.TACO_LOCO_ADMIN_EMAIL;
const password = process.env.TACO_LOCO_ADMIN_PASSWORD;
const outputDir = path.resolve(process.env.TACO_LOCO_QA_OUTPUT ?? "output/playwright/admin-mobile-v2");
const browserNames = (process.env.TACO_LOCO_QA_BROWSERS ?? "chromium").split(",").map((x) => x.trim()).filter(Boolean);
const browserTypes = { chromium, firefox, webkit };
const viewports = [360, 390, 430, 768, 1024, 1440];
const results = { baseUrl, browsers: [], screenshots: [], viewportChecks: [], journeys: [], externalBlocked: [] };
const personalDataMasks = [".order-ticket__identity strong", ".attention-ticket__customer strong", ".history-row__main strong", ".detail-grid dd"];

if (!email || !password) throw new Error("Set TACO_LOCO_ADMIN_EMAIL and TACO_LOCO_ADMIN_PASSWORD in the process environment.");
if (!/^https:\/\/taco-loco-staging-20260913\.sjo1848\.workers\.dev$/.test(baseUrl)) throw new Error("QA script only permits the authorized staging origin.");
await fs.mkdir(outputDir, { recursive: true });

async function capture(page, name, route, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  const response = await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  if (!response || response.status() >= 500) throw new Error(`${name} returned HTTP ${response?.status() ?? "no response"}`);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(250);
  const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  if (overflow.content > overflow.viewport + 1) throw new Error(`${name} horizontal overflow ${overflow.content}/${overflow.viewport}`);
  results.viewportChecks.push({ browser: page.context().browser()?.browserType().name(), screen: name, width, overflow: false });
  const browserName = page.context().browser()?.browserType().name() ?? "unknown";
  const file = path.join(outputDir, `${name}-${width}-${browserName}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)).filter(Boolean) });
  results.screenshots.push(path.relative(process.cwd(), file));
  return response;
}

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL(/\/admin\/orders(?:\?|$)/, { timeout: 20000 });
  await page.getByRole("heading", { name: "Pedidos" }).waitFor({ state: "visible" });
}

async function createAndAdvanceSyntheticPickup(page) {
  await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
  await page.locator(".order-form__add select").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  const line = page.locator(".order-form__line").first();
  const modifierLabels = line.locator("label");
  for (let i = 0; i < await modifierLabels.count(); i++) {
    const label = modifierLabels.nth(i);
    if ((await label.innerText()).includes("obligatorio")) await label.locator("select").selectOption({ index: 1 });
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre del cliente").fill(`S7c QA ${new Date().toISOString().slice(0, 10)}`);
  await page.getByRole("button", { name: "Registrar pedido" }).click();
  await page.waitForURL(/\/admin\/orders\/[0-9a-f-]+(?:\?|$)/i, { timeout: 20000 });
  const code = await page.locator(".admin-order-detail .eyebrow").innerText();
  const orderId = new URL(page.url()).pathname.split("/").at(-1);
  results.journeys.push({ journey: "synthetic manual pickup created through two-step form", result: "PASS", orderCode: code.trim().split(/\s+/).at(-1) });
  await page.screenshot({ path: path.join(outputDir, "order-detail-390.png"), fullPage: true, animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)) });
  results.screenshots.push(path.relative(process.cwd(), path.join(outputDir, "order-detail-390.png")));
  await page.getByRole("button", { name: "Confirmar pedido", exact: true }).click();
  await page.getByRole("heading", { name: "Confirmado", exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await page.goto(`${baseUrl}/admin/orders?cola=iniciar`, { waitUntil: "domcontentloaded" });
  const ticket = page.locator(".order-ticket").filter({ hasText: code.trim().split(/\s+/).at(-1) });
  await ticket.getByRole("button", { name: "Iniciar preparación", exact: true }).click();
  await ticket.waitFor({ state: "detached", timeout: 15000 });
  await page.goto(`${baseUrl}/admin/orders/${orderId}`, { waitUntil: "domcontentloaded" });
  for (const [action, expected] of [["Marcar listo", "Listo"], ["Marcar entregado", "Entregado"]]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await page.getByRole("heading", { name: expected, exact: true }).waitFor({ state: "visible", timeout: 15000 });
  }
  results.journeys.push({ journey: "pickup confirm → preparation → ready → delivered through authorized transitions", result: "PASS" });
  return code.trim().split(/\s+/).at(-1);
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
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.name));
  try {
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: path.join(outputDir, `login-390-${name}.png`), fullPage: true, animations: "disabled" });
    await login(page);
    results.browsers.push({ name, login: "PASS" });

    const orderCode = name === "chromium" ? await createAndAdvanceSyntheticPickup(page) : null;
    await capture(page, "orders", "/admin/orders", 390);
    await capture(page, "attention", "/admin/orders/attention", 390);
    await capture(page, "history", "/admin/orders/history", 390);
    await page.goto(`${baseUrl}/admin/orders/new`, { waitUntil: "domcontentloaded" });
    await page.locator(".order-form__add select").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    const reviewLine = page.locator(".order-form__line").first();
    const reviewModifierLabels = reviewLine.locator("label");
    for (let i = 0; i < await reviewModifierLabels.count(); i++) {
      const label = reviewModifierLabels.nth(i);
      if ((await label.innerText()).includes("obligatorio")) await label.locator("select").selectOption({ index: 1 });
    }
    await page.screenshot({ path: path.join(outputDir, `new-order-step-1-390-${name}.png`), fullPage: true, animations: "disabled" });
    results.screenshots.push(path.relative(process.cwd(), path.join(outputDir, `new-order-step-1-390-${name}.png`)));
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("heading", { name: "Datos y confirmación" }).waitFor({ state: "visible" });
    await page.screenshot({ path: path.join(outputDir, `new-order-step-2-390-${name}.png`), fullPage: true, animations: "disabled" });
    results.screenshots.push(path.relative(process.cwd(), path.join(outputDir, `new-order-step-2-390-${name}.png`)));
    await capture(page, "products", "/admin/products", 390);
    const firstProduct = page.locator(".catalog-product").first();
    if (await firstProduct.count()) {
      await firstProduct.getByRole("link", { name: "Editar" }).click();
      await page.locator(".product-image-editor").waitFor({ state: "visible" });
      await page.screenshot({ path: path.join(outputDir, `product-edit-390-${name}.png`), fullPage: true, animations: "disabled", mask: personalDataMasks.map((selector) => page.locator(selector)) });
      results.screenshots.push(path.relative(process.cwd(), path.join(outputDir, `product-edit-390-${name}.png`)));
    }
    await capture(page, "categories", "/admin/categories", 390);
    await capture(page, "settings", "/admin/settings", 390);
    await capture(page, "more", "/admin/more", 390);
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
    results.browsers.push({ name, result: "FAIL", reason: error instanceof Error ? error.message : "unknown" });
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ outputDir: path.relative(process.cwd(), outputDir), browsers: results.browsers, screenshots: results.screenshots.length, viewportChecks: results.viewportChecks.length, journeys: results.journeys, externalBlocked: results.externalBlocked }, null, 2));
if (!results.browsers.some((browser) => browser.name === "chromium" && browser.login === "PASS")) process.exitCode = 1;
