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
  cleanup: [],
};
let runError = null;

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
    const loginResponse = await context.request.post(`${baseUrl}/api/auth/login`, {
      headers: { origin: baseUrl },
      data: { email, password },
    });
    if (!loginResponse.ok()) throw new Error(`Admin login API returned HTTP ${loginResponse.status()}.`);
    const session = await context.request.get(`${baseUrl}/api/auth/session`);
    if (!session.ok()) throw new Error(`Authenticated admin session returned HTTP ${session.status()}.`);
    const page = await context.newPage();
    const boardResponse = await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    if (!boardResponse?.ok()) throw new Error(`Admin orders page returned HTTP ${boardResponse?.status() ?? "no response"}.`);
    await page.locator(".connection--live").waitFor({ state: "visible", timeout: 20_000 });
    return { context, page };
  } catch (error) {
    const cleanup = { stage: "login-failure", logoutStatus: null, sessionStatus: null, streamClosed: true, contextClosed: false };
    try {
      const logout = await context.request.post(`${baseUrl}/api/auth/logout`, { headers: { origin: baseUrl } });
      cleanup.logoutStatus = logout.status();
      const session = await context.request.get(`${baseUrl}/api/auth/session`);
      cleanup.sessionStatus = session.status();
    } catch {
      // Record the incomplete cleanup below without copying request data into evidence.
    }
    report.cleanup.push(cleanup);
    await context.close();
    cleanup.contextClosed = true;
    throw error;
  }
}

async function revokeAndClose(operator, stage) {
  const result = { stage, logoutStatus: null, sessionStatus: null, streamClosed: false, contextClosed: false };
  let failure = null;
  try {
    const response = await operator.context.request.post(`${baseUrl}/api/auth/logout`, { headers: { origin: baseUrl } });
    result.logoutStatus = response.status();
    if (!response.ok()) throw new Error(`Admin logout failed with HTTP ${response.status()}.`);
    const session = await operator.context.request.get(`${baseUrl}/api/auth/session`);
    result.sessionStatus = session.status();
    if (session.status() !== 401) throw new Error(`Admin session was not revoked (${session.status()}).`);
    await operator.page.locator(".connection--expired").waitFor({ state: "visible", timeout: 12_000 });
    const active = await operator.page.evaluate(() => window.__adminSseActive ?? 0);
    result.streamClosed = active === 0;
    if (!result.streamClosed) throw new Error(`SSE remained active after session revocation (${active}).`);
  } catch (error) {
    failure = error;
  } finally {
    await operator.context.close().catch(() => {});
    result.contextClosed = true;
    report.cleanup.push(result);
  }
  if (failure) throw failure;
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
    const scenario = {
      authenticatedOperatorSessions: target,
      activeSseConnectionsPerOperator: activeStreamCounts,
      totalStreamsCreatedPerOperator: totalStreamCounts,
      exactlyOneActiveStreamPerOperator: activeStreamCounts.every((count) => count === 1),
      exactlyOneStreamCreatedPerOperator: totalStreamCounts.every((count) => count === 1),
      openedAt: new Date(opened).toISOString(),
      measuredSeconds: Number(seconds.toFixed(2)),
      expectedD1Queries: {
        initialQueriesPerConnection: 4,
        eventPollQueriesPerConnection,
        sessionRechecksPerConnection,
        approximateTotal: target * (4 + eventPollQueriesPerConnection + sessionRechecksPerConnection),
        queryModel: "Code-derived SSE workload estimate: session lookup, event cursor, initial session validation and replay query; then one event query per 2s poll and session revalidation every 10s. Excludes page/API reads during login and initial screen load. D1 Insights/Worker traces are needed for actual row reads and timings.",
      },
    };
    report.scenarios.push(scenario);
    for (const operator of active) {
      try {
        await revokeAndClose(operator, target);
      } finally {
        activeOperators.splice(activeOperators.indexOf(operator), 1);
      }
    }
    if (!scenario.exactlyOneActiveStreamPerOperator || !scenario.exactlyOneStreamCreatedPerOperator) {
      throw new Error(`Scenario ${target} did not retain exactly one SSE stream per operator.`);
    }
  }
} catch (error) {
  runError = error;
  report.failure = error instanceof Error ? error.message : "SSE load probe failed.";
} finally {
  for (const operator of [...activeOperators]) {
    try {
      await revokeAndClose(operator, "cleanup-after-failure");
    } catch (error) {
      report.cleanupFailure = error instanceof Error ? error.message : "Unable to verify admin session cleanup.";
    } finally {
      activeOperators.splice(activeOperators.indexOf(operator), 1);
    }
  }
  const cleanupPass = report.cleanup.every((entry) => entry.logoutStatus === 200 && entry.sessionStatus === 401 && entry.streamClosed && entry.contextClosed);
  report.cleanupResult = cleanupPass ? "PASS" : "FAIL — at least one opened synthetic session or stream could not be verified as revoked/closed";
  await browser.close();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
}

console.log(JSON.stringify(report, null, 2));
if (runError) process.exitCode = 1;
