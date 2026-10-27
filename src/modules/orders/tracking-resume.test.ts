import { describe, expect, it } from "vitest";
import { activeTrackingStorageKey, clearActiveTrackingResume, createActiveTrackingResume, isActiveTrackingResume, readActiveTrackingResume, trackingResumeMaxAgeMs, writeActiveTrackingResume } from "./tracking-resume";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const validPath = "/pedido/1234567890123456789012345678901234567890123";

describe("active tracking return state", () => {
  it("accepts only an opaque tracking path and keeps it pending", () => {
    expect(createActiveTrackingResume(validPath, 27, 1000)).toEqual({ path: validPath, orderNumber: 27, createdAt: 1000, handoffPending: true });
    expect(createActiveTrackingResume("/pedido/TL-0027", 27, 1000)).toBeNull();
  });

  it("round-trips through local storage without exposing a separate credential", () => {
    const storage = memoryStorage();
    const resume = createActiveTrackingResume(validPath, 27, 1000);
    expect(resume).not.toBeNull();
    writeActiveTrackingResume(storage, resume!);
    expect(storage.getItem(activeTrackingStorageKey)).toContain(validPath);
    expect(readActiveTrackingResume(storage, 1000)).toEqual(resume);
    clearActiveTrackingResume(storage);
    expect(readActiveTrackingResume(storage, 1000)).toBeNull();
  });

  it("expires stale or consumed records", () => {
    const resume = createActiveTrackingResume(validPath, 27, 1000)!;
    expect(isActiveTrackingResume(resume, 1000 + trackingResumeMaxAgeMs)).toBe(true);
    expect(isActiveTrackingResume(resume, 1001 + trackingResumeMaxAgeMs)).toBe(false);
    expect(isActiveTrackingResume({ ...resume, handoffPending: false }, 1000)).toBe(false);
  });
});
