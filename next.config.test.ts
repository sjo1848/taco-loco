import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("tracking referrer policy", () => {
  it("keeps a global policy but prioritizes no-referrer for token-bearing URLs", async () => {
    const rules = await nextConfig.headers?.();
    if (!rules) throw new Error("Expected next.config.ts headers");

    const globalIndex = rules.findIndex((rule) => rule.source === "/(.*)");
    expect(globalIndex).toBeGreaterThanOrEqual(0);
    expect(rules[globalIndex].headers).toContainEqual({
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    });

    for (const source of [
      "/pedido/:token",
      "/api/orders/tracking/:token",
      "/api/orders/tracking/:token/payment",
    ]) {
      const index = rules.findIndex((rule) => rule.source === source);
      expect(index).toBeGreaterThan(globalIndex);
      expect(rules[index].headers).toContainEqual({
        key: "Referrer-Policy",
        value: "no-referrer",
      });
    }
  });
});
