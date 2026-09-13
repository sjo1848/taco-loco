import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" },
});

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname !== "/rollback") return json({ code: "NOT_FOUND" }, 404);

    const suffix = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const lineId = crypto.randomUUID();
    const clientReference = `d1-batch-rollback-${suffix}`;
    const nextOrder = await env.DB.prepare('SELECT COALESCE(MAX("orderNumber"), 0) + 1 AS next FROM "Order"').first<{ next: number }>();
    const batch = [
      env.DB.prepare('INSERT INTO "Order" ("id", "orderNumber", "status", "fulfillment", "source", "subtotalAmount", "adjustmentAmount", "totalAmount", "clientReference", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(orderId, nextOrder?.next ?? 1, "RECEIVED", "PICKUP", "PUBLIC_MENU", 1, 0, 1, clientReference, new Date().toISOString(), new Date().toISOString()),
      env.DB.prepare('INSERT INTO "OrderLine" ("id", "orderId", "productId", "productName", "unitPriceAmount", "quantity") VALUES (?, ?, ?, ?, ?, ?)').bind(lineId, orderId, "deadbeef-dead-4eef-8eef-deadbeefdead", "invalid", 1, 1),
    ];

    let error = "";
    try {
      await env.DB.batch(batch);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    const remaining = await env.DB.prepare('SELECT COUNT(*) AS count FROM "Order" WHERE "id" = ?').bind(orderId).first<{ count: number }>();
    return json({ batch: "DB.batch", failed: Boolean(error), error, remaining: remaining?.count ?? -1 });
  },
};
