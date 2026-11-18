import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminQueryDiagnostic } from "./admin-query-diagnostics";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("admin query diagnostics", () => {
  it("is disabled outside the exact staging origin or without the flag", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(createAdminQueryDiagnostic(new Request("https://example.test/api/admin/orders/operations"), "operations", true)).toBeUndefined();
    expect(createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/operations"), "operations", false)).toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it("records stage boundaries and response status without logging query values", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/attention", { headers: { "cf-ray": "1234567890abcdef-EZE" } }), "attention", true)!;
    const privateValue = { email: "private@example.test", token: "private-token" };
    expect(await diagnostic.run("d1.attention_page_query", async () => privateValue)).toBe(privateValue);
    diagnostic.finish(200);
    const output = log.mock.calls.map(([entry]) => String(entry)).join("\n");
    expect(output).toContain("1234567890abcdef-EZE");
    expect(output).toContain("d1.attention_page_query");
    expect(output).toContain('"status":200');
    expect(output).not.toContain(privateValue.email);
    expect(output).not.toContain(privateValue.token);
  });

  it("drops an untrusted ray header that could contain private data", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/attention", { headers: { "cf-ray": "email=private@example.test" } }), "attention", true);
    expect(String(log.mock.calls[0]?.[0])).toContain('"ray":"unavailable"');
    expect(String(log.mock.calls[0]?.[0])).not.toContain("private@example.test");
  });

  it("does not log an untrusted version variable", () => {
    vi.stubEnv("TL_APP_VERSION", "private-value");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/auth/session"), "session", true);
    expect(String(log.mock.calls[0]?.[0])).toContain('"version":"unknown"');
    expect(String(log.mock.calls[0]?.[0])).not.toContain("private-value");
  });

  it("preserves the original error for authorization and query error mapping", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/operations"), "operations", true)!;
    const error = new Error("UNAUTHORIZED");
    await expect(diagnostic.run("auth.require_admin", () => { throw error; })).rejects.toBe(error);
  });

  it("does not execute a lazy PrismaPromise during construction", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/auth/session"), "session", true)!;
    let executions = 0;
    const lazyQuery = { then(resolve: (value: string) => void) { executions++; resolve("synthetic-result"); } } as unknown as Promise<string>;
    const query = diagnostic.runSync("d1.session_find_unique_construct", () => lazyQuery);
    expect(executions).toBe(0);
    expect(await diagnostic.run("d1.prisma_promise_await", () => query)).toBe("synthetic-result");
    expect(executions).toBe(1);
    const output = log.mock.calls.map(([entry]) => String(entry)).join("\n");
    expect(output.indexOf('"stage":"d1.session_find_unique_construct","result":"completed"')).toBeLessThan(output.indexOf('"stage":"d1.prisma_promise_await","result":"started"'));
  });
});
