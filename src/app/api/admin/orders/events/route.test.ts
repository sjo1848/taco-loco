import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveAdminSessionHash: vi.fn(async () => "session-hash" as string | null),
  isAdminSessionHashActive: vi.fn(async () => true),
  eventsAfter: vi.fn(async () => []),
}));

vi.mock("@/modules/auth/session", () => ({
  getActiveAdminSessionHash: mocks.getActiveAdminSessionHash,
  isAdminSessionHashActive: mocks.isAdminSessionHashActive,
}));
vi.mock("@/modules/orders/repository", () => ({ orderRepository: { eventsAfter: mocks.eventsAfter } }));

import { GET } from "./route";

beforeEach(() => {
  mocks.getActiveAdminSessionHash.mockResolvedValue("session-hash");
  mocks.isAdminSessionHashActive.mockResolvedValue(true);
  mocks.eventsAfter.mockResolvedValue([]);
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
});
