import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  requireCustomer: vi.fn(),
  isSameOrigin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { order: { findUnique: mocked.findUnique, updateMany: mocked.updateMany } } }));
vi.mock("@/modules/auth/customer-session", () => ({ requireCustomer: mocked.requireCustomer }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocked.isSameOrigin }));

import { POST } from "./route";

const token = "A".repeat(43);
const order = { id: "order-1", customerId: null, createdAt: new Date("2026-11-01T00:00:00.000Z") };
const customer = { id: "customer-1" };

function request(body: unknown = { confirm: true }, origin = "https://taco.test") {
  return new Request(`https://taco.test/api/customer/orders/${token}/claim`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("guest order claim route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocked.isSameOrigin.mockReturnValue(true); mocked.requireCustomer.mockResolvedValue(customer); mocked.findUnique.mockResolvedValue(order); });

  it("requires same-origin and an authenticated customer", async () => {
    mocked.isSameOrigin.mockReturnValue(false);
    expect((await POST(request(), { params: Promise.resolve({ token }) })).status).toBe(403);
    mocked.isSameOrigin.mockReturnValue(true);
    mocked.requireCustomer.mockRejectedValue(new Error("CUSTOMER_UNAUTHORIZED"));
    expect((await POST(request(), { params: Promise.resolve({ token }) })).status).toBe(401);
  });

  it("rejects TL references and missing explicit confirmation", async () => {
    expect((await POST(request(), { params: Promise.resolve({ token: "TL-0027" }) })).status).toBe(404);
    expect((await POST(request({ confirm: false }), { params: Promise.resolve({ token }) })).status).toBe(400);
    expect(mocked.findUnique).not.toHaveBeenCalled();
  });

  it("claims atomically and makes a same-customer retry idempotent", async () => {
    mocked.updateMany.mockResolvedValueOnce({ count: 1 });
    const first = await POST(request(), { params: Promise.resolve({ token }) });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ claimed: true, reused: false });
    mocked.findUnique.mockResolvedValueOnce({ ...order, customerId: customer.id });
    const retry = await POST(request(), { params: Promise.resolve({ token }) });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ claimed: true, reused: true });
    expect(mocked.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ customerId: null }) }));
  });

  it("returns a generic conflict for an existing owner and for a losing race", async () => {
    mocked.findUnique.mockResolvedValueOnce({ ...order, customerId: "other-customer" });
    expect((await POST(request(), { params: Promise.resolve({ token }) })).status).toBe(409);
    mocked.findUnique.mockResolvedValueOnce(order).mockResolvedValueOnce({ customerId: "other-customer" });
    mocked.updateMany.mockResolvedValueOnce({ count: 0 });
    const response = await POST(request(), { params: Promise.resolve({ token }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code: "ORDER_CLAIM_UNAVAILABLE" });
  });
});
