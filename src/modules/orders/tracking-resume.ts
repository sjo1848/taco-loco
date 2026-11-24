export const activeTrackingStorageKey = "taco-loco-active-tracking";
export const recentGuestTrackingKey = "taco-loco-recent-guest-tracking";
export const trackingResumeMaxAgeMs = 24 * 60 * 60 * 1000;
export const trackingChangedEvent = "taco-loco:tracking-changed";

export type TrackingReference = { path: string; orderNumber: number; createdAt: number; ownerId?: string };
const trackingPathPattern = /^\/pedido\/[A-Za-z0-9_-]{43}$/;

export function isTrackingResumePath(path: string) {
  return trackingPathPattern.test(path);
}

export function createTrackingReference(path: string, orderNumber: number, createdAt = Date.now()): TrackingReference | null {
  if (!isTrackingResumePath(path) || !Number.isInteger(orderNumber) || orderNumber < 1) return null;
  return { path, orderNumber, createdAt };
}

export function readTrackingReference(storage: Storage | undefined, key: string, now = Date.now()): TrackingReference | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<TrackingReference> | null;
    if (record && typeof record.path === "string" && isTrackingResumePath(record.path)
      && Number.isInteger(record.orderNumber) && (record.orderNumber ?? 0) > 0
      && (record.ownerId === undefined || typeof record.ownerId === "string")
      && typeof record.createdAt === "number" && now - record.createdAt >= 0
      && now - record.createdAt <= trackingResumeMaxAgeMs) return record as TrackingReference;
  } catch { /* Ignore unavailable or invalid browser storage. */ }
  removeTrackingReference(storage, key);
  return null;
}

export function writeTrackingReference(storage: Storage | undefined, key: string, reference: TrackingReference) {
  try { storage?.setItem(key, JSON.stringify(reference)); } catch { /* The server-side order remains available. */ }
}

export function removeTrackingReference(storage: Storage | undefined, key: string) {
  try { storage?.removeItem(key); } catch { /* Storage may be blocked. */ }
}

export function trackingSessionStorage() {
  try { return window.sessionStorage; } catch { return undefined; }
}

export function retireLegacyTrackingStorage() {
  try {
    window.localStorage.removeItem(activeTrackingStorageKey);
    window.sessionStorage.removeItem("taco-loco-completed-order");
  } catch { /* Legacy state is no longer read. */ }
}

export function finishTrackingHandoff(path?: string) {
  const storage = trackingSessionStorage();
  if (!path || readTrackingReference(storage, activeTrackingStorageKey)?.path === path) {
    removeTrackingReference(storage, activeTrackingStorageKey);
  }
}
