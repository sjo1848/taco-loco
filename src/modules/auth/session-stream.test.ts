import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), token: "synthetic-admin-session-token" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.token }) }) }));
vi.mock("@/lib/db", () => ({ db: { session: { findUnique: mocks.findUnique } } }));

import { getActiveAdminSessionHash, isAdminSessionHashActive } from "./session";

beforeEach(() => { mocks.findUnique.mockReset(); });

describe("admin stream session revalidation", () => {
  it("retains only the hash of a valid cookie token", async () => {
    mocks.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user: { active: true } });
    const hash = await getActiveAdminSessionHash();
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(mocks.token);
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hash } }));
  });

  it("rejects revoked and expired sessions", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ expiresAt: new Date(Date.now() - 1_000), user: { active: true } });
    expect(await isAdminSessionHashActive("synthetic-hash")).toBe(false);
    expect(await isAdminSessionHashActive("synthetic-hash")).toBe(false);
  });

  it("rejects a deactivated administrator", async () => {
    mocks.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), user: { active: false } });
    expect(await isAdminSessionHashActive("synthetic-hash")).toBe(false);
  });
});
