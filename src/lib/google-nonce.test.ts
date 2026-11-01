import { describe, expect, it } from "vitest";
import { createGoogleNonce } from "./google-nonce";

describe("Google nonce", () => {
  it("creates a fresh URL-safe nonce with sufficient length", () => {
    const first = createGoogleNonce();
    const second = createGoogleNonce();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });
});
