import { describe, expect, it } from "vitest";
import { isCustomerIdentityConflict, isCustomerIdentityInfrastructureError, isCustomerIdentityTransient, withBoundedIdentityWrite } from "./customer-service";

describe("customer identity conflict classification", () => {
  it("recovers only recognizable uniqueness conflicts", () => {
    expect(isCustomerIdentityConflict(new Error("P2002"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("D1_CUSTOMER_IDENTITY_CONFLICT"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("UNIQUE constraint failed"))).toBe(true);
    expect(isCustomerIdentityConflict(new Error("network unavailable"))).toBe(false);
    expect(isCustomerIdentityConflict(new Error("CUSTOMER_DISABLED"))).toBe(false);
  });

  it("classifies busy as transient infrastructure failure, not as a duplicate", () => {
    expect(isCustomerIdentityConflict(new Error("SQLITE_BUSY: database is locked"))).toBe(false);
    expect(isCustomerIdentityTransient(new Error("SQLITE_BUSY: database is locked"))).toBe(true);
    expect(isCustomerIdentityInfrastructureError(new Error("D1_CUSTOMER_IDENTITY_FAILED"))).toBe(true);
  });

  it("retries transient identity writes with a bounded attempt count", async () => {
    let calls = 0;
    await expect(withBoundedIdentityWrite(async () => {
      calls += 1;
      if (calls < 3) throw new Error("D1_CUSTOMER_IDENTITY_TRANSIENT");
      return "created";
    })).resolves.toBe("created");
    expect(calls).toBe(3);
  });

  it("does not retry definitive identity conflicts", async () => {
    let calls = 0;
    await expect(withBoundedIdentityWrite(async () => {
      calls += 1;
      throw new Error("D1_CUSTOMER_IDENTITY_CONFLICT");
    })).rejects.toThrow("D1_CUSTOMER_IDENTITY_CONFLICT");
    expect(calls).toBe(1);
  });
});
