import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tokens: [] as Array<string | undefined>,
  prismaFind: vi.fn(),
  nativeFind: vi.fn(),
  nativeActive: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.tokens.shift() }) }) }));
vi.mock("@/lib/db", () => ({ db: { session: { findUnique: mocks.prismaFind } } }));
vi.mock("./admin-session-d1.worker", () => ({ findAdminSessionWorker: mocks.nativeFind, isAdminSessionHashActiveWorker: mocks.nativeActive }));
vi.mock("@/modules/auth/crypto", () => ({ hashSessionToken: (token: string) => `synthetic-hash:${token}` }));

import { getActiveAdminSessionHash, getCurrentAdmin, isAdminSessionHashActive } from "./session";

beforeEach(() => { vi.stubGlobal("WebSocketPair", class {}); mocks.tokens = []; vi.resetAllMocks(); });
afterEach(() => vi.unstubAllGlobals());

const valid = (id: string) => ({ expiresAt: new Date(Date.now() + 60_000), user: { id, active: true } });

describe("admin auth runtime with native D1 reads", () => {
  it("accepts a valid session and never falls back to Prisma on Workers", async () => {
    mocks.tokens.push("cookie-a");
    mocks.nativeFind.mockResolvedValue(valid("admin-a"));
    expect((await getCurrentAdmin())?.id).toBe("admin-a");
    expect(mocks.nativeFind).toHaveBeenCalledWith("synthetic-hash:cookie-a");
    expect(mocks.prismaFind).not.toHaveBeenCalled();
  });

  it("rejects absent, revoked, expired and inactive sessions", async () => {
    mocks.tokens.push(undefined, "revoked", "expired", "inactive");
    expect(await getCurrentAdmin()).toBeNull();
    mocks.nativeFind.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ expiresAt: new Date(Date.now() - 60_000), user: { active: true } })
      .mockResolvedValueOnce({ expiresAt: new Date(Date.now() + 60_000), user: { active: false } });
    expect(await getCurrentAdmin()).toBeNull();
    expect(await getCurrentAdmin()).toBeNull();
    expect(await getCurrentAdmin()).toBeNull();
    expect(mocks.nativeFind).toHaveBeenCalledTimes(3);
    expect(mocks.prismaFind).not.toHaveBeenCalled();
  });

  it("keeps two users isolated through the worker path", async () => {
    mocks.tokens.push("cookie-a", "cookie-b");
    mocks.nativeFind.mockImplementation(async (hash: string) => {
      return valid(hash.endsWith("a") ? "admin-a" : "admin-b");
    });
    const a = await getCurrentAdmin();
    const b = await getCurrentAdmin();
    expect([a?.id, b?.id]).toEqual(["admin-a", "admin-b"]);
    expect(mocks.prismaFind).not.toHaveBeenCalled();
  });

  it("denies a native query failure without falling back to Prisma", async () => {
    mocks.tokens.push("cookie-error");
    mocks.nativeFind.mockRejectedValue(new Error("synthetic D1 outage"));
    await expect(getCurrentAdmin()).rejects.toThrow("synthetic D1 outage");
    expect(mocks.nativeFind).toHaveBeenCalledTimes(1);
    expect(mocks.prismaFind).not.toHaveBeenCalled();
  });

  it("revalidates SSE through native D1 and retains only a hash", async () => {
    mocks.tokens.push("private-cookie");
    mocks.nativeActive.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await getActiveAdminSessionHash()).toBe("synthetic-hash:private-cookie");
    expect(await isAdminSessionHashActive("synthetic-hash:revoked")).toBe(false);
    expect(mocks.nativeActive).toHaveBeenNthCalledWith(1, "synthetic-hash:private-cookie");
    expect(mocks.nativeActive).toHaveBeenNthCalledWith(2, "synthetic-hash:revoked");
    expect(mocks.prismaFind).not.toHaveBeenCalled();
  });

  it("keeps the PostgreSQL Prisma path outside Workers", async () => {
    vi.unstubAllGlobals();
    mocks.tokens.push("postgres-cookie");
    mocks.prismaFind.mockResolvedValue(valid("postgres-admin"));
    expect((await getCurrentAdmin())?.id).toBe("postgres-admin");
    expect(mocks.prismaFind).toHaveBeenCalledWith({ where: { tokenHash: "synthetic-hash:postgres-cookie" }, include: { user: true } });
    expect(mocks.nativeFind).not.toHaveBeenCalled();
  });
});
