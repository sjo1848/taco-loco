import { describe, expect, it } from "vitest";
import { activeTrackingStorageKey, createTrackingReference, readTrackingReference, recentGuestTrackingKey, removeTrackingReference, trackingResumeMaxAgeMs, writeTrackingReference } from "./tracking-resume";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const validPath = "/pedido/1234567890123456789012345678901234567890123";

describe("tracking handoff and guest navigation", () => {
  it("consumes the handoff without removing the independent recent-order reference", () => {
    const storage = memoryStorage();
    const reference = createTrackingReference(validPath, 27, 1000)!;
    writeTrackingReference(storage, activeTrackingStorageKey, reference);
    writeTrackingReference(storage, recentGuestTrackingKey, reference);
    removeTrackingReference(storage, activeTrackingStorageKey);
    expect(readTrackingReference(storage, activeTrackingStorageKey, 1000)).toBeNull();
    expect(readTrackingReference(storage, recentGuestTrackingKey, 1000)).toEqual(reference);
  });

  it("rejects unsafe paths, expires stale records and ignores unavailable storage", () => {
    const storage = memoryStorage();
    expect(createTrackingReference("/pedido/TL-0027", 27, 1000)).toBeNull();
    writeTrackingReference(storage, recentGuestTrackingKey, createTrackingReference(validPath, 27, 1000)!);
    expect(readTrackingReference(storage, recentGuestTrackingKey, 1001 + trackingResumeMaxAgeMs)).toBeNull();
    expect(storage.length).toBe(0);
    expect(readTrackingReference(undefined, recentGuestTrackingKey)).toBeNull();
  });
});
