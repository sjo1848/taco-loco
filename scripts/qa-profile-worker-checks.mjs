// Exercise the built Worker directly. Wrangler dev's local proxy can cancel
// rejected cross-origin PATCH requests before they reach the Worker.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import wrangler from "wrangler";
const { unstable_splitSqlQuery: splitSqlQuery, unstable_getMiniflareWorkerOptions } = wrangler;

const app = process.cwd();
const moduleRoot = path.join(app, "dist/server");
const config = path.join(moduleRoot, "wrangler.json");
const pnpm = path.join(app, "node_modules/.pnpm");
const dependency = readdirSync(pnpm).find((name) => name.startsWith("miniflare@"));
assert(dependency, "Wrangler's pinned Miniflare is unavailable");
const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(path.join(pnpm, dependency, "node_modules/miniflare/dist/src/index.js")));
const { workerOptions, externalWorkers } = unstable_getMiniflareWorkerOptions(config);
delete workerOptions.modulesRules;
const modules = readdirSync(moduleRoot, { recursive: true }).filter((file) => /\.(js|wasm)$/.test(file)).map((file) => ({
  type: file.endsWith(".wasm") ? "CompiledWasm" : "ESModule", path: file, contents: readFileSync(path.join(moduleRoot, file)),
}));
modules.sort((a, b) => a.path === "index.js" ? -1 : b.path === "index.js" ? 1 : 0);

const worker = new Miniflare(convertV4MiniflareOptions({ workers: [{ ...workerOptions, modules }, ...externalWorkers] }));
try {
  await worker.ready;
  const db = await worker.getD1Database("DB", workerOptions.name);
  for (const name of readdirSync("d1/migrations").filter((file) => file.endsWith(".sql")).sort()) {
    for (const sql of splitSqlQuery(readFileSync(path.join("d1/migrations", name), "utf8"))) {
      if (sql.trim()) await db.prepare(sql).run();
    }
  }
  const token = "b".repeat(64);
  const hash = createHash("sha256").update(token).digest("hex");
  await db.prepare("INSERT INTO Customer (id,email,displayName,active,createdAt,updatedAt) VALUES ('customer-a','a@example.test','Inicial',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
  await db.prepare("INSERT INTO CustomerSession (id,tokenHash,customerId,expiresAt,createdAt) VALUES ('session-a',?,'customer-a','2099-01-01T00:00:00Z',CURRENT_TIMESTAMP)").bind(hash).run();
  const endpoint = "http://worker/api/customer/profile";
  for (const [name, origin, authenticated, data, expected, viewer] of [
    ["cross origin", "https://example.invalid", true, { displayName: "CSRF" }, 403],
    ["missing origin", null, true, { displayName: "CSRF" }, 403],
    ["malformed origin", "http://worker/path", true, { displayName: "CSRF" }, 403],
    ["visitor", "http://worker", false, { displayName: "Invitado" }, 401],
    ["blank name", "http://worker", true, { displayName: " " }, 400],
    ["long Unicode name", "http://worker", true, { displayName: "🌮".repeat(161) }, 400],
    ["extra fields", "http://worker", true, { displayName: "Válido", email: "denied@example.test" }, 400],
    ["different viewer", "http://worker", true, { displayName: "Cuenta ajena" }, 409, "customer-b"],
    ["valid Unicode name", "http://worker", true, { displayName: "  María Ñandú 🌮  " }, 200, "customer-a"],
  ]) {
    const headers = { "content-type": "application/json" };
    if (origin) headers.origin = origin;
    if (authenticated) headers.cookie = "taco_loco_customer_session=" + token;
    if (viewer) headers["x-customer-viewer"] = viewer;
    const response = await worker.dispatchFetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(data) });
    assert.equal(response.status, expected, name);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/i, name);
    await response.arrayBuffer();
  }
  const owner = await db.prepare("SELECT displayName FROM Customer WHERE id = 'customer-a'").first();
  assert.equal(owner?.displayName, "María Ñandú 🌮");
  console.log("PASS direct Workerd + D1: 9 origin, session, ownership and validation checks; verified persisted Unicode name.");
} finally {
  await worker.dispose();
}
