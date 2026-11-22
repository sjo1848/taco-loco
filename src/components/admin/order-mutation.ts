function isOrderFor(path: string, order: unknown): order is {
  id: string; status: string; verificationStatus: string; paymentStatus: string; refundStatus: string;
  createdAt: string; orderNumber: number; fulfillment: string; totalAmount: number; lines: unknown[];
  noShowAt?: string | null; updatedAt?: string;
} {
  if (typeof order !== "object" || !order) return false;
  const value = order as Record<string, unknown>;
  return value.id === path.split("/").at(-1) &&
    ["RECEIVED", "CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED", "CANCELLED"].includes(typeof value.status === "string" ? value.status : "") &&
    ["verificationStatus", "paymentStatus", "refundStatus", "createdAt", "fulfillment"].every(key => typeof value[key] === "string") &&
    typeof value.orderNumber === "number" && typeof value.totalAmount === "number" &&
    (value.customerName == null || typeof value.customerName === "string") &&
    (value.notes == null || typeof value.notes === "string") &&
    Array.isArray(value.lines) && value.lines.every(line => line && typeof line.productName === "string" && typeof line.quantity === "number");
}

// A lost response cannot tell us whether the mutation committed.
export async function readPersistedOrder(path: string, request = fetch) {
  try {
    const response = await request(path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 401) return { kind: "expired" } as const;
    if (!response.ok) return { kind: "unknown" } as const;
    const order = await response.json();
    if (!isOrderFor(path, order)) return { kind: "unknown" } as const;
    return { kind: "persisted", order } as const;
  } catch {
    return { kind: "unknown" } as const;
  }
}

const unresolved = new Map<string, Record<string, unknown>>();

const storagePrefix = "tl-admin-unresolved:";

function getUnresolved(path: string): Record<string, unknown> | undefined {
  const current = unresolved.get(path);
  if (current) return current;
  try {
    const stored = sessionStorage.getItem(storagePrefix + path);
    if (stored) {
      const value = JSON.parse(stored);
      if (value && (typeof value.action === "string" || typeof value.toStatus === "string")) {
        unresolved.set(path, value);
        return value;
      }
    }
  } catch { /* Requests remain guarded in memory if storage is unavailable. */ }
  return undefined;
}

function setUnresolved(path: string, payload: Record<string, unknown>) {
  const marker = { action: payload.action, toStatus: payload.toStatus };
  unresolved.set(path, marker);
  try { sessionStorage.setItem(storagePrefix + path, JSON.stringify(marker)); } catch { /* memory fallback */ }
  return marker;
}

function clearMutation(path: string, marker: Record<string, unknown>) {
  if (getUnresolved(path) !== marker) return;
  unresolved.delete(path);
  try { sessionStorage.removeItem(storagePrefix + path); } catch { /* memory fallback */ }
}

const progress = ["RECEIVED", "CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED", "CANCELLED"];
export function precedesOrderStatus(previous: string, next: string) {
  if (["DELIVERED", "CANCELLED"].includes(previous)) return false;
  const rank = progress.indexOf(previous);
  return rank >= 0 && progress.indexOf(next) > rank;
}

export function hasUnresolvedMutation(path: string) {
  return Boolean(getUnresolved(path));
}

function isReflected(payload: Record<string, unknown>, order: {
  status: string; paymentStatus: string; refundStatus: string; verificationStatus: string; noShowAt?: string | null;
}) {
  const action = payload.action;
  switch (action) {
    case "CONFIRM_PAYMENT_AND_ORDER": return order.status !== "RECEIVED" || order.verificationStatus !== "PENDING" || !["PENDING", "REPORTED"].includes(order.paymentStatus);
    case "EXPIRE_PENDING": return order.verificationStatus === "EXPIRED";
    case "MARK_NO_SHOW": return Boolean(order.noShowAt);
    case "REPORT_PAYMENT": return ["REPORTED", "CONFIRMED", "REJECTED"].includes(order.paymentStatus);
    case "REJECT_PAYMENT": return order.paymentStatus === "REJECTED";
    case "REQUIRE_REFUND": return ["REQUIRED", "REFUNDED"].includes(order.refundStatus);
    case "MARK_REFUNDED": return order.refundStatus === "REFUNDED";
    default: return order.status === payload.toStatus || (typeof payload.toStatus === "string" && precedesOrderStatus(payload.toStatus, order.status));
  }
}

export async function reconcileOrderMutation(path: string, request = fetch) {
  const pending = getUnresolved(path);
  const result = await readPersistedOrder(path, request);
  if (pending && result.kind === "persisted" && (isReflected(pending, result.order) || (typeof pending.toStatus === "string" && ["CANCELLED", "DELIVERED"].includes(result.order.status)))) clearMutation(path, pending);
  return result;
}

// The operator can unlock after a fresh authoritative read. This does not write.
export async function checkBeforeManualRetry(path: string, request = fetch) {
  const marker = getUnresolved(path);
  const result = await readPersistedOrder(path, request);
  if (marker && result.kind === "persisted") clearMutation(path, marker);
  return result;
}

export async function sendOrderMutation(path: string, payload: Record<string, unknown>, request = fetch) {
  if (getUnresolved(path)) return reconcileOrderMutation(path, request);
  const marker = setUnresolved(path, payload);
  try {
    const response = await request(path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 409) {
      const rejection = await response.clone().json().catch(() => null);
      if (!rejection || typeof rejection.code !== "string") {
        return reconcileOrderMutation(path, request);
      }
      clearMutation(path, marker);
      if (payload.action && rejection.code !== "ORDER_CHANGED") return { kind: "response", response } as const;
      return readPersistedOrder(path, request);
    }
    if (response.status < 500 && !response.ok) {
      clearMutation(path, marker);
      return { kind: "response", response } as const;
    }
    if (response.ok) {
      const body = await response.json();
      const order = body?.order ?? body;
      if (isOrderFor(path, order)) {
        clearMutation(path, marker);
        return { kind: "success", order } as const;
      }
    }
  } catch {
    // The write may still be in flight or may already have committed.
  }
  return reconcileOrderMutation(path, request);
}
