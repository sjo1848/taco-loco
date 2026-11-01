import { describe, expect, it } from "vitest";
import { GUEST_ORDER_CLAIM_WINDOW_MS, isGuestOrderClaimable, isTrackingTokenShape } from "./claim-policy";

describe("guest order claim policy", () => {
  const now = new Date("2026-11-01T00:00:00.000Z");
  it("accepts orders inside the 30-day claim window", () => { expect(isGuestOrderClaimable(new Date(now.getTime() - GUEST_ORDER_CLAIM_WINDOW_MS + 1), now)).toBe(true); });
  it("rejects orders outside the claim window and invalid dates", () => { expect(isGuestOrderClaimable(new Date(now.getTime() - GUEST_ORDER_CLAIM_WINDOW_MS - 1), now)).toBe(false); expect(isGuestOrderClaimable("invalid", now)).toBe(false); });
  it("requires the opaque tracking token shape", () => { expect(isTrackingTokenShape("A".repeat(43))).toBe(true); expect(isTrackingTokenShape("TL-0027")).toBe(false); expect(isTrackingTokenShape("A".repeat(42))).toBe(false); });
});
