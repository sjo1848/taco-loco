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
const operators = [];
const report = {
  baseUrl,
  measurement: "independent authenticated admin sessions against existing staging; no order mutations",
  durationPerScenarioMs: durationMs,
  scenarios: [],
};

try {
  for (let index = 0; index < 5; index++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      window.__adminSseCreated = 0;
      window.EventSource = new Proxy(window.EventSource, { construct(target, args) { window.__adminSseCreated += 1; return Reflect.construct(target, args); } });
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(email);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await page.waitForURL(/\/admin\/orders(?:\?|$)/);
    operators.push({ context, page, sseBaseline: 0 });
  }

  for (const target of [1, 3, 5]) {
    const active = operators.slice(0, target);
    for (const operator of active) {
      operator.sseBaseline = await operator.page.evaluate(() => window.__adminSseCreated ?? 0);
      await operator.page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded" });
    }
    await Promise.all(active.map(({ page }) => page.locator(".connection--live").waitFor({ state: "visible", timeout: 20_000 })));
    const opened = Date.now();
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    const ended = Date.now();
    const connectionCounts = await Promise.all(active.map(({ page, sseBaseline }) => page.evaluate((baseline) => (window.__adminSseCreated ?? 0) - baseline, sseBaseline)));
    const seconds = (ended - opened) / 1000;
    const eventPollQueriesPerConnection = Math.floor(seconds / 2);
    const sessionRechecksPerConnection = Math.floor(seconds / 10);
    report.scenarios.push({
      authenticatedOperatorSessions: target,
      sseConnectionsCreatedInScenario: connectionCounts,
      exactlyOnePerOperator: connectionCounts.every((count) => count === 1),
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
  }

  for (const operator of operators) {
    await operator.page.goto(`${baseUrl}/admin/more`, { waitUntil: "domcontentloaded" });
    await operator.page.getByRole("heading", { name: "Más" }).waitFor({ state: "visible", timeout: 10_000 });
    const response = await operator.context.request.post(`${baseUrl}/api/auth/logout`);
    if (!response.ok()) throw new Error(`Admin logout failed with HTTP ${response.status()}.`);
    const session = await operator.context.request.get(`${baseUrl}/api/auth/session`);
    if (session.status() !== 401) throw new Error(`Admin session was not revoked (${session.status()}).`);
  }
  report.cleanup = "PASS — all five synthetic admin sessions logged out and were verified unauthorized; all SSE pages navigated away before logout";
} finally {
  for (const operator of operators) await operator.context.close();
  await browser.close();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
}

console.log(JSON.stringify(report, null, 2));
