import type { D1Database } from "@cloudflare/workers-types";

type NativeAdminUser = {
  id: string;
  email: string;
  passwordHash: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

type SessionUserRow = {
  expiresAt: string | number;
  id: string;
  email: string;
  passwordHash: string;
  active: number;
  createdAt: string | number;
  updatedAt: string | number;
  lastLoginAt: string | number | null;
};

type SessionStatusRow = { expiresAt: string | number; active: number };

function dateFromD1(value: string | number): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_ADMIN_SESSION_DATE");
  return date;
}

function isCurrent(row: SessionStatusRow, now: Date): boolean {
  return row.active === 1 && dateFromD1(row.expiresAt) > now;
}

/** The hash is server-generated from the HttpOnly admin cookie. Never accept a TL code or client input here. */
export async function findAdminSessionNative(database: D1Database, tokenHash: string): Promise<{ expiresAt: Date; user: NativeAdminUser } | null> {
  const row = await database.prepare(`
    SELECT s."expiresAt" AS expiresAt,
           u."id" AS id, u."email" AS email, u."passwordHash" AS passwordHash,
           u."active" AS active, u."createdAt" AS createdAt,
           u."updatedAt" AS updatedAt, u."lastLoginAt" AS lastLoginAt
    FROM "Session" AS s
    JOIN "AdminUser" AS u ON u."id" = s."userId"
    WHERE s."tokenHash" = ?1
    LIMIT 1
  `).bind(tokenHash).first<SessionUserRow>();
  if (!row) return null;
  return {
    expiresAt: dateFromD1(row.expiresAt),
    user: {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      active: row.active === 1,
      createdAt: dateFromD1(row.createdAt),
      updatedAt: dateFromD1(row.updatedAt),
      lastLoginAt: row.lastLoginAt === null ? null : dateFromD1(row.lastLoginAt),
    },
  };
}

/** SSE revalidation reads only the fields needed to reject revoked or inactive sessions. */
export async function isAdminSessionHashActiveNative(database: D1Database, tokenHash: string, now = new Date()): Promise<boolean> {
  const row = await database.prepare(`
    SELECT s."expiresAt" AS expiresAt, u."active" AS active
    FROM "Session" AS s
    JOIN "AdminUser" AS u ON u."id" = s."userId"
    WHERE s."tokenHash" = ?1
    LIMIT 1
  `).bind(tokenHash).first<SessionStatusRow>();
  return row !== null && isCurrent(row, now);
}
