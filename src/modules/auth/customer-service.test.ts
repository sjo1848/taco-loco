import { describe, expect, it } from "vitest";
import { isCustomerIdentityConflict } from "./customer-service";

describe("customer identity conflict classification", () => {
  it("recovers only recognizable uniqueness conflicts", () => {
    expect(isCustomerIdentityConflict(new Error("P2002"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("D1_CUSTOMER_IDENTITY_CONFLICT"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("UNIQUE constraint failed"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("network unavailable"))).toBe(false);
    expect(isCustomerIdentityConflict(new Error("CUSTOMER_DISABLED"))).toBe(false);
  });
});
