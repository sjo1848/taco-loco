import { describe, expect, it } from "vitest";
import { initialTrackingPollDelay, maxTrackingPollDelay, nextTrackingPollDelay, terminalTrackingStages } from "./tracking-polling";

describe("tracking polling policy", () => {
  it("backs off to 30 seconds and resets after success", () => {
    expect(nextTrackingPollDelay(initialTrackingPollDelay, false)).toBe(10000);
    expect(nextTrackingPollDelay(20000, false)).toBe(maxTrackingPollDelay);
    expect(nextTrackingPollDelay(maxTrackingPollDelay, false)).toBe(maxTrackingPollDelay);
    expect(nextTrackingPollDelay(maxTrackingPollDelay, true)).toBe(initialTrackingPollDelay);
  });

  it("stops for terminal stages", () => {
    expect(terminalTrackingStages).toEqual(["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"]);
  });
});
