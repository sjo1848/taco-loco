import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const root = mkdtempSync(join(tmpdir(), "tl-admin-attention-d1-"));
const configPath = join(root, "wrangler.jsonc");
const persistPath = join(root, "persist");
const wrangler = resolve("node_modules/.bin/wrangler");
const dayParts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
const businessDate = `${dayParts.find((part) => part.type === "year").value}-${dayParts.find((part) => part.type === "month").value}-${dayParts.find((part) => part.type === "day").value}`;
const businessDayStartDate = new Date(`${businessDate}T00:00:00-03:00`);
const businessDayStart = businessDayStartDate.toISOString();
const nextBusinessDayStart = new Date(businessDayStartDate.getTime() + 86_400_000).toISOString();

function runD1(args) {
  const output = execFileSync(wrangler, ["d1", "execute", "DB", "--config", configPath, "--local", "--persist-to", persistPath, ...args, "--json"], { encoding: "utf8" });
  const jsonStart = output.indexOf("[\n");
  if (jsonStart < 0) throw new Error(`Wrangler did not return JSON: ${output}`);
  return JSON.parse(output.slice(jsonStart));
}

function runSql(sql) {
  return runD1(["--command", sql])[0].results;
}

function escapeSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

try {
  writeFileSync(configPath, JSON.stringify({
    name: "tl-admin-attention-isolated-test",
    compatibility_date: "2026-11-14",
    d1_databases: [{ binding: "DB", database_name: "taco-loco-admin-attention-isolated", database_id: randomUUID() }],
  }, null, 2));

  runD1(["--command", `CREATE TABLE "Order" (id TEXT PRIMARY KEY, orderNumber INTEGER NOT NULL, status TEXT NOT NULL, fulfillment TEXT NOT NULL, verificationStatus TEXT NOT NULL, paymentStatus TEXT NOT NULL, refundStatus TEXT NOT NULL, customerName TEXT, totalAmount INTEGER NOT NULL, createdAt TEXT NOT NULL); CREATE INDEX idx_order_created_id ON "Order" (createdAt,id);`]);

  const rows = [];
  const base = businessDayStartDate.getTime() - 12 * 60 * 60 * 1000;
  for (let index = 0; index < 140; index++) {
    const createdAt = new Date(base - index * 37 * 60_000).toISOString();
    rows.push([`historic-${String(index).padStart(3, "0")}`, 9000 + index, "RECEIVED", "PICKUP", "PENDING", "PENDING", "NOT_REQUIRED", `Sintético ${index}`, 1000, createdAt]);
  }
  rows.push(["current-new-999", 9999, "RECEIVED", "PICKUP", "PENDING", "PENDING", "NOT_REQUIRED", "Pedido sintético nuevo", 2500, new Date(businessDayStartDate.getTime() + 10 * 60 * 60 * 1000).toISOString()]);
  const insertSql = rows.map((row) => `INSERT INTO "Order" VALUES (${row.map(escapeSql).join(",")});`).join("\n");
  const insertPath = join(root, "seed.sql");
  writeFileSync(insertPath, insertSql);
  runD1(["--file", insertPath]);

  const attentionWhere = "(verificationStatus='PENDING' OR status='RECEIVED' OR refundStatus='REQUIRED' OR paymentStatus='REJECTED')";
  const today = runSql(`SELECT orderNumber,createdAt FROM "Order" WHERE ${attentionWhere} AND createdAt >= '${businessDayStart}' AND createdAt < '${nextBusinessDayStart}' ORDER BY createdAt DESC,id DESC LIMIT 31`);
  const oldCount = runSql(`SELECT COUNT(*) AS count FROM "Order" WHERE ${attentionWhere} AND createdAt < '${businessDayStart}'`)[0].count;
  if (today.length !== 1 || today[0].orderNumber !== 9999) throw new Error("Current-day new order was not isolated in the priority page.");
  if (oldCount !== 140) throw new Error(`Expected 140 independently counted older orders, got ${oldCount}.`);

  const recovered = [];
  let cursor = null;
  do {
    const cursorWhere = cursor ? ` AND (createdAt < '${cursor.createdAt}' OR (createdAt='${cursor.createdAt}' AND id < '${cursor.id}'))` : "";
    const page = runSql(`SELECT id,createdAt FROM "Order" WHERE ${attentionWhere} AND createdAt < '${businessDayStart}'${cursorWhere} ORDER BY createdAt DESC,id DESC LIMIT 31`);
    const visible = page.slice(0, 30);
    recovered.push(...visible.map((item) => item.id));
    cursor = page.length > 30 ? visible.at(-1) : null;
  } while (cursor);

  if (recovered.length !== 140 || new Set(recovered).size !== 140) throw new Error(`Keyset pagination lost or duplicated older orders (${recovered.length} rows, ${new Set(recovered).size} unique).`);
  if (!recovered.includes("historic-000")) throw new Error("The oldest prior pending order was not reachable.");

  console.log(JSON.stringify({
    result: "PASS",
    database: "isolated Wrangler local D1/SQLite",
    historicPendingOrders: oldCount,
    currentDayNewOrder: today[0].orderNumber,
    independentHistoricalPages: Math.ceil(recovered.length / 30),
    historicalRowsRecovered: recovered.length,
    duplicateOrMissingRows: false,
    remoteResourcesTouched: false,
  }, null, 2));
} finally {
  rmSync(root, { recursive: true, force: true });
}
