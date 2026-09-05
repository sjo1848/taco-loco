import { describe, expect, it } from "vitest";
import { assertValidTransition, calculateOrderTotals, canTransition, createOrderInputSchema, formatOrderNumber, type OrderStatus } from "./model";

const status = (value: OrderStatus) => value;

describe("order model", () => {
  it("allows only the linear operational flow and cancellation from active states", () => {
    expect(canTransition(status("RECEIVED"), status("CONFIRMED"))).toBe(true);
    expect(canTransition(status("IN_PREPARATION"), status("CANCELLED"))).toBe(true);
    expect(canTransition(status("DELIVERED"), status("RECEIVED"))).toBe(false);
    expect(() => assertValidTransition(status("DELIVERED"), status("RECEIVED"))).toThrow("INVALID_ORDER_TRANSITION");
  });

  it("calculates totals from immutable line values and an adjustment", () => {
    expect(calculateOrderTotals([{ unitPriceAmount: 10000, quantity: 2 }, { unitPriceAmount: 3500, quantity: 1 }], -500)).toEqual({ subtotalAmount: 23500, adjustmentAmount: -500, totalAmount: 23000 });
  });

  it("validates a minimum manual order and formats the display id", () => {
    expect(createOrderInputSchema.safeParse({ lines: [{ productName: "Taco x2 común", unitPriceAmount: 10000, quantity: 1 }] }).success).toBe(true);
    expect(createOrderInputSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(formatOrderNumber(12)).toBe("TL-0012");
  });
});
