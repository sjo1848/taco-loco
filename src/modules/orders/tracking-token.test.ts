import { describe, expect, it } from "vitest";
import { createPublicTrackingToken, isPublicTrackingToken } from "./tracking-token";

describe("public tracking tokens", () => {
  it("uses 256-bit URL-safe capabilities", () => {
    const token = createPublicTrackingToken();
    expect(token).toHaveLength(43);
    expect(isPublicTrackingToken(token)).toBe(true);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("does not generate the same capability twice", () => {
    expect(createPublicTrackingToken()).not.toBe(createPublicTrackingToken());
  });
});
