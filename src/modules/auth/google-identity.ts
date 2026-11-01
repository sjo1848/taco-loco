const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const CLOCK_SKEW_SECONDS = 300;

type GoogleJwtHeader = { alg?: string; kid?: string; typ?: string };
type GoogleJwtPayload = { iss?: string; aud?: string | string[]; sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string; exp?: number; iat?: number; nonce?: string };

export type GoogleIdentityProfile = {
  subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

let jwksCache: { keys: JsonWebKey[]; expiresAt: number } | null = null;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

async function getGoogleKeys() {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const response = await fetch(GOOGLE_JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("GOOGLE_KEYS_UNAVAILABLE");
  const body = await response.json() as { keys?: JsonWebKey[] };
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1] ?? "300");
  jwksCache = { keys: body.keys ?? [], expiresAt: Date.now() + Math.max(60, Math.min(maxAge, 86_400)) * 1000 };
  return jwksCache.keys;
}

export async function verifyGoogleIdToken(credential: string, audience: string, expectedNonce: string): Promise<GoogleIdentityProfile> {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("GOOGLE_TOKEN_INVALID");
  const header = decodeJson<GoogleJwtHeader>(parts[0]);
  const payload = decodeJson<GoogleJwtPayload>(parts[1]);
  if (header.alg !== "RS256" || !header.kid || !payload.sub || !payload.iss || !GOOGLE_ISSUERS.has(payload.iss)) throw new Error("GOOGLE_TOKEN_INVALID");
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(audience) || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000) - CLOCK_SKEW_SECONDS) throw new Error("GOOGLE_TOKEN_INVALID");
  if (typeof payload.iat === "number" && payload.iat > Math.floor(Date.now() / 1000) + CLOCK_SKEW_SECONDS) throw new Error("GOOGLE_TOKEN_INVALID");
  if (!payload.nonce || payload.nonce !== expectedNonce) throw new Error("GOOGLE_TOKEN_INVALID");
  if (!payload.email || payload.email_verified !== true) throw new Error("GOOGLE_EMAIL_UNVERIFIED");
  const keyData = (await getGoogleKeys()).find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
  if (!keyData) throw new Error("GOOGLE_KEY_NOT_FOUND");
  const key = await crypto.subtle.importKey("jwk", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("GOOGLE_TOKEN_INVALID");
  return { subject: payload.sub, email: payload.email.toLowerCase(), displayName: payload.name ?? null, avatarUrl: payload.picture ?? null };
}

export function resetGoogleKeyCacheForTests() {
  jwksCache = null;
}
