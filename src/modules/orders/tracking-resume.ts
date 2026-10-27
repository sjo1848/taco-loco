export const activeTrackingStorageKey = "taco-loco-active-tracking";
export const trackingResumeMaxAgeMs = 24 * 60 * 60 * 1000;

export type ActiveTrackingResume = {
  path: string;
  orderNumber: number;
  createdAt: number;
  handoffPending: boolean;
};

const trackingPathPattern = /^\/pedido\/[A-Za-z0-9_-]{43}$/;

export function isTrackingResumePath(path: string) {
  return trackingPathPattern.test(path);
}

export function createActiveTrackingResume(path: string, orderNumber: number, createdAt = Date.now()): ActiveTrackingResume | null {
  if (!isTrackingResumePath(path) || !Number.isInteger(orderNumber) || orderNumber < 1) return null;
  return { path, orderNumber, createdAt, handoffPending: true };
}

export function isActiveTrackingResume(value: unknown, now = Date.now()): value is ActiveTrackingResume {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ActiveTrackingResume>;
  return isTrackingResumePath(typeof candidate.path === "string" ? candidate.path : "")
    && Number.isInteger(candidate.orderNumber) && (candidate.orderNumber ?? 0) > 0
    && typeof candidate.createdAt === "number"
    && now - candidate.createdAt >= 0
    && now - candidate.createdAt <= trackingResumeMaxAgeMs
    && candidate.handoffPending === true;
}

export function readActiveTrackingResume(storage: Pick<Storage, "getItem" | "removeItem">, now = Date.now()) {
  try {
    const raw = storage.getItem(activeTrackingStorageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isActiveTrackingResume(parsed, now)) return parsed;
    storage.removeItem(activeTrackingStorageKey);
    return null;
  } catch {
    return null;
  }
}

export function writeActiveTrackingResume(storage: Pick<Storage, "setItem">, resume: ActiveTrackingResume) {
  try { storage.setItem(activeTrackingStorageKey, JSON.stringify(resume)); } catch {
    // Tracking recovery is an enhancement; the server-side order remains authoritative.
  }
}

export function clearActiveTrackingResume(storage: Pick<Storage, "removeItem">) {
  try { storage.removeItem(activeTrackingStorageKey); } catch {
    // Storage may be unavailable or blocked by browser policy.
  }
}
