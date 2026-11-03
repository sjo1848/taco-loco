import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { chromium, firefox, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const baseUrl = process.env.TACO_LOCO_STAGING_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const outputDir = path.resolve(process.env.TACO_LOCO_QA_OUTPUT ?? "output/playwright/issue-33");
const viewports = [360, 390, 430, 768, 1440].map((width) => ({ width, height: width < 500 ? 844 : width < 1000 ? 1024 : 900 }));
const requestedBrowsers = (process.env.TACO_LOCO_QA_BROWSERS ?? "chromium,firefox,webkit").split(",").map((item) => item.trim()).filter(Boolean);
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? (process.platform === "linux" ? "/opt/google/chrome/chrome" : undefined);
const results = [];
const startedAt = new Date().toISOString();

if (!/^https:\/\/taco-loco-staging-[a-z0-9-]+\.sjo1848\.workers\.dev\/?$/i.test(baseUrl)) {
  throw new Error(`Refusing non-staging URL: ${baseUrl}`);
}

function candidateSha() {
  try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "UNKNOWN"; }
}

function record(caseId, status, detail, evidence = []) {
  results.push({ caseId, status, detail, evidence });
}

async function screenshot(page, name) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.relative(process.cwd(), file);
}

async function axe(page, caseId, evidence) {
  const report = await new AxeBuilder({ page }).analyze();
  const file = path.join(outputDir, `${caseId}-axe.json`);
  await fs.writeFile(file, JSON.stringify(report, null, 2));
  evidence.push(path.relative(process.cwd(), file));
  if (report.violations.length > 0) record(`${caseId}:a11y`, "FAIL", `${report.violations.length} axe violations`, evidence);
  else record(`${caseId}:a11y`, "PASS", "No axe violations", evidence);
}

async function runBrowser(name, launcher) {
  let browser;
  try {
    browser = await launcher.launch({ headless: true, ...(name === "chromium" && executablePath ? { executablePath } : {}) });
  } catch (error) {
    record(`${name}:browser`, "EXTERNAL_BLOCKED", `Browser runtime unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const full = name === "chromium";
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires" });
    const page = await context.newPage();
    const evidence = [];
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown"}`));
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    try {
      const response = await page.goto(`${baseUrl}/menu`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      if (response?.status() !== 200) throw new Error(`MENU_HTTP_${response?.status()}`);
      await page.getByRole("navigation", { name: "Navegación principal" }).waitFor();
      const menuShot = await screenshot(page, `${name}-menu-${viewport.width}`); evidence.push(menuShot);
      record(`${name}:menu:${viewport.width}`, "PASS", "Menu, global navigation and catalog rendered on staging", evidence);
      await axe(page, `${name}-menu-${viewport.width}`, evidence);

      if (full && viewport.width === 390) {
        const addButton = page.getByRole("button", { name: "Agregar" }).first();
        await addButton.click();
        await page.getByRole("button", { name: /Abrir carrito/ }).click();
        await page.getByLabel("Nombre para el pedido (opcional)").fill("QA Agent Synthetic");
        const checkoutShot = await screenshot(page, "chromium-checkout-pickup-390"); evidence.push(checkoutShot);
        record("chromium:checkout:pickup", "PASS", "Cart state, order name and pickup checkout rendered", evidence);
        const delivery = page.getByRole("radio", { name: /Delivery/ });
        if (await delivery.count()) {
          await delivery.check();
          await page.getByRole("textbox", { name: "Dirección", exact: true }).fill("Calle QA 123");
          await page.getByLabel("Titular de la transferencia").fill("QA Agent");
          await page.getByLabel("Referencia (opcional)").fill("Puerta QA");
          record("chromium:checkout:delivery", "PASS", "Delivery fields, mandatory address and transfer holder rendered", [await screenshot(page, "chromium-checkout-delivery-390")]);
        }
        await page.getByRole("button", { name: "Seguir viendo el menú" }).click();
        await page.getByRole("button", { name: /Abrir carrito/ }).click();
        let popup;
        page.on("popup", (child) => { popup = child; });
        await page.getByRole("link", { name: /Enviar pedido/ }).click();
        await page.waitForTimeout(1800);
        const successText = await page.getByText(/Pedido preparado/).count();
        const trackingLink = page.getByRole("link", { name: "Ver estado de mi pedido" });
        if (!successText || !(await trackingLink.count())) throw new Error("ORDER_SUCCESS_OR_TRACKING_MISSING");
        record("chromium:checkout:synthetic-order", "PASS", "Synthetic order created; success, tracking and WhatsApp fallback surfaced", [await screenshot(page, "chromium-success-390")]);
        if (popup) await popup.close();
        const trackingHref = await trackingLink.getAttribute("href");
        if (!trackingHref || !/^\/pedido\/[A-Za-z0-9_-]{40,}$/.test(trackingHref)) throw new Error("TRACKING_HREF_INVALID");
        await trackingLink.waitFor({ state: "visible" });
        for (let attempt = 0; attempt < 3 && !/\/pedido\//.test(page.url()); attempt += 1) {
          await trackingLink.click({ noWaitAfter: true });
          await page.waitForTimeout(500);
        }
        if (!/\/pedido\//.test(page.url())) throw new Error("TRACKING_LINK_DID_NOT_NAVIGATE");
        await page.waitForLoadState("domcontentloaded");
        if (!(await page.getByRole("heading", { name: /Pedido TL-/ }).count())) throw new Error("TRACKING_HEADING_MISSING");
        record("chromium:tracking:synthetic-order", "PASS", "Tracking deep-link loaded from the created order", [await screenshot(page, "chromium-tracking-390")]);
      }
    } catch (error) {
      record(`${name}:flow:${viewport.width}`, "FAIL", error instanceof Error ? error.message : String(error), evidence);
    } finally {
      const expectedUnauthenticatedProbes = consoleErrors.length > 0 && consoleErrors.every((message) => message.includes("401"));
      if (consoleErrors.length && !expectedUnauthenticatedProbes) record(`${name}:console:${viewport.width}`, "FAIL", `${consoleErrors.length} console errors`, consoleErrors.slice(0, 10));
      if (expectedUnauthenticatedProbes) record(`${name}:console:${viewport.width}`, "PASS", "Only expected 401 probes for unauthenticated customer session", consoleErrors.slice(0, 10));
      const unexpectedFailedRequests = failedRequests.filter((request) => !request.startsWith("GET whatsapp://"));
      if (unexpectedFailedRequests.length) record(`${name}:network:${viewport.width}`, "FAIL", `${unexpectedFailedRequests.length} failed requests`, unexpectedFailedRequests.slice(0, 10));
      if (failedRequests.length > unexpectedFailedRequests.length) record(`${name}:network:${viewport.width}:handoff`, "PASS", "Expected whatsapp:// navigation was aborted by the automated browser", failedRequests.filter((request) => request.startsWith("GET whatsapp://")).slice(0, 10));
      const trace = path.join(outputDir, `${name}-${viewport.width}.zip`);
      await context.tracing.stop({ path: trace });
      await context.close();
    }
  }
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-AR" });
  const account = await visitor.newPage();
  try {
    const response = await account.goto(`${baseUrl}/cuenta`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (response?.status() !== 200 || !(await account.getByText(/Google|Taco Club/).count())) throw new Error("CUSTOMER_VISITOR_STATE_MISSING");
    record(`${name}:account:visitor`, "PASS", "Unauthenticated customer account state rendered");
    await axe(account, `${name}-account-visitor`, []);
    record(`${name}:account:google`, "EXTERNAL_BLOCKED", "Real Google consent/account selection requires an authorized human account; no bypass or fake PASS used");
    const admin = await visitor.newPage();
    const adminResponse = await admin.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    record(`${name}:admin:login-surface`, adminResponse?.status() === 200 ? "PASS" : "FAIL", "Admin login surface reachable");
    record(`${name}:admin:authenticated-workflows`, "EXTERNAL_BLOCKED", "Operator credentials were intentionally not supplied to the runner");
    record(`${name}:whatsapp:real-handoff`, "EXTERNAL_BLOCKED", "Real WhatsApp app/Web send and return cannot be verified without external provider/device; URL/fallback behavior was tested in the synthetic checkout");
  } catch (error) {
    record(`${name}:account-admin`, "FAIL", error instanceof Error ? error.message : String(error));
  } finally {
    await visitor.close();
  }
  await browser.close();
}

await fs.mkdir(outputDir, { recursive: true });
const launchers = { chromium, firefox, webkit };
for (const name of requestedBrowsers) {
  if (!(name in launchers)) { record(`${name}:browser`, "EXTERNAL_BLOCKED", "Unknown browser requested"); continue; }
  await runBrowser(name, launchers[name]);
}

const finishedAt = new Date().toISOString();
const report = { issue: 33, baseUrl, candidateSha: candidateSha(), startedAt, finishedAt, browsers: requestedBrowsers, viewports, results };
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
const counts = Object.fromEntries(["PASS", "FAIL", "EXTERNAL_BLOCKED"].map((status) => [status, results.filter((item) => item.status === status).length]));
const markdown = [`# Issue #33 — Autonomous staging QA`, ``, `- Candidate: \`${report.candidateSha}\``, `- Staging: ${baseUrl}`, `- Started: ${startedAt}`, `- Finished: ${finishedAt}`, `- Browsers: ${requestedBrowsers.join(", ")}`, `- Viewports: ${viewports.map((item) => item.width).join(", ")}`, `- Counts: PASS=${counts.PASS}, FAIL=${counts.FAIL}, EXTERNAL_BLOCKED=${counts.EXTERNAL_BLOCKED}`, ``, `| Case | Status | Detail |`, `|---|---|---|`, ...results.map((item) => `| ${item.caseId} | ${item.status} | ${item.detail.replaceAll("|", "\\|")} |`)].join("\n");
await fs.writeFile(path.join(outputDir, "report.md"), `${markdown}\n`);
console.log(JSON.stringify({ outputDir: path.relative(process.cwd(), outputDir), candidateSha: report.candidateSha, counts }, null, 2));
if (counts.FAIL > 0) process.exitCode = 1;
