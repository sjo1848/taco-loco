import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { applyD1WorkflowActionWith, createD1OrderWith, transitionD1OrderWith } from "./d1-atomic";

function fakeD1(options: { changes?: number; reject?: boolean } = {}) {
  const sql: string[] = [];
  const bindings: unknown[][] = [];
  const db = {
    prepare(query: string) {
      sql.push(query);
      return { bind: (...values: unknown[]) => { bindings.push(values); return {}; } };
    },
    async batch(statements: unknown[]) {
      if (options.reject) throw new Error("D1_ERROR: UNIQUE constraint failed");
      return statements.map((_statement, index) => ({ success: true, meta: { changes: index === 0 ? options.changes ?? 1 : 1 } }));
    },
  } as unknown as D1Database;
  return { db, sql, bindings };
}

const order = {
  id: "11111111-1111-4111-8111-111111111111",
  source: "PUBLIC_MENU" as const,
  fulfillment: "PICKUP" as const,
  customerName: null,
  customerPhone: null,
  tableLabel: null,
  notes: "test",
  subtotalAmount: 1200,
  adjustmentAmount: 0,
  totalAmount: 1200,
  clientReference: "client-reference-0001",
  createdById: null,
  reason: "test intent",
  lines: [{ id: "22222222-2222-4222-8222-222222222222", productId: "33333333-3333-4333-8333-333333333333", productName: "Taco", unitPriceAmount: 1200, quantity: 1, modifiersSnapshot: [{ group: "Salsa", option: "Roja" }], note: null }],
};

describe("D1 atomic order adapter", () => {
  it("groups order, line, and event writes in one D1 batch", async () => {
    const { db, sql, bindings } = fakeD1();
    await createD1OrderWith(db, order);
    expect(sql).toHaveLength(3);
    expect(sql[0]).toContain("COALESCE(MAX(\"orderNumber\"), 0) + 1");
    expect(sql[1]).toContain("modifiersSnapshot");
    expect(sql[2]).toContain("COALESCE(MAX(\"sequence\"), 0) + 1");
    expect((sql[0].match(/\?/g) ?? []).length).toBe(bindings[0]?.length);
  });

  it("accepts DELIVERY fulfillment through the D1 order writer", async () => {
    const { db, bindings } = fakeD1();
    await createD1OrderWith(db, { ...order, fulfillment: "DELIVERY", verificationStatus: "PENDING", paymentStatus: "PENDING", deliveryAddress: "Calle 1", deliveryFeeAmount: 900, transferHolderName: "Ana" });
    expect(bindings[0]?.slice(1, 9)).toEqual(["DELIVERY", "PENDING", "PENDING", "NOT_REQUIRED", "PUBLIC_MENU", null, null, null]);
    expect(bindings[0]?.[9]).toBe("test");
    expect(bindings[0]?.[10]).toBe("Calle 1");
    expect(bindings[0]?.[12]).toBe(900);
    expect(bindings[0]?.[13]).toBe("Ana");
  });

  it("does not convert a failed batch into a partial success", async () => {
    const { db } = fakeD1({ reject: true });
    await expect(createD1OrderWith(db, order)).rejects.toThrow("UNIQUE constraint failed");
  });

  it("rejects a conditional transition when the update changed no row", async () => {
    const { db } = fakeD1({ changes: 0 });
    await expect(transitionD1OrderWith(db, { orderId: order.id, fromStatus: "RECEIVED", toStatus: "CONFIRMED", reason: null, actorId: "44444444-4444-4444-8444-444444444444", cancellationReason: null, confirmedAt: new Date().toISOString(), closedAt: null })).rejects.toThrow("D1_ORDER_CHANGED");
  });

  it("keeps payment rejection available from pending or reported states", async () => {
    const { db, sql } = fakeD1();
    await applyD1WorkflowActionWith(db, { orderId: order.id, action: "REJECT_PAYMENT", actorId: "44444444-4444-4444-8444-444444444444", fromStatus: "RECEIVED", reason: "No impact" });
    expect(sql[0]).toContain('"paymentStatus" IN (\'PENDING\', \'REPORTED\')');
  });

  it("binds confirmed payment and verification for an atomic delivery transition", async () => {
    const { db, bindings } = fakeD1();
    await transitionD1OrderWith(db, { orderId: order.id, fromStatus: "RECEIVED", toStatus: "CONFIRMED", reason: "Pago verificado", actorId: "44444444-4444-4444-8444-444444444444", cancellationReason: null, confirmedAt: new Date().toISOString(), closedAt: null, verificationStatus: "VERIFIED", verificationResolvedAt: new Date().toISOString(), paymentStatus: "CONFIRMED", paymentConfirmedAt: new Date().toISOString() });
    expect(bindings[0]).toContain("CONFIRMED");
    expect(bindings[0]).toContain("VERIFIED");
  });

  it("guards delivery confirmation against a concurrent payment rejection", async () => {
    const { db, sql } = fakeD1();
    await transitionD1OrderWith(db, { orderId: order.id, fromStatus: "RECEIVED", toStatus: "CONFIRMED", reason: "Pago verificado", actorId: "44444444-4444-4444-8444-444444444444", cancellationReason: null, confirmedAt: new Date().toISOString(), closedAt: null, verificationStatus: "VERIFIED", verificationResolvedAt: new Date().toISOString(), paymentStatus: "CONFIRMED", paymentConfirmedAt: new Date().toISOString() });
    expect(sql[0]).toContain('"paymentStatus" IN (\'PENDING\', \'REPORTED\', \'CONFIRMED\')');
  });
});
