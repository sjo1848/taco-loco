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
  fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY";
  verificationStatus?: "PENDING" | "VERIFIED" | "EXPIRED" | "REJECTED";
  paymentStatus?: "NOT_REQUIRED" | "PENDING" | "REPORTED" | "CONFIRMED" | "REJECTED";
  refundStatus?: "NOT_REQUIRED" | "REQUIRED" | "REFUNDED";
  customerName: string | null;
  customerPhone: string | null;
  tableLabel: string | null;
  notes: string | null;
  deliveryAddress?: string | null;
  deliveryReference?: string | null;
  deliveryFeeAmount?: number;
  transferHolderName?: string | null;
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
  const verificationStatus = input.verificationStatus ?? "VERIFIED";
  const paymentStatus = input.paymentStatus ?? "NOT_REQUIRED";
  const refundStatus = input.refundStatus ?? "NOT_REQUIRED";
  const deliveryAddress = input.deliveryAddress ?? null;
  const deliveryReference = input.deliveryReference ?? null;
  const deliveryFeeAmount = input.deliveryFeeAmount ?? 0;
  const transferHolderName = input.transferHolderName ?? null;
  const statements: D1Statement[] = [
    db.prepare(`INSERT INTO "Order" ("id", "orderNumber", "status", "fulfillment", "verificationStatus", "paymentStatus", "refundStatus", "source", "customerName", "customerPhone", "tableLabel", "notes", "deliveryAddress", "deliveryReference", "deliveryFeeAmount", "transferHolderName", "subtotalAmount", "adjustmentAmount", "totalAmount", "clientReference", "createdById", "createdAt", "updatedAt") VALUES (?, (SELECT COALESCE(MAX("orderNumber"), 0) + 1 FROM "Order"), 'RECEIVED',
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`).bind(input.id, input.fulfillment, verificationStatus, paymentStatus, refundStatus, input.source, input.customerName, input.customerPhone, input.tableLabel, input.notes, deliveryAddress, deliveryReference, deliveryFeeAmount, transferHolderName, input.subtotalAmount, input.adjustmentAmount, input.totalAmount, input.clientReference, input.createdById, now, now),
    ...input.lines.map((line) => db.prepare(`INSERT INTO "OrderLine" ("id", "orderId", "productId", "productName", "unitPriceAmount", "quantity", "modifiersSnapshot", "note", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(line.id, input.id, line.productId, line.productName, line.unitPriceAmount, line.quantity, JSON.stringify(line.modifiersSnapshot), line.note, now)),
    db.prepare(`INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt", "actorId") VALUES (?, (SELECT COALESCE(MAX("sequence"), 0) + 1 FROM "OrderEvent"), ?, NULL, 'RECEIVED', ?, ?, ?)`).bind(crypto.randomUUID(), input.id, input.reason, now, input.createdById),
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
  verificationStatus?: string | null;
  verificationResolvedAt?: string | null;
  paymentStatus?: string | null;
  paymentConfirmedAt?: string | null;
};

export async function transitionD1OrderWith(db: D1Database, input: D1TransitionWrite) {
  const now = new Date().toISOString();
  const paymentGuard = input.paymentStatus === "CONFIRMED" ? ` AND "paymentStatus" IN ('PENDING', 'REPORTED', 'CONFIRMED')` : "";
  const update = db.prepare(`UPDATE "Order" SET "status" = ?, "verificationStatus" = COALESCE(?, "verificationStatus"), "verificationResolvedAt" = COALESCE(?, "verificationResolvedAt"), "paymentStatus" = COALESCE(?, "paymentStatus"), "paymentConfirmedAt" = COALESCE(?, "paymentConfirmedAt"), "confirmedAt" = COALESCE(?, "confirmedAt"), "closedAt" = COALESCE(?, "closedAt"), "cancellationReason" = COALESCE(?, "cancellationReason"), "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ?${paymentGuard}`).bind(input.toStatus, input.verificationStatus, input.verificationResolvedAt, input.paymentStatus, input.paymentConfirmedAt, input.confirmedAt, input.closedAt, input.cancellationReason, input.actorId, now, input.orderId, input.fromStatus);
  const event = db.prepare(`INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt", "actorId") SELECT ?, "nextSequence", ?, ?, ?, ?, ?, ? FROM (SELECT COALESCE(MAX("sequence"), 0) + 1 AS "nextSequence" FROM "OrderEvent") WHERE changes() = 1`).bind(crypto.randomUUID(), input.orderId, input.fromStatus, input.toStatus, input.reason, now, input.actorId);
  const results = await db.batch([update, event]);
  assertBatchSucceeded(results);
  const changed = Number(results[0]?.meta?.changes ?? 0);
  if (changed !== 1) throw new Error("D1_ORDER_CHANGED");
}

export type D1WorkflowAction = { orderId: string; action: "EXPIRE_PENDING" | "MARK_NO_SHOW" | "REPORT_PAYMENT" | "REJECT_PAYMENT" | "REQUIRE_REFUND" | "MARK_REFUNDED"; actorId: string; fromStatus: string; verificationStatus?: string; refundStatus?: string; noShowAt?: string; closedAt?: string; reason: string };

export async function applyD1WorkflowActionWith(db: D1Database, input: D1WorkflowAction) {
  const now = new Date().toISOString();
  const isExpiry = input.action === "EXPIRE_PENDING";
  const isNoShow = input.action === "MARK_NO_SHOW";
  const isPaymentReport = input.action === "REPORT_PAYMENT" || input.action === "REJECT_PAYMENT";
  const isRefundRequired = input.action === "REQUIRE_REFUND";
  const update = isExpiry
    ? db.prepare(`UPDATE "Order" SET "status" = 'CANCELLED', "verificationStatus" = 'EXPIRED', "verificationResolvedAt" = ?, "closedAt" = ?, "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ? AND "verificationStatus" = 'PENDING'`).bind(now, now, input.actorId, now, input.orderId, input.fromStatus)
    : isNoShow
      ? db.prepare(`UPDATE "Order" SET "noShowAt" = ?, "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "fulfillment" = 'PICKUP' AND "status" = ? AND "noShowAt" IS NULL`).bind(now, input.actorId, now, input.orderId, input.fromStatus)
      : isPaymentReport
        ? db.prepare(`UPDATE "Order" SET "paymentStatus" = ?, "paymentReportedAt" = ?, "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ? AND ${input.action === "REPORT_PAYMENT" ? '"paymentStatus" = \'PENDING\'' : '"paymentStatus" IN (\'PENDING\', \'REPORTED\')'}`).bind(input.action === "REPORT_PAYMENT" ? "REPORTED" : "REJECTED", now, input.actorId, now, input.orderId, input.fromStatus)
        : db.prepare(`UPDATE "Order" SET "refundStatus" = ?, "refundRequiredAt" = COALESCE("refundRequiredAt", ?), "refundedAt" = CASE WHEN ? = 'REFUNDED' THEN ? ELSE "refundedAt" END, "updatedById" = ?, "updatedAt" = ? WHERE "id" = ? AND "status" = ? AND "refundStatus" = ?`).bind(input.refundStatus, now, input.refundStatus, now, input.actorId, now, input.orderId, input.fromStatus, isRefundRequired ? "NOT_REQUIRED" : "REQUIRED");
  const event = db.prepare(`INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt", "actorId") SELECT ?, COALESCE(MAX("sequence"), 0) + 1, ?, ?, ?, ?, ?, ? FROM "OrderEvent" WHERE changes() = 1`).bind(crypto.randomUUID(), input.orderId, input.fromStatus, isExpiry ? "CANCELLED" : input.fromStatus, input.reason, now, input.actorId);
  const results = await db.batch([update, event]);
  assertBatchSucceeded(results);
  if (Number(results[0]?.meta?.changes ?? 0) !== 1) throw new Error("D1_WORKFLOW_ACTION_REJECTED");
}
