import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), listHistory: vi.fn(), createManualOrder: vi.fn() }));
vi.mock("@/modules/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/modules/orders/repository", () => ({ orderRepository: { listHistory: mocks.listHistory } }));
vi.mock("@/modules/orders/service", () => ({ createManualOrder: mocks.createManualOrder }));
import { GET } from "./route";

beforeEach(() => {
  mocks.requireAdmin.mockResolvedValue({ id: "admin-test" });
  mocks.listHistory.mockResolvedValue({ orders: [], hasMore: false, nextCursor: null });
});
afterEach(() => vi.resetAllMocks());

describe("GET legacy admin orders read endpoint", () => {
  it("requires an admin and uses private cursor pagination", async () => {
    const response = await GET(new Request("https://example.test/api/admin/orders?status=READY&q=TL-41"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ orders: [], hasMore: false, nextCursor: null });
    expect(mocks.listHistory).toHaveBeenCalledWith(expect.objectContaining({ status: "READY", query: "TL-41", cursor: null }));
  });

  it("does not return an unpaginated legacy list after more than 100 rows", async () => {
    const cursor = { createdAt: "2026-11-14T12:00:00.000Z", id: "b4fa38aa-1c2e-4f31-8d54-19e8398ff723" };
    mocks.listHistory.mockResolvedValue({ orders: Array.from({ length: 30 }, (_, index) => ({ id: `order-${index}` })), hasMore: true, nextCursor: cursor });
    const response = await GET(new Request("https://example.test/api/admin/orders?cursor=eyJjcmVhdGVkQXQiOiIyMDI2LTExLTE0VDEyOjAwOjAwLjAwMFoiLCJpZCI6ImI0ZmEzOGFhLTFjMmUtNGYzMS04ZDU0LTE5ZTgzOThmZjcyMyJ9"));
    const body = await response.json();
    expect(body.orders).toHaveLength(30);
    expect(body.hasMore).toBe(true);
    expect(body.nextCursor).toBeTruthy();
    expect(mocks.listHistory).toHaveBeenCalledWith(expect.objectContaining({ cursor: { createdAt: new Date(cursor.createdAt), id: cursor.id } }));
  });

  it("returns unauthorized before querying when no admin session exists", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("UNAUTHORIZED"));
    const response = await GET(new Request("https://example.test/api/admin/orders"));
    expect(response.status).toBe(401);
    expect(mocks.listHistory).not.toHaveBeenCalled();
  });
});
