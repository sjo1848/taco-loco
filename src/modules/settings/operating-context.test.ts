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
});
