import { describe, expect, it } from "vitest";
import { encodeCustomerOrderCursor, parseCustomerOrderCursor } from "./customer-orders";
import { toCustomerOrderSummary } from "./public-tracking";

const order = {
  orderNumber: 27,
  fulfillment: "DELIVERY" as const,
  status: "CONFIRMED",
  verificationStatus: "VERIFIED",
  paymentStatus: "CONFIRMED",
  refundStatus: "NOT_REQUIRED",
  publicTrackingToken: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ",
  totalAmount: 17000,
  deliveryFeeAmount: 3000,
  createdAt: "2026-10-31T12:00:00.000Z",
  updatedAt: "2026-10-31T12:05:00.000Z",
  lines: [{ productName: "Taco", quantity: 2, modifiersSnapshot: [{ group: "Salsa", option: "Criolla" }] }],
  events: [{ sequence: BigInt(12), kind: "ORDER_CREATED", toStatus: "RECEIVED", createdAt: "2026-10-31T12:00:00.000Z" }, { sequence: BigInt(13), kind: "PAYMENT_AND_ORDER_CONFIRMED", toStatus: "CONFIRMED", createdAt: "2026-10-31T12:05:00.000Z" }],
};

describe("customer order history", () => {
  it("round-trips an opaque stable cursor", () => {
    const cursor = { createdAt: "2026-10-31T12:00:00.000Z", id: "11111111-1111-4111-8111-111111111111" };
    expect(parseCustomerOrderCursor(encodeCustomerOrderCursor(cursor))).toEqual(cursor);
  });

  it("rejects malformed or non-UUID cursors", () => {
    expect(parseCustomerOrderCursor("not-a-cursor")).toBeNull();
    expect(parseCustomerOrderCursor(encodeCustomerOrderCursor({ createdAt: "2026-10-31T12:00:00.000Z", id: "order-1" }))).toBeNull();
  });

  it("builds an account-safe projection without capabilities or delivery PII", () => {
    const projection = toCustomerOrderSummary(order);
    expect(projection).toMatchObject({ orderCode: "TL-0027", fulfillment: "DELIVERY", currentStage: "CONFIRMED", totalAmount: 17000, deliveryFeeAmount: 3000 });
    expect(projection.lines[0]).toEqual({ name: "Taco", quantity: 2, modifiers: [{ group: "Salsa", option: "Criolla" }] });
    expect(projection).not.toHaveProperty("id");
    expect(projection).not.toHaveProperty("publicTrackingToken");
    expect(projection).not.toHaveProperty("deliveryAddress");
    expect(projection).not.toHaveProperty("customerId");
    expect(projection).not.toHaveProperty("orderId");
    expect(projection.repeatPath).toMatch(/^\/api\/customer\/orders\/[A-Za-z0-9_-]{43}\/repeat$/);
  });
});
