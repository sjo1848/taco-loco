import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "./session";
import { CUSTOMER_SESSION_COOKIE } from "./customer-session";

describe("customer/admin session isolation", () => {
  it("uses separate cookie capabilities", () => {
    expect(CUSTOMER_SESSION_COOKIE).not.toBe(SESSION_COOKIE);
    expect(CUSTOMER_SESSION_COOKIE).toBe("taco_loco_customer_session");
    expect(SESSION_COOKIE).toBe("taco_loco_session");
  });
});
