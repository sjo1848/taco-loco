import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: "admin" })),
  eventsAfter: vi.fn(async () => []),
}));

vi.mock("@/modules/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/modules/orders/repository", () => ({ orderRepository: { eventsAfter: mocks.eventsAfter } }));

import { GET } from "./route";

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

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
    controller.abort();
    const callsAtDisconnect = mocks.eventsAfter.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mocks.eventsAfter).toHaveBeenCalledTimes(callsAtDisconnect);
    await reader.cancel();
  });
});
