import { describe, expect, it } from "vitest";
import { isEligibleCompletedOrder } from "./ledger";

describe("loyalty eligibility", () => {
  const base = { customerId: "customer-1", status: "DELIVERED", refundStatus: "NOT_REQUIRED", paymentStatus: "CONFIRMED" };
  it("requires a completed owned order with no refund", () => { expect(isEligibleCompletedOrder(base, "customer-1")).toBe(true); });
  it("rejects guests, other owners, pending and refunded orders", () => {
    expect(isEligibleCompletedOrder({ ...base, customerId: null }, "customer-1")).toBe(false);
    expect(isEligibleCompletedOrder(base, "customer-2")).toBe(false);
    expect(isEligibleCompletedOrder({ ...base, status: "CONFIRMED" }, "customer-1")).toBe(false);
    expect(isEligibleCompletedOrder({ ...base, refundStatus: "REFUNDED" }, "customer-1")).toBe(false);
  });
});
