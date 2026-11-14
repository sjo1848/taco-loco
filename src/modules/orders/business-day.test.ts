import { describe, expect, it } from "vitest";
import { businessDateKey, businessDayStart, millisecondsUntilNextBusinessMidnight } from "./business-day";

describe("Buenos Aires business-day boundaries", () => {
  it("keeps the day stable immediately before midnight and advances at midnight", () => {
    expect(businessDateKey(new Date("2026-11-14T02:59:59.999Z"))).toBe("2026-11-13");
    expect(businessDateKey(new Date("2026-11-14T03:00:00.001Z"))).toBe("2026-11-14");
  });

  it("computes the local day start and a bounded next-midnight timer", () => {
    expect(businessDayStart(new Date("2026-11-14T16:00:00.000Z")).toISOString()).toBe("2026-11-14T03:00:00.000Z");
    expect(millisecondsUntilNextBusinessMidnight(new Date("2026-11-14T02:59:59.000Z"))).toBeGreaterThan(1_000);
    expect(millisecondsUntilNextBusinessMidnight(new Date("2026-11-14T03:00:00.000Z"))).toBeGreaterThan(23 * 60 * 60 * 1_000);
  });
});
