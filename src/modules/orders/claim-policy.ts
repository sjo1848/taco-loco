export const GUEST_ORDER_CLAIM_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isGuestOrderClaimable(createdAt: Date | string, now = new Date()) {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return !Number.isNaN(created.getTime()) && created.getTime() >= now.getTime() - GUEST_ORDER_CLAIM_WINDOW_MS;
}

export function isTrackingTokenShape(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
