import { describe, expect, it } from "vitest";
import { buildMenuReadModel } from "@/modules/catalog/read-model";

describe("buildMenuReadModel", () => {
  it("exposes only public-safe fields and builds WhatsApp URL", () => {
    const model = buildMenuReadModel({
      settings: { businessName: "Taco Loco", whatsappPhone: "+5491122334455", whatsappMessage: "Hola Taco Loco" , currency: "ARS", acceptingOrders: true, statusMessage: null, weeklySchedule: [] },
      categories: [{ id: "cat-1", name: "Tacos", slug: "tacos", products: [{ id: "prod-1", name: "Taco x2", description: "Carne", priceAmount: 10000, available: false, featured: true, imageKey: null, imageAlt: null, modifierGroups: [{ required: true, minSelections: 1, maxSelections: 1, modifierGroup: { name: "Salsa a elección", options: [{ name: "Picante" }] } }] }] }],
    });
    expect(model.settings.whatsappUrl).toContain("https://wa.me/5491122334455");
    expect(model.categories[0].products[0].available).toBe(false);
    expect(model.categories[0].products[0].modifiers[0].options).toEqual(["Picante"]);
  });
});
