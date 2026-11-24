export const activeTrackingStorageKey = "taco-loco-active-tracking";
export const recentGuestTrackingKey = "taco-loco-recent-guest-tracking";
export const trackingResumeMaxAgeMs = 24 * 60 * 60 * 1000;

export type TrackingReference = { path: string; orderNumber: number; createdAt: number; ownerId?: string; sessionGeneration?: string | null };
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
      && (record.sessionGeneration == null || typeof record.sessionGeneration === "string")
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

const guestOrdersKey = "taco-loco-guest-orders";
const customerSessionGenerationKey = "taco-loco-customer-session-generation";

export function readCustomerSessionGeneration() {
  try { return window.localStorage.getItem(customerSessionGenerationKey); }
  catch { return null; }
}

export function readGuestOrders(storage = trackingSessionStorage(), now = Date.now()): TrackingReference[] {
  // The shared marker has no token or identity. A tab outside the app may miss the broadcast.
  const generation = readCustomerSessionGeneration();
  try {
    if (generation && storage?.getItem(customerSessionGenerationKey) !== generation) {
      removeTrackingReference(storage, recentGuestTrackingKey);
      removeTrackingReference(storage, guestOrdersKey);
      return [];
    }
  } catch { return []; }
  const legacy = readTrackingReference(storage, recentGuestTrackingKey, now);
  try {
    const records: unknown = JSON.parse(storage?.getItem(guestOrdersKey) ?? "[]");
    const entries = Array.isArray(records) ? records.flatMap((record) => {
      if (!record || typeof record !== "object" || record.ownerId !== undefined || typeof record.path !== "string"
        || typeof record.createdAt !== "number" || record.createdAt > now || now - record.createdAt > trackingResumeMaxAgeMs) return [];
      return createTrackingReference(record.path, record.orderNumber, record.createdAt) ?? [];
    }) : [];
    const orders = [...new Map([...entries, ...(legacy && !legacy.ownerId ? [legacy] : [])].map((entry) => [entry.path, entry])).values()].sort((a, b) => b.createdAt - a.createdAt);
    try {
      if (Array.isArray(records) && entries.length !== records.length) {
        if (entries.length) storage?.setItem(guestOrdersKey, JSON.stringify(entries));
        else storage?.removeItem(guestOrdersKey);
      }
    } catch { /* Expired entries are never returned. */ }
    return orders;
  } catch { return legacy && !legacy.ownerId ? [legacy] : []; }
}

export function rememberGuestOrder(reference: TrackingReference) {
  const storage = trackingSessionStorage();
  try {
    const orders = readGuestOrders(storage).filter((entry) => entry.path !== reference.path);
    const generation = readCustomerSessionGeneration();
    if (generation) storage?.setItem(customerSessionGenerationKey, generation);
    storage?.setItem(guestOrdersKey, JSON.stringify([reference, ...orders]));
    removeTrackingReference(storage, recentGuestTrackingKey);
  } catch { /* Manual tracking remains available. */ }
}

export function clearGuestOrders() {
  const storage = trackingSessionStorage();
  removeTrackingReference(storage, recentGuestTrackingKey);
  removeTrackingReference(storage, guestOrdersKey);
}

// Only a change notification crosses tabs. Each surface revalidates its own session.
const customerSessionChannel = "taco-loco-customer-session";

export function announceCustomerSessionChange() {
  try { window.localStorage.setItem(customerSessionGenerationKey, crypto.randomUUID()); }
  catch { /* The live notification still works when shared storage is unavailable. */ }
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(customerSessionChannel);
  channel.postMessage("changed");
  channel.close();
}

export function onCustomerSessionChange(refresh?: () => void) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(customerSessionChannel);
  channel.addEventListener("message", () => { clearGuestOrders(); refresh?.(); });
  return () => channel.close();
}
