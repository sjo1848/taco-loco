import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.TACO_LOCO_QA_URL ?? "https://taco-loco-staging-20260913.sjo1848.workers.dev";
const email = process.env.TACO_LOCO_ADMIN_EMAIL;
const password = process.env.TACO_LOCO_ADMIN_PASSWORD;
const outputPath = path.resolve(process.env.TACO_LOCO_SSE_LOAD_OUTPUT ?? "output/playwright/admin-sse-load-20261114.json");
const durationMs = Number(process.env.TACO_LOCO_SSE_LOAD_DURATION_MS ?? 30_000);
if (!email || !password) throw new Error("Set TACO_LOCO_ADMIN_EMAIL and TACO_LOCO_ADMIN_PASSWORD in the process environment.");
if (baseUrl !== "https://taco-loco-staging-20260913.sjo1848.workers.dev") throw new Error("Load probe is restricted to the authorized staging origin.");
if (!Number.isFinite(durationMs) || durationMs < 10_000 || durationMs > 60_000) throw new Error("Choose a bounded duration between 10 and 60 seconds.");

const browser = await chromium.launch({ headless: true });
const activeOperators = [];
const report = {
  baseUrl,
  measurement: "independent authenticated admin sessions against existing staging; no order mutations",
  durationPerScenarioMs: durationMs,
  scenarios: [],
};

async function openOperator() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
    await context.addInitScript(() => {
      window.__adminSseCreated = 0;
      window.__adminSseActive = 0;
      window.EventSource = new Proxy(window.EventSource, { construct(target, args) {
        window.__adminSseCreated += 1;
        window.__adminSseActive += 1;
        const source = Reflect.construct(target, args);
        const nativeClose = source.close.bind(source);
        let closed = false;
        source.close = () => { if (!closed) { closed = true; window.__adminSseActive -= 1; } nativeClose(); };
        return source;
      } });
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    // Avoid filling the controlled React form before hydration. A native DOM
    // value can be set before the onChange handler is attached, leaving React
    // state empty and producing a misleading client-side email validation.
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
    await page.getByLabel("Email").fill(email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    const loginResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login",
      { timeout: 20_000 },
    );
    await page.getByRole("button", { name: "Ingresar" }).click();
    const loginResponse = await loginResponsePromise;
    if (!loginResponse.ok()) throw new Error(`Admin login API returned HTTP ${loginResponse.status()}.`);
    const session = await context.request.get(`${baseUrl}/api/auth/session`);
    if (!session.ok()) throw new Error(`Authenticated admin session returned HTTP ${session.status()}.`);
    const boardResponse = await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    if (!boardResponse?.ok()) throw new Error(`Admin orders page returned HTTP ${boardResponse?.status() ?? "no response"}.`);
    await page.locator(".connection--live").waitFor({ state: "visible", timeout: 20_000 });
    return { context, page };
    } catch (error) {
      await context.request.post(`${baseUrl}/api/auth/logout`).catch(() => {});
      await context.close();
      throw error;
    }
}

async function closeOperator(operator) {
  const response = await operator.context.request.post(`${baseUrl}/api/auth/logout`);
  if (!response.ok()) throw new Error(`Admin logout failed with HTTP ${response.status()}.`);
  const session = await operator.context.request.get(`${baseUrl}/api/auth/session`);
  if (session.status() !== 401) throw new Error(`Admin session was not revoked (${session.status()}).`);
  await operator.page.locator(".connection--expired").waitFor({ state: "visible", timeout: 12_000 });
  const active = await operator.page.evaluate(() => window.__adminSseActive ?? 0);
  if (active !== 0) throw new Error(`SSE remained active after session revocation (${active}).`);
  await operator.context.close();
}

try {
  for (const target of [1, 3, 5]) {
    const active = [];
    for (let index = 0; index < target; index++) {
      const operator = await openOperator();
      active.push(operator);
      activeOperators.push(operator);
    }
    const opened = Date.now();
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    const ended = Date.now();
    const activeStreamCounts = await Promise.all(active.map(({ page }) => page.evaluate(() => window.__adminSseActive ?? 0)));
    const totalStreamCounts = await Promise.all(active.map(({ page }) => page.evaluate(() => window.__adminSseCreated ?? 0)));
    const seconds = (ended - opened) / 1000;
    const eventPollQueriesPerConnection = Math.floor(seconds / 2);
    const sessionRechecksPerConnection = Math.floor(seconds / 10);
    report.scenarios.push({
      authenticatedOperatorSessions: target,
      activeSseConnectionsPerOperator: activeStreamCounts,
      totalStreamsCreatedPerOperator: totalStreamCounts,
      exactlyOnePerOperator: activeStreamCounts.every((count) => count === 1),
      openedAt: new Date(opened).toISOString(),
      measuredSeconds: Number(seconds.toFixed(2)),
      expectedD1Queries: {
        initialQueriesPerConnection: 4,
        eventPollQueriesPerConnection,
        sessionRechecksPerConnection,
        approximateTotal: target * (4 + eventPollQueriesPerConnection + sessionRechecksPerConnection),
        queryModel: "Code-derived: session lookup + initial event cursor + first session validation + replay query; then one event query per 2s poll and a session revalidation every 10s. D1 Insights/Worker traces are needed for rows-read and actual duration.",
      },
    });
    for (const operator of active) {
      await closeOperator(operator);
      activeOperators.splice(activeOperators.indexOf(operator), 1);
    }
  }
  report.cleanup = "PASS — all 9 synthetic admin sessions (1 + 3 + 5) logged out, verified unauthorized, and their SSE streams closed after revocation";
} finally {
  for (const operator of activeOperators) await operator.context.close();
  await browser.close();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
}

console.log(JSON.stringify(report, null, 2));
