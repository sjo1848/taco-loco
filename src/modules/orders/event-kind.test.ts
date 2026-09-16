import { describe, expect, it } from "vitest";
import { workflowActionEventKind } from "./event-kind";

describe("workflow event kinds", () => {
  it("assigns a structured kind to every public tracking mutation", () => {
    const actions = ["CONFIRM_PAYMENT_AND_ORDER", "EXPIRE_PENDING", "MARK_NO_SHOW", "REPORT_PAYMENT", "REJECT_PAYMENT", "REQUIRE_REFUND", "MARK_REFUNDED"] as const;
    expect(actions.map(workflowActionEventKind)).toEqual([
      "PAYMENT_AND_ORDER_CONFIRMED", "PENDING_EXPIRED", "NO_SHOW_RECORDED", "PAYMENT_REPORTED", "PAYMENT_REJECTED", "REFUND_REQUIRED", "REFUNDED",
    ]);
  });
});
