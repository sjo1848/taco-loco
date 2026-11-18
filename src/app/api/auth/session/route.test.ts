import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentAdmin: vi.fn() }));
vi.mock("@/modules/auth/session", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
import { GET } from "./route";

const origin = "https://taco-loco-staging-20260913.sjo1848.workers.dev";
beforeEach(() => mocks.getCurrentAdmin.mockResolvedValue(null));
afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("GET admin session diagnostics", () => {
  it("keeps the unauthenticated response and only emits staging diagnostics when enabled", async () => {
    vi.stubEnv("ADMIN_QUERY_DIAGNOSTICS", "true");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const response = await GET(new Request(`${origin}/api/auth/session`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(response.headers.get("x-tl-admin-query-id")).toBeTruthy();
    expect(log.mock.calls.map(([entry]) => String(entry)).join("\n")).toContain("auth.get_current_admin");
    const other = await GET(new Request("https://example.test/api/auth/session"));
    expect(other.headers.get("x-tl-admin-query-id")).toBeNull();
  });

  it("preserves the authenticated response and passes the diagnostic into shared auth", async () => {
    vi.stubEnv("ADMIN_QUERY_DIAGNOSTICS", "true");
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.getCurrentAdmin.mockResolvedValueOnce({ id: "synthetic-admin", email: "synthetic@example.test" });
    const response = await GET(new Request(`${origin}/api/auth/session`));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-tl-admin-query-id")).toBeTruthy();
    expect(await response.json()).toEqual({ authenticated: true, user: { id: "synthetic-admin", email: "synthetic@example.test" } });
    expect(mocks.getCurrentAdmin.mock.calls.some(([diagnostic]) => typeof diagnostic?.run === "function")).toBe(true);
  });

  it("logs the failed stage without leaking a database error", async () => {
    vi.stubEnv("ADMIN_QUERY_DIAGNOSTICS", "true");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.getCurrentAdmin.mockRejectedValueOnce(new Error("private database detail"));
    await expect(GET(new Request(`${origin}/api/auth/session`))).rejects.toThrow("private database detail");
    const output = log.mock.calls.map(([entry]) => String(entry)).join("\n");
    expect(output).toContain('"result":"failed"');
    expect(output).not.toContain("private database detail");
  });
});
