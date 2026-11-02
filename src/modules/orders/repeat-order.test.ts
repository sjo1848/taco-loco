import { describe, expect, it } from "vitest";
import { buildRepeatOrderLines } from "./service";

describe("repeat order preparation", () => {
  it("preserves product ids, quantities and modifier snapshots for server-side repricing", () => {
    expect(buildRepeatOrderLines([{ productId: "product-1", quantity: 2, modifiersSnapshot: [{ group: "Salsa", option: "Criolla" }, { ignored: true }] }])).toEqual([{ productId: "product-1", quantity: 2, modifiers: [{ group: "Salsa", option: "Criolla" }] }]);
  });

  it("keeps missing product ids visible for a safe unavailable response", () => {
    expect(buildRepeatOrderLines([{ productId: null, quantity: 1, modifiersSnapshot: [] }])[0].productId).toBeNull();
  });
});
