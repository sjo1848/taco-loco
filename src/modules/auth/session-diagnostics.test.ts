import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), findUnique: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/db", () => ({ db: { session: { findUnique: mocks.findUnique } } }));
vi.mock("@/modules/auth/crypto", () => ({ hashSessionToken: () => "synthetic-hash" }));
import { getCurrentAdmin } from "./session";

afterEach(() => vi.resetAllMocks());

describe("shared admin session diagnostic stages", () => {
  it("marks cookie context, cookie read, D1 lookup and validation without changing the user", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    const user = { id: "synthetic-admin", active: true };
    mocks.findUnique.mockResolvedValue({ user, expiresAt: new Date(Date.now() + 60_000) });
    const stages: string[] = [];
    const diagnostic = { run: async <T>(stage: string, operation: () => T | Promise<T>) => { stages.push(stage); return operation(); } };
    expect(await getCurrentAdmin(diagnostic)).toBe(user);
    expect(stages).toEqual(["auth.cookies_context", "auth.cookie_read", "d1.admin_session_lookup", "auth.session_validation"]);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { tokenHash: "synthetic-hash" }, include: { user: true } });
  });

  it("rejects an expired session after the same lookup", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    mocks.findUnique.mockResolvedValue({ user: { active: true }, expiresAt: new Date(Date.now() - 60_000) });
    const stages: string[] = [];
    const diagnostic = { run: async <T>(stage: string, operation: () => T | Promise<T>) => { stages.push(stage); return operation(); } };
    expect(await getCurrentAdmin(diagnostic)).toBeNull();
    expect(stages.at(-1)).toBe("auth.session_validation");
  });
});
