import type { D1Database } from "@cloudflare/workers-types";

type CustomerIdentityWrite = { customerId: string; identityId: string; email: string | null; displayName: string | null; avatarUrl: string | null; provider: string; providerSubject: string };

export const D1_CUSTOMER_IDENTITY_CONFLICT = "D1_CUSTOMER_IDENTITY_CONFLICT";
export const D1_CUSTOMER_IDENTITY_TRANSIENT = "D1_CUSTOMER_IDENTITY_TRANSIENT";

export function isD1CustomerIdentityTransient(error: unknown) {
  return error instanceof Error && /SQLITE_BUSY|database is locked|busy timeout|temporarily unavailable/i.test(error.message);
}

export async function createD1CustomerIdentityWith(db: D1Database, input: CustomerIdentityWrite) {
  const now = new Date().toISOString();
  try {
    const results = await db.batch([
      db.prepare(`INSERT INTO "Customer" ("id", "email", "displayName", "avatarUrl", "active", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, 1, ?, ?)`)
        .bind(input.customerId, input.email, input.displayName, input.avatarUrl, now, now),
      db.prepare(`INSERT INTO "CustomerIdentity" ("id", "customerId", "provider", "providerSubject", "emailAtLogin", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(input.identityId, input.customerId, input.provider, input.providerSubject, input.email, now, now),
    ]);
    if (results.some((result) => !result.success)) throw new Error("D1_CUSTOMER_IDENTITY_FAILED");
  } catch (error) {
    if (error instanceof Error && /UNIQUE|unique constraint/i.test(error.message)) throw new Error(D1_CUSTOMER_IDENTITY_CONFLICT);
    if (isD1CustomerIdentityTransient(error)) throw new Error(D1_CUSTOMER_IDENTITY_TRANSIENT);
    throw error;
  }
}
