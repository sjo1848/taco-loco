import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminQueryDiagnostic } from "./admin-query-diagnostics";

afterEach(() => vi.restoreAllMocks());

describe("admin query diagnostics", () => {
  it("is disabled outside the exact staging origin or without the flag", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(createAdminQueryDiagnostic(new Request("https://example.test/api/admin/orders/operations"), "operations", true)).toBeUndefined();
    expect(createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/operations"), "operations", false)).toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it("records stage boundaries and response status without logging query values", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/attention", { headers: { "cf-ray": "synthetic-ray" } }), "attention", true)!;
    const privateValue = { email: "private@example.test", token: "private-token" };
    expect(await diagnostic.run("d1.attention_page_query", async () => privateValue)).toBe(privateValue);
    diagnostic.finish(200);
    const output = log.mock.calls.map(([entry]) => String(entry)).join("\n");
    expect(output).toContain("synthetic-ray");
    expect(output).toContain("d1.attention_page_query");
    expect(output).toContain('"status":200');
    expect(output).not.toContain(privateValue.email);
    expect(output).not.toContain(privateValue.token);
  });

  it("preserves the original error for authorization and query error mapping", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const diagnostic = createAdminQueryDiagnostic(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/operations"), "operations", true)!;
    const error = new Error("UNAUTHORIZED");
    await expect(diagnostic.run("auth.require_admin", () => { throw error; })).rejects.toBe(error);
  });
});
