import { describe, expect, it } from "vitest";
import { hashPassword, hashSessionToken, verifyPassword } from "@/modules/auth/crypto";

describe("auth crypto", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const encoded = await hashPassword("correct horse battery staple");
    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery staple", encoded)).toBe(true);
    expect(await verifyPassword("wrong password", encoded)).toBe(false);
  });

  it("hashes session tokens deterministically", () => {
    expect(hashSessionToken("token")).toBe(hashSessionToken("token"));
    expect(hashSessionToken("token")).not.toBe(hashSessionToken("other"));
  });
});
