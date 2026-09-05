import { describe, expect, it } from "vitest";
import { createManualOrderInputSchema, transitionOrderData, transitionOrderInputSchema } from "./service";

describe("order transition service", () => {
  it("requires a reason for cancellation at the input boundary", () => {
    expect(transitionOrderInputSchema.safeParse({ orderId: "123e4567-e89b-12d3-a456-426614174000", toStatus: "CANCELLED" }).success).toBe(false);
    expect(transitionOrderInputSchema.safeParse({ orderId: "123e4567-e89b-12d3-a456-426614174000", toStatus: "CANCELLED", reason: "Sin disponibilidad" }).success).toBe(true);
  });

  it("sets confirmation and closing timestamps according to the target state", () => {
    const now = new Date("2026-08-09T19:30:00.000Z");
    expect(transitionOrderData("CONFIRMED", null, now)).toMatchObject({ status: "CONFIRMED", confirmedAt: now, closedAt: undefined });
    expect(transitionOrderData("DELIVERED", null, now)).toMatchObject({ status: "DELIVERED", closedAt: now });
    expect(transitionOrderData("CANCELLED", "Sin disponibilidad", now)).toMatchObject({ status: "CANCELLED", cancellationReason: "Sin disponibilidad", closedAt: now });
  });

  it("accepts only catalog references for manual order lines", () => {
    const productId = "123e4567-e89b-12d3-a456-426614174000";
    expect(createManualOrderInputSchema.safeParse({ lines: [{ productId, quantity: 2 }] }).success).toBe(true);
    expect(createManualOrderInputSchema.safeParse({ lines: [{ productId: "00000000-0000-0000-0000-000000000002", quantity: 1 }] }).success).toBe(true);
    expect(createManualOrderInputSchema.safeParse({ lines: [{ productId: "not-an-id", quantity: 1 }] }).success).toBe(false);
    expect(createManualOrderInputSchema.safeParse({ lines: [] }).success).toBe(false);
  });
});
