import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const target = new URL(process.env.TACO_QA_LOCAL_URL ?? "");
assert.equal(target.hostname, "127.0.0.1", "This suite requires isolated local Workerd and D1");
const base = target.origin;
const codes = [80, 81, 82, 83];
const tokens = Object.fromEntries(codes.map((code, i) => [code, "rstu"[i].repeat(43)]));
const endpoint = (code) => "/api/orders/tracking/" + tokens[code];
const codeLabel = (code) => "TL-" + String(code).padStart(4, "0");
const browser = await chromium.launch();
const report = [];
const screenshots = process.env.TACO_QA_GUEST_TRACKING_OUTPUT;
if (screenshots) await mkdir(screenshots, { recursive: true });

const active = (page) => page.getByRole("region", { name: "En curso", exact: true });
const past = (page) => page.getByRole("region", { name: "Historial", exact: true });
const unavailable = (page) => page.getByRole("region", { name: "Estado temporalmente no disponible", exact: true });
const retry = (page) => page.getByRole("button", { name: "Reintentar", exact: true });
const card = (region, code) => region.getByRole("heading", { name: codeLabel(code), exact: true });
const looseLinks = (page) => page.locator('a[href^="/pedido/"]');

function gate() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

async function complete(page) {
  for (const code of codes) await card(code < 82 ? active(page) : past(page), code).waitFor();
  assert.equal(await unavailable(page).count(), 0);
  assert.equal(await retry(page).count(), 0);
  assert.equal(await looseLinks(page).count(), 4);
}

async function noFalseEmpty(page) {
  for (const name of ["No tenés pedidos en curso.", "Todavía no hay pedidos finalizados."]) {
    assert.equal(await page.getByText(name, { exact: true }).count(), 0);
  }
  assert.equal(await page.getByRole("link", { name: "Ver menú", exact: true }).count(), 0);
}

async function caseAt(width, name, scenario) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const writes = [];
  const counts = new Map();
  const times = new Map();
  let responses = {};
  await context.addInitScript(({ stored }) => {
    sessionStorage.setItem("taco-loco-guest-orders", JSON.stringify(
      stored.map((row) => ({ ...row, createdAt: Date.now() })),
    ));
    const nativeFetch = window.fetch.bind(window);
    const signals = new WeakMap();
    let nextSignal = 0;
    window.qaTrackingRequests = [];
    window.fetch = (url, options) => {
      if (typeof url === "string" && url.startsWith("/api/orders/tracking/")) {
        if (!signals.has(options.signal)) signals.set(options.signal, ++nextSignal);
        window.qaTrackingRequests.push([options.cache, options.referrerPolicy, signals.get(options.signal)]);
      }
      return nativeFetch(url, options);
    };
  }, { stored: [
    ...codes.map((orderNumber) => ({ orderNumber, path: "/pedido/" + tokens[orderNumber] })),
    { orderNumber: 9, path: "/pedido/" + "v".repeat(43), ownerId: "qa-other" },
  ] });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base) return route.abort();
    if (!["GET", "HEAD"].includes(request.method())) {
      writes.push(url.pathname);
      return route.abort();
    }
    if (url.pathname === "/api/orders/tracking/" + "v".repeat(43)) {
      throw new Error("Other account's reference was queried");
    }
    const code = codes.find((n) => url.pathname === endpoint(n));
    if (!code) return route.continue();
    assert.equal(request.method(), "GET");
    assert.equal(request.headers().referer, undefined);
    const tries = (counts.get(code) ?? 0) + 1;
    counts.set(code, tries);
    times.set(code, [...(times.get(code) ?? []), Date.now()]);
    const action = responses[code]?.[tries - 1];
    if (typeof action === "function") return action(route);
    if (action === "network") return route.abort("failed");
    if (action === "invalid") return route.fulfill({ status: 200, json: { currentStage: "READY" } });
    if (action) return route.fulfill({ status: action });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const start = async (actions) => {
    responses = actions;
    assert.equal((await page.goto(base + "/pedidos"))?.status(), 200);
  };
  try {
    await scenario({ page, context, start, counts, times, change: (actions) => { responses = actions; } });
    assert.deepEqual(writes, []);
    const settings = await page.evaluate(() => window.qaTrackingRequests);
    assert(settings.every(([cache, policy, signal]) => cache === "no-store" && policy === "no-referrer" && Number.isInteger(signal)));
    report.push({ width, name, status: "PASS", counts: Object.fromEntries(counts) });
    console.log(`PASS ${width}px ${name}`);
  } finally {
    await context.close();
  }
}

async function headerContract() {
  const context = await browser.newContext();
  try {
    const tracking = await context.request.get(base + endpoint(80));
    assert.equal(tracking.status(), 200);
    const body = await tracking.json();
    const poll = await context.request.get(base + endpoint(80) + "?after=" + body.version);
    assert.equal(poll.status(), 204);
    const missing = await context.request.get(base + "/api/orders/tracking/" + "x".repeat(43));
    assert.equal(missing.status(), 404);
    for (const response of [tracking, poll, missing]) {
      assert.equal(response.headers()["referrer-policy"], "no-referrer");
      assert.match(response.headers()["cache-control"], /no-store/);
      assert.match(response.headers()["x-robots-tag"], /noindex/);
    }
    console.log("PASS real tracking HTTP 200/204/404 and privacy headers");
  } finally { await context.close(); }
}

async function announce(page) {
  await page.evaluate(() => {
    localStorage.setItem("taco-loco-customer-session-generation", crypto.randomUUID());
    const channel = new BroadcastChannel("taco-loco-customer-session");
    channel.postMessage("changed");
    channel.close();
  });
}

try {
  await headerContract();
  for (const width of [390, 1440]) {
    for (const failure of [500, "network"]) {
      await caseAt(width, `${failure} failure recovers once`, async ({ page, start, counts, times }) => {
        await start({ 80: [failure] });
        await complete(page);
        assert.deepEqual(codes.map((code) => counts.get(code)), [2, 1, 1, 1]);
        assert(times.get(80)[1] - times.get(80)[0] >= 480);
        const signals = await page.evaluate(() => window.qaTrackingRequests.map((row) => row[2]));
        assert.equal(new Set(signals).size, 1);
      });
    }

    await caseAt(width, "persistent 5xx preserves successful buckets and manual retry recovers", async ({ page, start, counts }) => {
      const recovery = gate();
      await start({ 80: [500, 500, async (route) => { await recovery.promise; return route.continue(); }] });
      await card(unavailable(page), 80).waitFor();
      await card(active(page), 81).waitFor();
      for (const code of [82, 83]) await card(past(page), code).waitFor();
      assert.equal(await unavailable(page).getByRole("link", { name: "Ver seguimiento", exact: true }).getAttribute("href"), "/pedido/" + tokens[80]);
      await unavailable(page).getByText("No pudimos consultar el estado de este pedido.", { exact: true }).waitFor();
      assert.equal(await page.getByText(/Algunos estados no se pudieron consultar/).count(), 0);
      assert.equal(await retry(page).count(), 1);
      await page.waitForTimeout(625);
      assert.deepEqual(codes.map((code) => counts.get(code)), [2, 1, 1, 1]);
      if (screenshots) await page.screenshot({ path: join(screenshots, `${width}-estado-temporal.png`), fullPage: true });
      await retry(page).click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent === "Reintentar" && button.disabled));
      assert.equal(await card(active(page), 81).count(), 1);
      recovery.release();
      await complete(page);
      assert.equal(await card(active(page), 80).count(), 1);
      assert.equal(counts.get(80), 3);
    });

    await caseAt(width, "all 5xx has no false empty and no third immediate request", async ({ page, start, counts }) => {
      await start(Object.fromEntries(codes.map((code) => [code, [503, 500]])));
      await unavailable(page).getByRole("article").last().waitFor();
      assert.equal(await unavailable(page).getByRole("article").count(), 4);
      assert.equal(await page.getByText("No pudimos comprobar todos tus pedidos.", { exact: true }).count(), 2);
      await noFalseEmpty(page);
      await page.waitForTimeout(625);
      assert.deepEqual(codes.map((code) => counts.get(code)), [2, 2, 2, 2]);
    });

    await caseAt(width, "4xx statuses do not retry and unauthorized references stay hidden", async ({ page, start, counts }) => {
      await start({ 80: [404], 81: [401], 82: [403], 83: [429] });
      await card(unavailable(page), 83).waitFor();
      await noFalseEmpty(page);
      for (const code of [80, 81, 82]) {
        assert.equal(await page.getByText(codeLabel(code), { exact: true }).count(), 0);
        assert.equal(await page.locator(`a[href="/pedido/${tokens[code]}"]`).count(), 0);
      }
      await page.waitForTimeout(625);
      assert.deepEqual(codes.map((code) => counts.get(code)), [1, 1, 1, 1]);
    });

    await caseAt(width, "403-only generic warning and invalid payload on next focus", async ({ page, start, counts, change }) => {
      await start({ 80: [403], 81: [404], 82: [404], 83: [404] });
      await page.getByText(/Algunos estados no se pudieron consultar/).waitFor();
      assert.equal(await looseLinks(page).count(), 0);
      assert.equal(await unavailable(page).count(), 0);
      await noFalseEmpty(page);
      assert.deepEqual(codes.map((code) => counts.get(code)), [1, 1, 1, 1]);
      change({ 80: [403, "invalid"] });
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await card(unavailable(page), 80).waitFor();
      await page.waitForTimeout(625);
      assert.equal(counts.get(80), 2);
      await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
      await complete(page);
      assert.deepEqual(codes.map((code) => counts.get(code)), [3, 3, 3, 3]);
    });

    await caseAt(width, "abort cancels retry delay on session notification", async ({ page, start, counts }) => {
      const firstRequest = gate();
      const releaseError = gate();
      const retryArmed = gate();
      await page.clock.install();
      await page.exposeFunction("observedRetryTimer", () => retryArmed.release());
      await start({ 80: [async (route) => {
        firstRequest.release();
        await releaseError.promise;
        return route.fulfill({ status: 500 });
      }] });
      await firstRequest.promise;
      // Freeze before releasing the 500, then observe the timer before changing session.
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 2000));
      await page.evaluate(() => {
        const schedule = window.setTimeout.bind(window);
        window.setTimeout = (callback, ms, ...args) => {
          const id = schedule(callback, ms, ...args);
          if (ms === 500) void window.observedRetryTimer();
          return id;
        };
      });
      releaseError.release();
      await retryArmed.promise;
      await announce(page);
      await active(page).getByText("No tenés pedidos en curso.", { exact: true }).waitFor();
      await page.clock.runFor(650);
      assert.equal(counts.get(80), 1);
      assert.equal(await looseLinks(page).count(), 0);
    });

    await caseAt(width, "account change and logout discard temporary and late guest results", async ({ page, context, start, counts, change }) => {
      const delayed = gate();
      const captured = gate();
      await start({ 80: [503, 503] });
      await card(unavailable(page), 80).waitFor();
      change({ 80: [503, 503, async (route) => {
        const response = await route.fetch();
        captured.release();
        await delayed.promise;
        await route.fulfill({ response }).catch(() => {});
      }] });
      await retry(page).click();
      await captured.promise;
      await context.addCookies([{ name: "taco_loco_customer_session", value: "c".repeat(64), url: base, httpOnly: true }]);
      await announce(page);
      await unavailable(page).waitFor({ state: "hidden" });
      await card(active(page), 9).waitFor();
      delayed.release();
      await page.waitForTimeout(100);
      assert.equal(await looseLinks(page).count(), 0);
      assert.equal(await page.getByText("TL-0080", { exact: true }).count(), 0);
      const logout = await context.request.post(base + "/api/customer/auth/logout", { headers: { origin: base } });
      assert.equal(logout.status(), 200);
      await announce(page);
      await active(page).getByText("No tenés pedidos en curso.", { exact: true }).waitFor();
      assert.equal(await looseLinks(page).count(), 0);
      assert.equal(counts.get(80), 3);
    });
  }
  if (screenshots) await writeFile(join(screenshots, "report.json"), JSON.stringify(report, null, 2));
} finally { await browser.close(); }
