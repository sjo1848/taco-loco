import { db } from "@/lib/db";
import { hashSessionToken } from "@/modules/auth/crypto";
import { createGoogleNonce } from "@/lib/google-nonce";

const GOOGLE_AUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_AUTH_CHALLENGE_CLEANUP_LIMIT = 100;

export async function cleanupGoogleAuthChallenges() {
  const stale = await db.googleAuthChallenge.findMany({
    where: { OR: [{ consumedAt: { not: null } }, { expiresAt: { lte: new Date() } }] },
    orderBy: { createdAt: "asc" },
    take: GOOGLE_AUTH_CHALLENGE_CLEANUP_LIMIT,
    select: { id: true },
  });
  if (!stale.length) return 0;
  const result = await db.googleAuthChallenge.deleteMany({ where: { id: { in: stale.map((row: { id: string }) => row.id) } } });
  return result.count;
}

export async function issueGoogleAuthChallenge() {
  try { await cleanupGoogleAuthChallenges(); } catch { /* best-effort cleanup must not block a fresh challenge */ }
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
