import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), counts: vi.fn(), list: vi.fn() }));
vi.mock("@/modules/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/modules/orders/repository", () => ({ orderRepository: { attentionCounts: mocks.counts, listAttention: mocks.list } }));
import { GET } from "./route";

beforeEach(() => {
  mocks.requireAdmin.mockResolvedValue({ id: "admin-test" });
  mocks.counts.mockResolvedValue({ all: 0, verification: 0, unconfirmed: 0, incidents: 0, buckets: { today: 0, previous: 0 } });
  mocks.list.mockResolvedValue({ orders: [], nextCursor: null });
});
afterEach(() => vi.resetAllMocks());

describe("GET admin attention inbox", () => {
  it("requires admin authorization before reading orders", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHORIZED"));
    const response = await GET(new Request("https://example.test/api/admin/orders/attention"));
    expect(response.status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("rejects unsupported tabs and marks successful data private and uncacheable", async () => {
    expect((await GET(new Request("https://example.test/api/admin/orders/attention?kind=payments"))).status).toBe(400);
    const response = await GET(new Request("https://example.test/api/admin/orders/attention?kind=all"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.list).toHaveBeenCalledWith("all", "today", null);
  });

  it("validates independent buckets and supports count-only synchronization", async () => {
    expect((await GET(new Request("https://example.test/api/admin/orders/attention?bucket=unknown"))).status).toBe(400);
    const response = await GET(new Request("https://example.test/api/admin/orders/attention?kind=verification&countsOnly=1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ counts: { buckets: { today: 0, previous: 0 } } });
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.counts).toHaveBeenCalledWith("verification");
  });

  it("returns a generic server error when the database is unavailable", async () => {
    mocks.counts.mockRejectedValue(new Error("database unavailable"));
    const response = await GET(new Request("https://example.test/api/admin/orders/attention"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ code: "INTERNAL_ERROR" });
  });

  it("correlates a failed staging count stage without exposing repository errors", async () => {
    vi.stubEnv("ADMIN_QUERY_DIAGNOSTICS", "true");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.counts.mockRejectedValueOnce(new Error("private query detail"));
    try {
      const response = await GET(new Request("https://taco-loco-staging-20260913.sjo1848.workers.dev/api/admin/orders/attention?countsOnly=1"));
      expect(response.status).toBe(500);
      expect(response.headers.get("x-tl-admin-query-id")).toBeTruthy();
      expect(await response.json()).toEqual({ code: "INTERNAL_ERROR" });
      const output = log.mock.calls.map(([line]) => String(line)).join("\n");
      expect(output).toContain("repository.attention_counts");
      expect(output).toContain("failed");
      expect(output).not.toContain("private query detail");
    } finally {
      vi.unstubAllEnvs();
      log.mockRestore();
    }
  });
});
