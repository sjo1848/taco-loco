import { describe, expect, it, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { findAdminSessionNative, isAdminSessionHashActiveNative } from "./admin-session-native";

const future = "2035-01-02T03:04:05.000+00:00";
const past = "2020-01-02T03:04:05.000+00:00";
type TestRow = { expiresAt: string; id: string; email: string; passwordHash: string; active: number; createdAt: string; updatedAt: string; lastLoginAt: string | null };
const userRow = (id = "admin-a"): TestRow => ({
  expiresAt: future, id, email: `${id}@example.test`, passwordHash: "synthetic-hash",
  active: 1, createdAt: past, updatedAt: past, lastLoginAt: null,
});

function databaseFor(rows: Record<string, TestRow | null>) {
  const queries: string[] = [];
  const binds: string[] = [];
  const first = vi.fn(async (hash: string) => rows[hash] ?? null);
  const database = { prepare(sql: string) { queries.push(sql); return { bind(hash: string) { binds.push(hash); return { first: () => first(hash) }; } }; } } as unknown as D1Database;
  return { database, queries, binds, first };
}

describe("native D1 admin session reads", () => {
  it("returns the same user field types as Prisma and binds the token hash", async () => {
    const fixture = databaseFor({ hashA: userRow() });
    const session = await findAdminSessionNative(fixture.database, "hashA");
    expect(session).toEqual({
      expiresAt: new Date(future),
      user: { id: "admin-a", email: "admin-a@example.test", passwordHash: "synthetic-hash", active: true,
        createdAt: new Date(past), updatedAt: new Date(past), lastLoginAt: null },
    });
    expect(fixture.binds).toEqual(["hashA"]);
    expect(fixture.queries[0]).toContain('WHERE s."tokenHash" = ?1');
    expect(fixture.queries[0]).toContain('JOIN "AdminUser"');
  });

  it("returns no user for an absent, revoked or foreign hash", async () => {
    const fixture = databaseFor({ hashA: userRow("admin-a"), hashB: userRow("admin-b") });
    expect(await findAdminSessionNative(fixture.database, "unknown")).toBeNull();
    const [a, b] = await Promise.all([
      findAdminSessionNative(fixture.database, "hashA"),
      findAdminSessionNative(fixture.database, "hashB"),
    ]);
    expect(a?.user.id).toBe("admin-a");
    expect(b?.user.id).toBe("admin-b");
    expect(a?.user.id).not.toBe(b?.user.id);
  });

  it("applies expiration and active-user checks for SSE", async () => {
    const fixture = databaseFor({ valid: userRow(), expired: { ...userRow(), expiresAt: past }, inactive: { ...userRow(), active: 0 } });
    const now = new Date("2030-01-01T00:00:00.000Z");
    expect(await isAdminSessionHashActiveNative(fixture.database, "valid", now)).toBe(true);
    expect(await isAdminSessionHashActiveNative(fixture.database, "expired", now)).toBe(false);
    expect(await isAdminSessionHashActiveNative(fixture.database, "inactive", now)).toBe(false);
    expect(await isAdminSessionHashActiveNative(fixture.database, "revoked", now)).toBe(false);
    expect(fixture.queries.every((query) => !query.includes('u."email"'))).toBe(true);
  });

  it("converts nullable lastLoginAt and rejects corrupt dates instead of accepting them", async () => {
    const fixture = databaseFor({ logged: { ...userRow(), lastLoginAt: past }, corrupt: { ...userRow(), expiresAt: "invalid" } });
    expect((await findAdminSessionNative(fixture.database, "logged"))?.user.lastLoginAt).toEqual(new Date(past));
    await expect(findAdminSessionNative(fixture.database, "corrupt")).rejects.toThrow("INVALID_ADMIN_SESSION_DATE");
    await expect(isAdminSessionHashActiveNative(fixture.database, "corrupt")).rejects.toThrow("INVALID_ADMIN_SESSION_DATE");
  });

  it("propagates D1 errors without retrying or granting access", async () => {
    const failure = new Error("synthetic D1 failure");
    const first = vi.fn(async () => { throw failure; });
    const database = { prepare: () => ({ bind: () => ({ first }) }) } as unknown as D1Database;
    await expect(findAdminSessionNative(database, "hashA")).rejects.toBe(failure);
    await expect(isAdminSessionHashActiveNative(database, "hashA")).rejects.toBe(failure);
    expect(first).toHaveBeenCalledTimes(2);
  });
});
