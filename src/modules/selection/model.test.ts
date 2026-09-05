import { describe, expect, it } from "vitest";
import { addSelectionLine, buildWhatsAppAppUrl, buildWhatsAppMessage, buildWhatsAppMessageWithOrder, buildWhatsAppUrl, createClientReference, removeSelectionLine, selectionCount, selectionTotal, updateSelectionQuantity, type SelectionLine } from "@/modules/selection/model";

const taco: Omit<SelectionLine, "id" | "quantity"> = { productId: "taco", name: "Taco x2", priceAmount: 5000, modifiers: [{ group: "Salsa", option: "Picante" }] };

describe("selection model", () => {
  it("combines equal lines and calculates count and total", () => {
    const once = addSelectionLine([], taco);
    const twice = addSelectionLine(once, taco);
    expect(selectionCount(twice)).toBe(2);
    expect(selectionTotal(twice)).toBe(10000);
  });

  it("removes a line when quantity reaches zero and builds a WhatsApp message", () => {
    const line = addSelectionLine([], taco)[0];
    expect(updateSelectionQuantity([line], line.id, 0)).toEqual([]);
    expect(buildWhatsAppMessage([line], "Taco Loco")).toBe([
      "Hola Taco Loco, quiero ordenar:",
      "- 1 x Taco x2 (Salsa: Picante)",
      "",
      "¿Me confirman disponibilidad y total final?",
    ].join("\n"));
  });

  it("removes a complete line explicitly and caps repeated additions", () => {
    const line = { productId: "p1", name: "Taco", priceAmount: 100, modifiers: [] };
    const capped = Array.from({ length: 20 }, () => line).reduce((lines) => addSelectionLine(lines, line), [] as SelectionLine[]);
    expect(capped[0].quantity).toBe(20);
    expect(removeSelectionLine(capped, capped[0].id)).toEqual([]);
  });

  it("preserves the configured WhatsApp destination when adding the message", () => {
    const url = buildWhatsAppUrl("https://wa.me/5492615956912?text=Mensaje%20base", "Hola Taco Loco");
    expect(url).toContain("https://wa.me/5492615956912");
    expect(new URL(url).searchParams.get("text")).toBe("Hola Taco Loco");
  });

  it("builds a native WhatsApp app URL for mobile devices", () => {
    expect(buildWhatsAppAppUrl("https://wa.me/5492615956912", "Hola Taco Loco")).toBe("whatsapp://send?phone=5492615956912&text=Hola%20Taco%20Loco");
  });

  it("includes the public order code and waits for confirmation after registration", () => {
    const message = buildWhatsAppMessageWithOrder([addSelectionLine([], taco)[0]], "Taco Loco", 184);
    expect(message).toBe([
      "Hola Taco Loco, quiero ordenar:",
      "Pedido: TL-0184",
      "",
      "- 1 x Taco x2 (Salsa: Picante)",
      "",
      "Quedo a la espera de confirmación.",
    ].join("\n"));
  });

  it("creates an idempotency reference without requiring randomUUID", () => {
    const reference = createClientReference();
    expect(reference.length).toBeGreaterThanOrEqual(16);
  });
});
