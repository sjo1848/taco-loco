import { afterEach, describe, expect, it, vi } from "vitest";
import { resetGoogleKeyCacheForTests, verifyGoogleIdToken } from "./google-identity";

function encode(value: unknown) {
  return btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signedToken(payload: Record<string, unknown>) {
  const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const header = encode({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const body = encode(payload);
  const signingInput = `${header}.${body}`;
  const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, pair.privateKey, new TextEncoder().encode(signingInput));
  return { credential: `${signingInput}.${encodeBytes(new Uint8Array(signature))}`, publicJwk };
}

function stubKeys(publicJwk: JsonWebKey) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }] }), { headers: { "cache-control": "max-age=300" } })));
}

const basePayload = () => ({ iss: "https://accounts.google.com", aud: "client.apps.googleusercontent.com", sub: "google-sub-1", email: "customer@example.com", email_verified: true, name: "Customer", exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000) });

describe("Google ID token verification", () => {
  afterEach(() => { vi.unstubAllGlobals(); resetGoogleKeyCacheForTests(); });

  it("validates signature, issuer, audience, expiry and verified email", async () => {
    const token = await signedToken(basePayload());
    stubKeys(token.publicJwk);
    await expect(verifyGoogleIdToken(token.credential, "client.apps.googleusercontent.com")).resolves.toMatchObject({ subject: "google-sub-1", email: "customer@example.com" });
  });

  it.each([
    ["audience", { aud: "other.apps.googleusercontent.com" }],
    ["issuer", { iss: "https://issuer.invalid" }],
    ["expiry", { exp: Math.floor(Date.now() / 1000) - 301 }],
    ["email verification", { email_verified: false }],
  ])("rejects invalid %s claims", async (_name, override) => {
    const token = await signedToken({ ...basePayload(), ...override });
    stubKeys(token.publicJwk);
    await expect(verifyGoogleIdToken(token.credential, "client.apps.googleusercontent.com")).rejects.toThrow(/GOOGLE_(TOKEN_INVALID|EMAIL_UNVERIFIED)/);
  });

  it("rejects a tampered signature", async () => {
    const token = await signedToken(basePayload());
    stubKeys(token.publicJwk);
    const [header, body, signature] = token.credential.split(".");
    const tampered = `${header}.${body}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    await expect(verifyGoogleIdToken(tampered, "client.apps.googleusercontent.com")).rejects.toThrow("GOOGLE_TOKEN_INVALID");
  });
});
