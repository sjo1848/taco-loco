import { describe, expect, it } from "vitest";
import { getOperatingContext } from "./operating-context";

const weeklySchedule = Array.from({ length: 7 }, (_, day) => ({ day, enabled: true, open: "10:00", close: "22:00" }));

describe("operating context", () => {
  it("closes after the Buenos Aires business hours even if the custom message claims open", () => {
    const context = getOperatingContext({ acceptingOrders: true, statusMessage: "Staging abierto", weeklySchedule }, new Date("2026-11-07T02:37:00Z"));
    expect(context.isOpen).toBe(false);
    expect(context.label).toBe("Fuera de horario");
    expect(context.detail).toContain("No estamos tomando pedidos");
    expect(context.detail).not.toContain("Staging abierto");
  });

  it("keeps the custom message while the business is open", () => {
    const context = getOperatingContext({ acceptingOrders: true, statusMessage: "Estamos atendiendo", weeklySchedule }, new Date("2026-11-06T18:00:00Z"));
    expect(context.isOpen).toBe(true);
    expect(context.detail).toBe("Estamos atendiendo");
  });

  it("keeps a Friday shift open across midnight and closes it at Saturday 02:00", () => {
    const schedule = weeklySchedule.map((entry) => entry.day === 5 ? { ...entry, close: "02:00" } : entry);
    const settings = { acceptingOrders: true, statusMessage: null, weeklySchedule: schedule };
    expect(getOperatingContext(settings, new Date("2026-11-07T02:58:00Z")).isOpen).toBe(true); // Friday 23:58
    expect(getOperatingContext(settings, new Date("2026-11-07T04:00:00Z")).isOpen).toBe(true); // Saturday 01:00
    expect(getOperatingContext(settings, new Date("2026-11-07T05:00:00Z")).isOpen).toBe(true); // Saturday 02:00
    expect(getOperatingContext(settings, new Date("2026-11-07T05:01:00Z")).isOpen).toBe(false);
  });

  it("honors the previous shift even if the new day is disabled", () => {
    const schedule = weeklySchedule.map((entry) => entry.day === 5 ? { ...entry, close: "02:00" } : entry.day === 6 ? { ...entry, enabled: false } : entry);
    const settings = { acceptingOrders: true, statusMessage: null, weeklySchedule: schedule };
    expect(getOperatingContext(settings, new Date("2026-11-07T04:00:00Z")).isOpen).toBe(true);
    expect(getOperatingContext(settings, new Date("2026-11-07T05:01:00Z")).isOpen).toBe(false);
  });
});
