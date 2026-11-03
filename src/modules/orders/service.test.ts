import { describe, expect, it } from "vitest";
import { canConfirmDelivery, createPublicOrderIntentInputSchema, resolveOrderOwner } from "./service";

const line = { productId: "11111111-1111-4111-8111-111111111111", quantity: 1, modifiers: [] };

describe("public order intent checkout", () => {
  it("defaults to pickup without customer identity or payment", () => {
    expect(createPublicOrderIntentInputSchema.parse({ clientReference: "client-reference-0001", lines: [line] })).toMatchObject({ fulfillment: "PICKUP" });
  });

  it("requires delivery address and transfer holder", () => {
    const result = createPublicOrderIntentInputSchema.safeParse({ clientReference: "client-reference-0002", fulfillment: "DELIVERY", lines: [line] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining(["deliveryAddress", "transferHolderName"]));
  });

  it("accepts the complete delivery checkout payload", () => {
    expect(createPublicOrderIntentInputSchema.parse({ clientReference: "client-reference-0003", fulfillment: "DELIVERY", deliveryAddress: "Calle 1 123", deliveryReference: "Portón negro", transferHolderName: "Ana Pérez", lines: [line] })).toMatchObject({ fulfillment: "DELIVERY", deliveryAddress: "Calle 1 123", transferHolderName: "Ana Pérez" });
  });

  it("accepts an optional customer name without making guest checkout require an account", () => {
    expect(createPublicOrderIntentInputSchema.parse({ clientReference: "client-reference-name-01", customerName: "  Sol Pérez  ", lines: [line] })).toMatchObject({ fulfillment: "PICKUP", customerName: "Sol Pérez" });
  });

  it("only allows delivery confirmation after confirmed or explicitly verified reported payment", () => {
    expect(canConfirmDelivery("NOT_REQUIRED")).toBe(false);
    expect(canConfirmDelivery("PENDING")).toBe(false);
    expect(canConfirmDelivery("REPORTED")).toBe(false);
    expect(canConfirmDelivery("CONFIRMED")).toBe(true);
  });

  it("preserves guest ownership on idempotent replay and assigns only new orders", () => {
    expect(resolveOrderOwner(null, "customer-authenticated")).toBe("customer-authenticated");
    expect(resolveOrderOwner({ customerId: null }, "customer-authenticated")).toBeNull();
    expect(resolveOrderOwner({ customerId: "customer-original" }, "customer-authenticated")).toBe("customer-original");
  });
});
