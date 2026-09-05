import { describe, expect, it } from "vitest";
import { buildCustomerWhatsAppAppUrl, buildCustomerWhatsAppUrl, buildOrderConfirmationMessage, normalizeCustomerPhone } from "./confirmation";

describe("order confirmation", () => {
  it("builds the requested confirmation with the visible order code and total", () => {
    const message = buildOrderConfirmationMessage({ businessName: "Taco Loco", orderNumber: 184, totalAmount: 18500, customerName: null, fulfillment: "PICKUP" });
    expect(message).toBe([
      "Hola,",
      "Tu pedido TL-0184 fue confirmado.",
      "",
      "Total final: $ 18.500.",
      "Te esperamos para retirarlo.",
      "",
      "Si necesitás hacer algún cambio, respondé por este medio.",
    ].join("\n"));
  });

  it("normalizes an optional customer phone and creates both WhatsApp targets", () => {
    const message = "Pedido TL-0184 confirmado";
    expect(normalizeCustomerPhone("+54 9 261 595-6912")).toBe("5492615956912");
    expect(buildCustomerWhatsAppUrl("+54 9 261 595-6912", message)).toContain("https://wa.me/5492615956912");
    expect(buildCustomerWhatsAppAppUrl("+54 9 261 595-6912", message)).toContain("whatsapp://send?phone=5492615956912");
    expect(buildCustomerWhatsAppUrl(null, message)).toBeNull();
  });
});
