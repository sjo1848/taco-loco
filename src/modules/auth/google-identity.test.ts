import { afterEach, describe, expect, it, vi } from "vitest";
import { resetGoogleKeyCacheForTests, verifyGoogleIdToken } from "./google-identity";

function encode(value: unknown) {
  return btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

describe("Google ID token verification", () => {
  afterEach(() => { vi.unstubAllGlobals(); resetGoogleKeyCacheForTests(); });

  it("validates signature, issuer, audience, expiry and verified email", async () => {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const header = encode({ alg: "RS256", kid: "test-key", typ: "JWT" });
    const payload = encode({ iss: "https://accounts.google.com", aud: "client.apps.googleusercontent.com", sub: "google-sub-1", email: "customer@example.com", email_verified: true, name: "Customer", exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000) });
    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, pair.privateKey, new TextEncoder().encode(signingInput));
    const credential = `${signingInput}.${encodeBytes(new Uint8Array(signature))}`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }] }), { headers: { "cache-control": "max-age=300" } })));

    await expect(verifyGoogleIdToken(credential, "client.apps.googleusercontent.com")).resolves.toMatchObject({ subject: "google-sub-1", email: "customer@example.com" });
  });

  it("rejects a token issued for another audience", async () => {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const header = encode({ alg: "RS256", kid: "test-key" });
    const payload = encode({ iss: "accounts.google.com", aud: "other.apps.googleusercontent.com", sub: "google-sub-2", email: "customer@example.com", email_verified: true, exp: Math.floor(Date.now() / 1000) + 300 });
    const signingInput = `${header}.${payload}`;
    const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, pair.privateKey, new TextEncoder().encode(signingInput));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: "test-key" }] }))));
    await expect(verifyGoogleIdToken(`${signingInput}.${encodeBytes(new Uint8Array(signature))}`, "client.apps.googleusercontent.com")).rejects.toThrow("GOOGLE_TOKEN_INVALID");
  });
});

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
