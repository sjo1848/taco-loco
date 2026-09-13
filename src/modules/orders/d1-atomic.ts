import type { D1Database } from "@cloudflare/workers-types";

type D1Statement = ReturnType<D1Database["prepare"]>;

export type D1OrderLineWrite = {
  id: string;
  productId: string;
  productName: string;
  unitPriceAmount: number;
  quantity: number;
  modifiersSnapshot: unknown;
  note: string | null;
};

export type D1OrderWrite = {
  id: string;
  source: "WHATSAPP" | "PUBLIC_MENU";
  fulfillment: "PICKUP" | "DINE_IN";
  customerName: string | null;
  customerPhone: string | null;
  tableLabel: string | null;
  notes: string | null;
  subtotalAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  clientReference: string | null;
  createdById: string | null;
  reason: string;
  lines: D1OrderLineWrite[];
};

function assertBatchSucceeded(results: Array<{ success: boolean }>) {
  if (results.some((result) => !result.success)) throw new Error("D1_BATCH_FAILED");
}

/** D1 batch is the atomic unit; Prisma's D1 adapter cannot provide this guarantee. */
export async function createD1OrderWith(db: D1Database, input: D1OrderWrite) {
  const now = new Date().toISOString();
  const statements: D1Statement[] = [
    db.prepare(`INSERT INTO "Order" ("id", "orderNumber", "status", "fulfillment", "source", "customerName", "customerPhone", "tableLabel", "notes", "subtotalAmount", "adjustmentAmount", "totalAmount", "clientReference", "createdById", "createdAt", "updatedAt") SELECT ?, COALESCE(MAX("orderNumber"), 0) + 1, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM "Order"`).bind(input.id, input.fulfillment, input.source, input.customerName, input.customerPhone, input.tableLabel, input.notes, input.subtotalAmount, input.adjustmentAmount, input.totalAmount, input.clientReference, input.createdById, now, now),
    ...input.lines.map((line) => db.prepare(`INSERT INTO "OrderLine" ("id", "orderId", "productId", "productName", "unitPriceAmount", "quantity", "modifiersSnapshot", "note", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(line.id, input.id, line.productId, line.productName, line.unitPriceAmount, line.quantity, JSON.stringify(line.modifiersSnapshot), line.note, now)),
    db.prepare(`INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt", "actorId") SELECT ?, COALESCE(MAX("sequence"), 0) + 1, ?, NULL, 'RECEIVED', ?, ?, ? FROM "OrderEvent"`).bind(crypto.randomUUID(), input.id, input.reason, now, input.createdById),
  ];
  const results = await db.batch(statements);
  assertBatchSucceeded(results);
  return input.id;
}

export type D1TransitionWrite = {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  actorId: string;
  cancellationReason: string | null;
  confirmedAt: string | null;
  closedAt: string | null;
};

export async function transitionD1OrderWith(db: D1Database, input: D1TransitionWrite) {
  const now = new Date().toISOString();
  const update = db.prepare(`UPDATE "Order" SET "status" = ?, "confirmedAt" = COALESCE(?, "confirmedAt"), "closedAt" = COALESCE(?, "closedAt"), "cancellationReason" = COALESCE(?, "cancellationReason"), "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?`).bind(input.toStatus, input.confirmedAt, input.closedAt, input.cancellationReason, input.actorId, now, input.orderId, input.fromStatus);
  const event = db.prepare(`INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt", "actorId") SELECT ?, COALESCE(MAX("sequence"), 0) + 1, ?, ?, ?, ?, ?, ? FROM "OrderEvent" WHERE changes() = 1`).bind(crypto.randomUUID(), input.orderId, input.fromStatus, input.toStatus, input.reason, now, input.actorId);
  const results = await db.batch([update, event]);
  assertBatchSucceeded(results);
  const changed = Number(results[0]?.meta?.changes ?? 0);
  if (changed !== 1) throw new Error("D1_ORDER_CHANGED");
}
