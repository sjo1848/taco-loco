import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ imports: 0, release: undefined as undefined | (() => void) }));
vi.mock("@prisma/client", () => ({ PrismaClient: class {} }));
vi.mock("./db.worker", async () => {
  state.imports++;
  await new Promise<void>((resolve) => { state.release = resolve; });
  return { db: { session: { findUnique: () => null } } };
});

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("worker DB import diagnostic", () => {
  it("observes the existing lazy import promise for concurrent requests", async () => {
    vi.stubGlobal("WebSocketPair", class {});
    const { loadWorkerDbForDiagnostic } = await import("./db");
    const stages: string[] = [];
    const diagnostic = { run: async <T>(stage: string, operation: () => T | Promise<T>) => { stages.push(stage); return operation(); } };
    const first = loadWorkerDbForDiagnostic(diagnostic);
    const second = loadWorkerDbForDiagnostic(diagnostic);
    await vi.waitFor(() => expect(state.release).toBeTypeOf("function"));
    expect(state.imports).toBe(1);
    state.release!();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(stages).toEqual(["d1.worker_module_import_wait.pending", "d1.worker_module_import_wait.pending"]);
  });
});
