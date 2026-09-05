import { describe, expect, it } from "vitest";
import { filterCatalog } from "@/modules/catalog/discovery";

describe("filterCatalog", () => {
  const categories = [{ id: "tacos", name: "Tacos", slug: "tacos", products: [{ name: "Taco x2 común", description: "Con salsa" }, { name: "Burrito", description: "Carne" }] }];

  it("filters by product name or description and removes empty categories", () => {
    expect(filterCatalog(categories, "salsa")[0].products.map((product) => product.name)).toEqual(["Taco x2 común"]);
    expect(filterCatalog(categories, "tacos")[0].products).toHaveLength(2);
    expect(filterCatalog(categories, "pizza")).toEqual([]);
  });

  it("keeps the complete catalog for an empty query", () => {
    expect(filterCatalog(categories, "")).toBe(categories);
  });
});
