import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthLoginDiagnostic, isStagingAuthDiagnosticsEnabled } from "@/modules/auth/login-diagnostics";

describe("admin login diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs stage metadata only, never operation values or auth material", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const request = new Request("https://staging.example.test/api/auth/login", {
      headers: { "cf-ray": "synthetic-ray-id" },
    });
    const { diagnostic } = createAuthLoginDiagnostic(request, true);
    const email = "synthetic-admin@example.test";
    const password = "synthetic-password-never-log";
    const hash = "synthetic-password-hash-never-log";
    const cookie = "synthetic-cookie-never-log";

    await diagnostic!.run("test.sensitive_stage", async () => ({ email, password, hash, cookie }));
    diagnostic!.finish("completed", 200);

    const logs = info.mock.calls.map(([entry]) => String(entry)).join("\n");
    for (const secret of [email, password, hash, cookie]) expect(logs).not.toContain(secret);
    expect(logs).toContain("synthetic-ray-id");
    expect(logs).toContain("test.sensitive_stage");
    expect(logs).toContain("durationMs");
  });

  it("does not create diagnostic IDs or emit logs when disabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { id, diagnostic } = createAuthLoginDiagnostic(new Request("https://staging.example.test/api/auth/login"), false);
    expect(id).toBeUndefined();
    expect(diagnostic).toBeUndefined();
    expect(info).not.toHaveBeenCalled();
  });

  it("cannot enable diagnostic logging outside the exact staging origin", () => {
    expect(isStagingAuthDiagnosticsEnabled(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/auth/login"), true)).toBe(true);
    expect(isStagingAuthDiagnosticsEnabled(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/auth/login"), false)).toBe(false);
    expect(isStagingAuthDiagnosticsEnabled(new Request("https://tacoloco.com/api/auth/login"), true)).toBe(false);
  });
});
