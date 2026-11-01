import { afterEach, describe, expect, it } from "vitest";
import { checkCustomerAuthRateLimit, resetCustomerAuthRateLimitForTests } from "./customer-auth-rate-limit";

describe("customer auth rate limit", () => {
  afterEach(() => resetCustomerAuthRateLimitForTests());

  it("allows bounded attempts and rejects the next one", () => {
    const now = 1_000;
    for (let attempt = 0; attempt < 10; attempt += 1) expect(checkCustomerAuthRateLimit("ip", now).allowed).toBe(true);
    const blocked = checkCustomerAuthRateLimit("ip", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(600);
  });

  it("isolates keys and resets after the window", () => {
    expect(checkCustomerAuthRateLimit("one", 1_000).allowed).toBe(true);
    for (let attempt = 0; attempt < 10; attempt += 1) checkCustomerAuthRateLimit("one", 1_000);
    expect(checkCustomerAuthRateLimit("two", 1_000).allowed).toBe(true);
    expect(checkCustomerAuthRateLimit("one", 601_000).allowed).toBe(true);
  });
});
