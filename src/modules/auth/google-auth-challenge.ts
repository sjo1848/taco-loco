import { db } from "@/lib/db";
import { hashSessionToken } from "@/modules/auth/crypto";
import { createGoogleNonce } from "@/lib/google-nonce";

const GOOGLE_AUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;

export async function issueGoogleAuthChallenge() {
  const nonce = createGoogleNonce();
  await db.googleAuthChallenge.create({ data: { id: crypto.randomUUID(), nonceHash: hashSessionToken(nonce), expiresAt: new Date(Date.now() + GOOGLE_AUTH_CHALLENGE_TTL_MS) } });
  return nonce;
}

/**
 * The database predicate is the one-use boundary. A browser cookie deletion is only cleanup;
 * concurrent requests are serialized by the conditional update and exactly one can consume it.
 */
export async function consumeGoogleAuthChallenge(nonce: string) {
  const result = await db.googleAuthChallenge.updateMany({
    where: { nonceHash: hashSessionToken(nonce), consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  return result.count === 1;
}
