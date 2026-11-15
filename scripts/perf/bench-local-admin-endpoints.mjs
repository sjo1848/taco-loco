#!/usr/bin/env node
/** Repeatable latency/payload sampler for a loopback Wrangler dev Worker only. */
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const base = new URL(args.get("base") ?? "http://127.0.0.1:8787");
if (!(["127.0.0.1", "localhost", "::1"].includes(base.hostname)) || base.protocol !== "http:") {
  throw new Error("Refusing non-loopback/non-HTTP target: this benchmark must only call local Wrangler");
}
const count = Number(args.get("count") ?? 41);
if (!Number.isInteger(count) || count < 11 || count > 501) throw new Error("count must be 11..501");
const cookie = "taco_loco_session=local-only-perf-session-not-a-secret";
const routes = [
  ["operations-counts", "/api/admin/orders/operations?queue=start&countsOnly=1"],
  ["operations-page", "/api/admin/orders/operations?queue=start"],
  ["attention-counts", "/api/admin/orders/attention?kind=all&countsOnly=1"],
  ["attention-today", "/api/admin/orders/attention?kind=all&bucket=today"],
  ["attention-previous", "/api/admin/orders/attention?kind=all&bucket=previous"],
  ["history-page", "/api/admin/orders/history"],
];
const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const report = [];
for (const [name, path] of routes) {
  const times = [];
  const statuses = {};
  let bytes = 0;
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    const response = await fetch(new URL(path, base), { headers: { cookie } });
    const body = await response.arrayBuffer();
    const elapsed = performance.now() - start;
    statuses[response.status] = (statuses[response.status] ?? 0) + 1;
    bytes = body.byteLength;
    if (i > 0) times.push(elapsed); // one warm-up excluded
  }
  times.sort((a, b) => a - b);
  report.push({
    route: name,
    samples: times.length,
    status: statuses,
    p50_wall_ms: +percentile(times, 0.5).toFixed(2),
    p95_wall_ms: +percentile(times, 0.95).toFixed(2),
    max_wall_ms: +times.at(-1).toFixed(2),
    response_bytes: bytes,
  });
}
console.log(JSON.stringify({ target: base.origin, runtime: "local Wrangler Worker + D1", report }, null, 2));
