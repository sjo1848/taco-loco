import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ isSameOrigin: vi.fn(), requireCustomer: vi.fn(), updateCustomerDisplayName: vi.fn() }));
vi.mock("@/lib/request-security", () => ({ isSameOrigin: mocked.isSameOrigin }));
vi.mock("@/modules/auth/customer-session", () => ({ requireCustomer: mocked.requireCustomer }));
vi.mock("@/modules/auth/customer-service", () => ({ publicCustomer: (customer: unknown) => customer, updateCustomerDisplayName: mocked.updateCustomerDisplayName }));

import { PATCH } from "./route";

const customer = { id: "customer-1", email: "user@example.test", displayName: "Nombre", avatarUrl: null };
const request = (body: unknown, origin = "https://taco.test") => new Request("https://taco.test/api/customer/profile", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("PATCH /api/customer/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.isSameOrigin.mockReturnValue(true);
    mocked.requireCustomer.mockResolvedValue(customer);
    mocked.updateCustomerDisplayName.mockImplementation(async (_id: string, displayName: string) => ({ ...customer, displayName }));
  });

  it("trims and saves a Unicode display name using the public customer envelope", async () => {
    const response = await PATCH(request({ displayName: "  María 🌮  " }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ customer: { ...customer, displayName: "María 🌮" } });
    expect(mocked.updateCustomerDisplayName).toHaveBeenCalledWith(customer.id, "María 🌮");
  });

  it.each(["   ", "x".repeat(161)])("rejects names outside the trimmed 1–160 Unicode character range", async (displayName) => {
    const response = await PATCH(request({ displayName }));
    expect(response.status).toBe(400);
    expect(mocked.updateCustomerDisplayName).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request before checking the session", async () => {
    mocked.isSameOrigin.mockReturnValue(false);
    const response = await PATCH(request({ displayName: "Nombre" }, "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "CSRF_REJECTED" });
    expect(mocked.requireCustomer).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed Origin headers", async () => {
    expect((await PATCH(new Request("https://taco.test/api/customer/profile", { method: "PATCH", body: "{}" }))).status).toBe(403);
    mocked.isSameOrigin.mockImplementationOnce(() => { throw new TypeError("Invalid URL"); });
    expect((await PATCH(request({ displayName: "Nombre" }, "null"))).status).toBe(403);
    expect(mocked.requireCustomer).not.toHaveBeenCalled();
  });

  it("requires an authenticated customer", async () => {
    mocked.requireCustomer.mockRejectedValue(new Error("CUSTOMER_UNAUTHORIZED"));
    const response = await PATCH(request({ displayName: "Nombre" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects additional fields", async () => {
    const response = await PATCH(request({ displayName: "Nombre", email: "attacker@example.test" }));
    expect(response.status).toBe(400);
    expect(mocked.updateCustomerDisplayName).not.toHaveBeenCalled();
  });
});
