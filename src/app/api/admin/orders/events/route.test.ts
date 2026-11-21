import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveAdminSessionHash: vi.fn(async () => "session-hash" as string | null),
  isAdminSessionHashActive: vi.fn(async () => true),
  eventsAfter: vi.fn(async (): Promise<Array<{ sequence: bigint; orderId: string }>> => []),
  latestEventSequence: vi.fn(async () => BigInt(80)),
  findById: vi.fn(),
  findForLiveEvent: vi.fn(),
}));

vi.mock("@/modules/auth/session", () => ({
  getActiveAdminSessionHash: mocks.getActiveAdminSessionHash,
  isAdminSessionHashActive: mocks.isAdminSessionHashActive,
}));
vi.mock("@/modules/orders/repository", () => ({ orderRepository: { eventsAfter: mocks.eventsAfter, findById: mocks.findById, findForLiveEvent: mocks.findForLiveEvent, latestEventSequence: mocks.latestEventSequence } }));

import { GET } from "./route";

beforeEach(() => {
  mocks.getActiveAdminSessionHash.mockResolvedValue("session-hash");
  mocks.isAdminSessionHashActive.mockResolvedValue(true);
  mocks.eventsAfter.mockResolvedValue([]);
  mocks.latestEventSequence.mockResolvedValue(BigInt(80));
  mocks.findById.mockResolvedValue(null);
  mocks.findForLiveEvent.mockResolvedValue(null);
});
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe("admin order stream", () => {
  it("continues past the former 50-second rotation and stops D1 reads on disconnect", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pollTimes: number[] = [];
    mocks.eventsAfter.mockImplementation(async () => { pollTimes.push(Date.now()); return []; });

    const response = await GET(new Request("https://example.test/api/admin/orders/events?after=0", { signal: controller.signal }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain("retry: 3000");

    await vi.advanceTimersByTimeAsync(60_000);
    expect(pollTimes.some((at) => at >= Date.now() - 4_000)).toBe(true);
    expect(mocks.isAdminSessionHashActive).toHaveBeenCalledWith("session-hash");
    controller.abort();
    const callsAtDisconnect = mocks.eventsAfter.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.eventsAfter).toHaveBeenCalledTimes(callsAtDisconnect);
    await reader.cancel();
  });

  it("ends the stream when the admin session is revoked", async () => {
    vi.useFakeTimers();
    const response = await GET(new Request("https://example.test/api/admin/orders/events"));
    const reader = response.body!.getReader();
    await reader.read();
    mocks.isAdminSessionHashActive.mockResolvedValue(false);
    await vi.advanceTimersByTimeAsync(12_000);
    const readsAtRevocation = mocks.eventsAfter.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(mocks.eventsAfter).toHaveBeenCalledTimes(readsAtRevocation);
    const chunks: string[] = [];
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(new TextDecoder().decode(result.value));
    }
    expect(chunks.join("")).toContain("event: session-expired");
  });

  it("rejects an invalid session before opening a stream", async () => {
    mocks.getActiveAdminSessionHash.mockResolvedValue(null);
    expect((await GET(new Request("https://example.test/api/admin/orders/events"))).status).toBe(401);
    expect(mocks.eventsAfter).not.toHaveBeenCalled();
  });

  it("starts new streams from the current event sequence instead of replaying the full database history", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const response = await GET(new Request("https://example.test/api/admin/orders/events", { signal: controller.signal }));
    const reader = response.body!.getReader();
    await reader.read();
    await vi.waitFor(() => expect(mocks.eventsAfter).toHaveBeenCalledWith(BigInt(80), 100));
    controller.abort();
    await reader.cancel();
  });

  it("publishes the snapshot cursor and replays an order written between cursor capture and stream replay", async () => {
    const controller = new AbortController();
    // The endpoint captures 80 before the pump starts. Sequence 81 is the
    // deterministic write in the snapshot/EventSource connection window.
    mocks.eventsAfter.mockResolvedValueOnce([{ sequence: BigInt(81), orderId: "written-in-gap" }]).mockResolvedValue([]);
    mocks.findForLiveEvent.mockImplementation(async (id: string) => ({ id, orderNumber: 101, status:"RECEIVED", fulfillment:"PICKUP", verificationStatus:"VERIFIED", paymentStatus:"NOT_REQUIRED", refundStatus:"NOT_REQUIRED", source:"PUBLIC_MENU", customerName:null, customerPhone:null, totalAmount:1000, createdAt: new Date("2026-11-14T12:00:00Z"), lines: [{ id: "line-1", orderId: id, productId: null, productName: "Taco", unitPriceAmount: 1000, quantity: 1, modifiersSnapshot: null, note: null, createdAt: new Date("2026-11-14T12:00:00Z") }] }));
    const response = await GET(new Request("https://example.test/api/admin/orders/events", { signal: controller.signal }));
    const reader = response.body!.getReader();
    let contents = "";
    for (let index = 0; index < 4 && !contents.includes('"id":"written-in-gap"'); index++) {
      const chunk = await reader.read();
      if (chunk.done) break;
      contents += new TextDecoder().decode(chunk.value);
    }
    expect(contents).toContain("id: 80\nevent: ready\ndata: {\"cursor\":\"80\"}");
    expect(contents).toContain("id: 81\nevent: order");
    expect(contents).toContain('"unitPriceAmount":1000');
    expect(mocks.findForLiveEvent).toHaveBeenCalledWith("written-in-gap");
    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.eventsAfter).toHaveBeenCalledWith(BigInt(80));
    controller.abort();
    await reader.cancel();
  });

  it("honors Last-Event-ID on reconnect and replays every later event in order", async () => {
    const controller = new AbortController();
    mocks.eventsAfter.mockResolvedValueOnce([
      { sequence: BigInt(81), orderId: "first" },
      { sequence: BigInt(82), orderId: "second" },
    ]).mockResolvedValue([]);
    mocks.findForLiveEvent.mockImplementation(async (id: string) => ({ id, orderNumber: 101, status:"RECEIVED", fulfillment:"PICKUP", verificationStatus:"VERIFIED", paymentStatus:"NOT_REQUIRED", refundStatus:"NOT_REQUIRED", source:"PUBLIC_MENU", customerName:null, customerPhone:null, totalAmount:1000, createdAt: new Date("2026-11-14T12:00:00Z"), lines: [] }));
    const response = await GET(new Request("https://example.test/api/admin/orders/events?after=2", {
      headers: { "Last-Event-ID": "80" }, signal: controller.signal,
    }));
    const reader = response.body!.getReader();
    let contents = "";
    for (let index = 0; index < 4 && !contents.includes('"id":"second"'); index++) {
      const chunk = await reader.read();
      if (chunk.done) break;
      contents += new TextDecoder().decode(chunk.value);
    }
    expect(mocks.eventsAfter).toHaveBeenCalledWith(BigInt(80));
    expect(contents).toContain("id: 80\nevent: ready");
    expect(contents).toContain("id: 81\nevent: order");
    expect(contents).toContain("id: 82\nevent: order");
    expect(contents.indexOf("id: 81")).toBeLessThan(contents.indexOf("id: 82"));
    controller.abort();
    await reader.cancel();
  });

  it("does not expose a replayed order when authorization is revoked during its D1 read", async () => {
    let releaseOrder!: (order: unknown) => void;
    const orderRead = new Promise((resolve) => { releaseOrder = resolve; });
    mocks.eventsAfter.mockResolvedValueOnce([{ sequence: BigInt(1), orderId: "synthetic-order" }]).mockResolvedValue([]);
    mocks.findForLiveEvent.mockReturnValue(orderRead);
    const response = await GET(new Request("https://example.test/api/admin/orders/events?after=0"));
    const reader = response.body!.getReader();
    await reader.read();
    await vi.waitFor(() => expect(mocks.findForLiveEvent).toHaveBeenCalledWith("synthetic-order"));
    mocks.isAdminSessionHashActive.mockResolvedValue(false);
    releaseOrder({ id: "synthetic-order", createdAt: new Date(), lines: [] });
    const chunks: string[] = [];
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(new TextDecoder().decode(result.value));
    }
    expect(chunks.join("")).toContain("event: session-expired");
    expect(chunks.join("")).not.toContain("event: order");
  });
});
