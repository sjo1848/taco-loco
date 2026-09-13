import { describe, expect, it } from "vitest";
import { resolveStaticProductAsset } from "./static-assets";

describe("static product assets", () => {
  it("accepts a stable public product path", () => {
    expect(resolveStaticProductAsset("/products/taco-carne.jpg")).toBe("/products/taco-carne.jpg");
  });

  it("does not expose legacy storage keys or traversal paths", () => {
    expect(resolveStaticProductAsset("products/product-id/old.webp")).toBeNull();
    expect(resolveStaticProductAsset("/products/../secret.jpg")).toBeNull();
    expect(resolveStaticProductAsset(null)).toBeNull();
  });
});
