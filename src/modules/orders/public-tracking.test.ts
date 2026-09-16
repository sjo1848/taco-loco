import { describe, expect, it } from "vitest";
import { toPublicOrderHistory, toPublicOrderTracking, toPublicTrackingStage } from "./public-tracking";

const base = { orderNumber: 27, fulfillment: "PICKUP" as const, status: "RECEIVED", verificationStatus: "PENDING", paymentStatus: "NOT_REQUIRED", refundStatus: "NOT_REQUIRED", totalAmount: 17000, deliveryFeeAmount: 0, createdAt: "2026-09-16T20:00:00.000Z", updatedAt: "2026-09-16T20:00:00.000Z", lines: [{ productName: "Taco", quantity: 2, modifiersSnapshot: [{ group: "Salsa", option: "Guacamole" }] }] };

describe("public order tracking projection", () => {
  it("uses explicit state precedence", () => {
    expect(toPublicTrackingStage({ ...base, fulfillment: "DELIVERY", status: "RECEIVED", verificationStatus: "PENDING", paymentStatus: "PENDING", refundStatus: "NOT_REQUIRED" })).toBe("WAITING_PAYMENT_CONFIRMATION");
    expect(toPublicTrackingStage({ ...base, status: "CANCELLED", verificationStatus: "EXPIRED" })).toBe("EXPIRED");
    expect(toPublicTrackingStage({ ...base, status: "CANCELLED", verificationStatus: "VERIFIED", refundStatus: "REQUIRED" })).toBe("REFUND_PENDING");
  });

  it("orders by sequence, hides operational no-show, and deduplicates milestones", () => {
    const history = toPublicOrderHistory({ fulfillment: "PICKUP", events: [
      { sequence: BigInt(3), kind: "STATUS_TRANSITION", toStatus: "CONFIRMED", createdAt: "2026-09-16T20:03:00Z" },
      { sequence: BigInt(1), kind: "ORDER_CREATED", toStatus: "RECEIVED", createdAt: "2026-09-16T20:00:00Z" },
      { sequence: BigInt(2), kind: "NO_SHOW_RECORDED", toStatus: "READY", createdAt: "2026-09-16T20:02:00Z" },
      { sequence: BigInt(4), kind: "PAYMENT_AND_ORDER_CONFIRMED", toStatus: "CONFIRMED", createdAt: "2026-09-16T20:04:00Z" },
    ] });
    expect(history.map((item) => item.label)).toEqual(["Pedido enviado", "Pedido confirmado", "Pago y pedido confirmados"]);
  });

  it("constructs an allow-listed public object", () => {
    const result = toPublicOrderTracking({ ...base, events: [{ sequence: BigInt(1), kind: "ORDER_CREATED", toStatus: "RECEIVED", createdAt: base.createdAt }] });
    expect(Object.keys(result).sort()).toEqual(["createdAt", "currentStage", "deliveryFeeAmount", "fulfillment", "history", "lines", "message", "orderCode", "title", "totalAmount", "updatedAt", "version"]);
    expect(JSON.stringify(result)).not.toContain("clientReference");
    expect(JSON.stringify(result)).not.toContain("token");
    expect(result.lines[0]?.modifiers).toEqual([{ group: "Salsa", option: "Guacamole" }]);
  });
});
