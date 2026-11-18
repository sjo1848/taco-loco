import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), findUnique: vi.fn(), loadWorkerDb: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/db", () => ({ db: { session: { findUnique: mocks.findUnique } }, loadWorkerDbForDiagnostic: mocks.loadWorkerDb }));
vi.mock("@/modules/auth/crypto", () => ({ hashSessionToken: () => "synthetic-hash" }));
import { getCurrentAdmin } from "./session";

afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });

const diagnosticStages = () => {
  const stages: string[] = [];
  return {
    stages,
    diagnostic: {
      run: async <T>(stage: string, operation: () => T | Promise<T>): Promise<T> => { stages.push(`${stage}:start`); const value = await operation(); stages.push(`${stage}:done`); return value; },
      runSync: <T>(stage: string, operation: () => T): T => { stages.push(`${stage}:start`); const value = operation(); stages.push(`${stage}:done`); return value; },
    },
  };
};

describe("shared admin session diagnostic stages", () => {
  it("marks cookie context, cookie read, D1 lookup and validation without changing the user", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    const user = { id: "synthetic-admin", active: true };
    mocks.findUnique.mockResolvedValue({ user, expiresAt: new Date(Date.now() + 60_000) });
    const { stages, diagnostic } = diagnosticStages();
    expect(await getCurrentAdmin(diagnostic)).toBe(user);
    expect(stages.filter((stage) => stage.endsWith(":start"))).toEqual(["auth.cookies_context:start", "auth.cookie_read:start", "d1.admin_session_lookup:start", "auth.session_validation:start"]);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { tokenHash: "synthetic-hash" }, include: { user: true } });
  });

  it("rejects an expired session after the same lookup", async () => {
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    mocks.findUnique.mockResolvedValue({ user: { active: true }, expiresAt: new Date(Date.now() - 60_000) });
    const { stages, diagnostic } = diagnosticStages();
    expect(await getCurrentAdmin(diagnostic)).toBeNull();
    expect(stages.at(-1)).toBe("auth.session_validation:done");
  });

  it("separates worker import, client availability, lazy construction and query execution", async () => {
    vi.stubGlobal("WebSocketPair", class {});
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    const user = { id: "synthetic-admin", active: true };
    let executionCount = 0;
    const workerDb = { session: { findUnique: vi.fn(() => ({ then(resolve: (value: unknown) => void) { executionCount++; resolve({ user, expiresAt: new Date(Date.now() + 60_000) }); } })) } };
    mocks.loadWorkerDb.mockImplementation(async (diagnostic: ReturnType<typeof diagnosticStages>["diagnostic"]) => diagnostic.run("d1.worker_module_import", () => workerDb));
    const { stages, diagnostic } = diagnosticStages();
    expect(await getCurrentAdmin(diagnostic)).toBe(user);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(workerDb.session.findUnique).toHaveBeenCalledWith({ where: { tokenHash: "synthetic-hash" }, include: { user: true } });
    expect(executionCount).toBe(1);
    expect(stages.indexOf("d1.worker_module_import:done")).toBeLessThan(stages.indexOf("d1.worker_client_available:start"));
    expect(stages.indexOf("d1.session_find_unique_construct:done")).toBeLessThan(stages.indexOf("d1.prisma_promise_await:start"));
  });

  it("handles parallel worker session reads without sharing query results", async () => {
    vi.stubGlobal("WebSocketPair", class {});
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    const user = { id: "synthetic-admin", active: true };
    const workerDb = { session: { findUnique: vi.fn(async () => ({ user, expiresAt: new Date(Date.now() + 60_000) })) } };
    mocks.loadWorkerDb.mockResolvedValue(workerDb);
    const [first, second] = await Promise.all([getCurrentAdmin(diagnosticStages().diagnostic), getCurrentAdmin(diagnosticStages().diagnostic)]);
    expect(first).toBe(user);
    expect(second).toBe(user);
    expect(mocks.loadWorkerDb).toHaveBeenCalledTimes(2);
    expect(workerDb.session.findUnique).toHaveBeenCalledTimes(2);
  });

  it("propagates async import and query failures without retrying or leaking auth", async () => {
    vi.stubGlobal("WebSocketPair", class {});
    mocks.cookies.mockResolvedValue({ get: () => ({ value: "private-cookie" }) });
    const failure = new Error("synthetic DB failure");
    mocks.loadWorkerDb.mockRejectedValueOnce(failure);
    await expect(getCurrentAdmin(diagnosticStages().diagnostic)).rejects.toBe(failure);
    const workerDb = { session: { findUnique: vi.fn(() => Promise.reject(failure)) } };
    mocks.loadWorkerDb.mockResolvedValueOnce(workerDb);
    await expect(getCurrentAdmin(diagnosticStages().diagnostic)).rejects.toBe(failure);
    expect(workerDb.session.findUnique).toHaveBeenCalledTimes(1);
    expect(mocks.loadWorkerDb).toHaveBeenCalledTimes(2);
  });
});
