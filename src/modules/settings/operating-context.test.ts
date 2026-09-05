import { describe, expect, it } from "vitest";
import { getOperatingContext } from "@/modules/settings/operating-context";

describe("getOperatingContext", () => {
  it("uses manual acceptance when no weekly schedule is configured", () => {
    expect(getOperatingContext({ acceptingOrders: true, statusMessage: null, weeklySchedule: [] }).status).toBe("OPEN");
    expect(getOperatingContext({ acceptingOrders: false, statusMessage: "Volvemos pronto", weeklySchedule: [] })).toMatchObject({ status: "PAUSED", isOpen: false, detail: "Volvemos pronto" });
  });

  it("closes automatically outside an enabled schedule", () => {
    const weeklySchedule = Array.from({ length: 7 }, (_, day) => ({ day, enabled: day === 1, open: "18:00", close: "23:30" }));
    const context = getOperatingContext({ acceptingOrders: true, statusMessage: null, weeklySchedule }, new Date("2026-08-11T03:00:00.000Z"));
    expect(context.status).toBe("CLOSED");
    expect(context.isOpen).toBe(false);
  });
});
