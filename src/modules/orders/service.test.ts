import { describe, expect, it } from "vitest";
import { canConfirmDelivery, createPublicOrderIntentInputSchema } from "./service";

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

  it("only allows delivery confirmation after confirmed or explicitly verified reported payment", () => {
    expect(canConfirmDelivery("NOT_REQUIRED", false)).toBe(false);
    expect(canConfirmDelivery("PENDING", true)).toBe(true);
    expect(canConfirmDelivery("REPORTED", false)).toBe(false);
    expect(canConfirmDelivery("REPORTED", true)).toBe(true);
    expect(canConfirmDelivery("CONFIRMED", false)).toBe(true);
  });
});
