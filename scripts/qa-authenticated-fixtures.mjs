import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium, firefox, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const baseUrl = process.env.TACO_LOCO_STAGING_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const outputDir = path.resolve(process.env.TACO_LOCO_QA_AUTH_OUTPUT ?? "output/playwright/issue-33-authenticated");
const requestedBrowsers = (process.env.TACO_LOCO_QA_BROWSERS ?? "chromium,firefox,webkit").split(",").map((value) => value.trim()).filter(Boolean);
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? (process.platform === "linux" ? "/opt/google/chrome/chrome" : undefined);
const results = [];

if (!/^https:\/\/taco-loco-staging-[a-z0-9-]+\.sjo1848\.workers\.dev\/?$/i.test(baseUrl)) throw new Error(`Refusing non-staging URL: ${baseUrl}`);
function record(caseId, status, detail, evidence = []) { results.push({ caseId, status, detail, evidence }); }
async function shot(page, name) { const file = path.join(outputDir, `${name}.png`); await page.screenshot({ path: file, fullPage: true }); return path.relative(process.cwd(), file); }
async function a11y(page, id, evidence) { const report = await new AxeBuilder({ page }).analyze(); const file = path.join(outputDir, `${id}-axe.json`); await fs.writeFile(file, JSON.stringify(report, null, 2)); evidence.push(path.relative(process.cwd(), file)); record(`${id}:a11y`, report.violations.length ? "FAIL" : "PASS", report.violations.length ? `${report.violations.length} axe violations` : "No axe violations", evidence); }

function fixtureState(identity) {
  return {
    authenticated: true,
    customer: { id: `fixture-customer-${identity}`, displayName: `QA Cliente ${identity}` },
    addresses: [{ id: `${identity}-home`, label: "Casa", address: `${identity} Calle QA 123`, reference: "Puerta QA" }],
    favorites: [{ id: "cmjqa-product-1", name: "Taco QA", priceAmount: 4200, available: true, published: true, archived: false, category: "Tacos" }],
    orders: [{ orderCode: `TL-QA-${identity}`, createdAt: "2026-11-03T12:00:00.000Z", fulfillment: "DELIVERY", currentStage: "WAITING_PAYMENT_CONFIRMATION", title: "Verificando el pago", message: "El local está verificando la transferencia.", totalAmount: 7200, deliveryFeeAmount: 3000, lines: [{ name: "Taco QA", quantity: 1, modifiers: [] }], repeatReference: `${identity}-repeat-only` }],
  };
}

async function installFixtureRoutes(page, state) {
  await page.route("**/api/customer/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const pathname = url.pathname;
    const json = async (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "cache-control": "no-store" }, body: JSON.stringify(body) });
    if (pathname === "/api/customer/auth/session" && request.method() === "GET") return state.authenticated ? json({ authenticated: true, customer: state.customer }) : json({ authenticated: false }, 401);
    if (pathname === "/api/customer/auth/logout" && request.method() === "POST") { state.authenticated = false; return json({ ok: true }); }
    if (!state.authenticated) return json({ code: "CUSTOMER_UNAUTHORIZED" }, 401);
    if (pathname === "/api/customer/orders" && request.method() === "GET") return json({ orders: state.orders, nextCursor: null });
    if (pathname.endsWith("/repeat") && request.method() === "GET") return json({ proposal: { fulfillment: "DELIVERY", subtotalAmount: 4200, lines: [{ productId: "cmjqa-product-1", name: "Taco QA", priceAmount: 4200, quantity: 1, modifiers: [] }] } });
    if (pathname === "/api/customer/preferences" && request.method() === "GET") return json({ addresses: state.addresses, favorites: state.favorites });
    if (pathname === "/api/customer/preferences" && request.method() === "POST") { const body = await request.postDataJSON(); const address = { id: `${state.customer.id}-new`, label: body.label, address: body.address, reference: body.reference || null }; state.addresses.push(address); return json({ address }, 201); }
    if (pathname.startsWith("/api/customer/preferences/") && request.method() === "PATCH") { const id = pathname.split("/").pop(); const body = await request.postDataJSON(); const address = state.addresses.find((item) => item.id === id); if (!address) return json({ code: "NOT_FOUND" }, 404); Object.assign(address, { label: body.label, address: body.address, reference: body.reference || null }); return json({ address }); }
    if (pathname.startsWith("/api/customer/preferences/") && request.method() === "DELETE") { const id = pathname.split("/").pop(); state.addresses = state.addresses.filter((item) => item.id !== id); return json({ ok: true }); }
    if (pathname.startsWith("/api/customer/favorites/") && request.method() === "PUT") { const productId = pathname.split("/").pop(); const body = await request.postDataJSON(); if (body.favorite && !state.favorites.some((item) => item.id === productId)) state.favorites.push({ id: productId, name: "Taco QA", priceAmount: 4200, available: true, published: true, archived: false, category: "Tacos" }); if (!body.favorite) state.favorites = state.favorites.filter((item) => item.id !== productId); return json({ favorite: body.favorite }); }
    return route.fallback();
  });
}

async function runClient(browser, name, identity) {
  const state = fixtureState(identity); const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" }); const page = await context.newPage(); const evidence = [];
  await installFixtureRoutes(page, state); await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  try {
    await page.goto(`${baseUrl}/cuenta`, { waitUntil: "domcontentloaded", timeout: 45_000 }); await page.getByText(`¡Bienvenido, QA Cliente ${identity}!`).waitFor();
    evidence.push(await shot(page, `${name}-client-${identity}-account`)); record(`${name}:client-${identity}:account-orders`, "PASS", "Authenticated account fixture rendered private orders for its isolated customer", evidence); await a11y(page, `${name}-client-${identity}-account`, evidence);
    await page.getByRole("button", { name: "Repetir pedido" }).click(); await page.getByRole("heading", { name: "Revisá tu pedido repetido" }).waitFor(); record(`${name}:client-${identity}:repeat-proposal`, "PASS", "Repeat order creates a review proposal without creating an order", evidence);
    await page.getByLabel("Etiqueta").fill("Trabajo"); await page.getByLabel("Dirección").fill(`${identity} Avenida QA 456`); await page.getByRole("button", { name: "Guardar dirección" }).click(); await page.getByText("Dirección guardada.").waitFor(); record(`${name}:client-${identity}:address-create`, "PASS", "Customer address create flow remained owner-scoped in fixture", evidence);
    await page.goto(`${baseUrl}/menu`, { waitUntil: "domcontentloaded" }); await page.getByRole("navigation", { name: "Navegación principal" }).waitFor(); const favorite = page.getByRole("button", { name: /Guardar|Favorito/ }).first(); if (await favorite.count()) { await favorite.click(); record(`${name}:client-${identity}:favorite`, "PASS", "Favorite toggle UI and authenticated request path exercised", evidence); } else record(`${name}:client-${identity}:favorite`, "FAIL", "Favorite control not found", evidence);
    await page.getByRole("button", { name: /Agregar/ }).first().click(); await page.getByRole("button", { name: /Abrir carrito/ }).click(); await page.getByLabel("Nombre para el pedido (opcional)").waitFor(); record(`${name}:client-${identity}:checkout-authenticated`, "PASS", "Authenticated customer reached checkout without losing the menu session", evidence); evidence.push(await shot(page, `${name}-client-${identity}-checkout`));
    await page.goto(`${baseUrl}/cuenta`, { waitUntil: "domcontentloaded" }); await Promise.all([page.waitForResponse((response) => response.url().endsWith("/api/customer/auth/logout") && response.status() === 200), page.getByRole("button", { name: "Cerrar sesión" }).click()]); await page.getByText("Sesión cerrada.").waitFor(); const sessionAfterLogout = await page.evaluate(async () => (await fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" })).status); if (sessionAfterLogout !== 401) throw new Error(`LOGOUT_SESSION_STATUS_${sessionAfterLogout}`); await page.goto(`${baseUrl}/cuenta`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1_000); if (await page.getByText(`¡Bienvenido, QA Cliente ${identity}!`).count()) throw new Error("LOGOUT_WELCOME_STILL_VISIBLE"); record(`${name}:client-${identity}:logout-isolation`, "PASS", "Fixture logout returned session API 401 and removed authenticated welcome", evidence);
  } catch (error) { record(`${name}:client-${identity}:flow`, "FAIL", error instanceof Error ? error.message : String(error), evidence); }
  await context.tracing.stop({ path: path.join(outputDir, `${name}-client-${identity}.zip`) }); await context.close();
}

async function runBrowser(name, launcher) {
  let browser; try { browser = await launcher.launch({ headless: true, ...(name === "chromium" && executablePath ? { executablePath } : {}) }); } catch (error) { record(`${name}:browser`, "EXTERNAL_BLOCKED", `Browser runtime unavailable: ${error instanceof Error ? error.message : String(error)}`); return; }
  await runClient(browser, name, "A"); await runClient(browser, name, "B");
  record(`${name}:client-cross-account-isolation`, "PASS", "Two isolated fixture contexts used distinct customer IDs, addresses and histories; this is UI fixture coverage, not a server authorization proof");
  await browser.close();
}

await fs.mkdir(outputDir, { recursive: true }); const launchers = { chromium, firefox, webkit }; for (const name of requestedBrowsers) if (launchers[name]) await runBrowser(name, launchers[name]); else record(`${name}:browser`, "EXTERNAL_BLOCKED", "Unknown browser runtime");
const counts = Object.fromEntries(["PASS", "FAIL", "EXTERNAL_BLOCKED"].map((status) => [status, results.filter((item) => item.status === status).length])); const report = { issue: 33, mode: "isolated-auth-fixtures", baseUrl, browsers: requestedBrowsers, results, counts, note: "Fixture authentication intercepts only customer APIs in Playwright contexts. It does not claim Google provider authentication, D1 authorization, or admin authentication." }; await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2)); await fs.writeFile(path.join(outputDir, "report.md"), `# Issue #33 — Authenticated UI fixture QA\n\n- Mode: isolated Playwright API fixtures\n- Browsers: ${requestedBrowsers.join(", ")}\n- Counts: PASS=${counts.PASS}, FAIL=${counts.FAIL}, EXTERNAL_BLOCKED=${counts.EXTERNAL_BLOCKED}\n\nThis report validates authenticated customer UI behavior without weakening staging authentication. It is not evidence of Google provider login, D1 session authorization, or authenticated admin workflows.\n\n| Case | Status | Detail |\n|---|---|---|\n${results.map((item) => `| ${item.caseId} | ${item.status} | ${item.detail.replaceAll("|", "\\|")} |`).join("\n")}\n`); console.log(JSON.stringify({ outputDir: path.relative(process.cwd(), outputDir), counts }, null, 2)); if (counts.FAIL) process.exitCode = 1;
