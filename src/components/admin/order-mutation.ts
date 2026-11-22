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

function clearMutation(path: string, payload: Record<string, unknown>) {
  if (unresolved.get(path) === payload) unresolved.delete(path);
}

const progress = ["RECEIVED", "CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED", "CANCELLED"];
export function precedesOrderStatus(previous: string, next: string) {
  if (["DELIVERED", "CANCELLED"].includes(previous)) return false;
  const rank = progress.indexOf(previous);
  return rank >= 0 && progress.indexOf(next) > rank;
}

export function hasUnresolvedMutation(path: string) {
  return unresolved.has(path);
}

function isReflected(payload: Record<string, unknown>, order: {
  status: string; paymentStatus: string; refundStatus: string; verificationStatus: string; noShowAt?: string | null;
}) {
  const action = payload.action;
  switch (action) {
    case "CONFIRM_PAYMENT_AND_ORDER": return order.paymentStatus === "CONFIRMED";
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
  const pending = unresolved.get(path);
  const result = await readPersistedOrder(path, request);
  if (pending && result.kind === "persisted" && isReflected(pending, result.order)) clearMutation(path, pending);
  return result;
}

export async function sendOrderMutation(path: string, payload: Record<string, unknown>, request = fetch) {
  if (unresolved.has(path)) return reconcileOrderMutation(path, request);
  unresolved.set(path, payload);
  try {
    const response = await request(path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 409) {
      const rejection = await response.clone().json().catch(() => null);
      if (!rejection || typeof rejection.code !== "string" || rejection.code === "ORDER_CHANGED") {
        return reconcileOrderMutation(path, request);
      }
      clearMutation(path, payload);
      if (payload.action) return { kind: "response", response } as const;
      return readPersistedOrder(path, request);
    }
    if (response.status < 500 && !response.ok) {
      clearMutation(path, payload);
      return { kind: "response", response } as const;
    }
    if (response.ok) {
      const body = await response.json();
      const order = body?.order ?? body;
      if (isOrderFor(path, order)) {
        clearMutation(path, payload);
        return { kind: "success", order } as const;
      }
    }
  } catch {
    // The write may still be in flight or may already have committed.
  }
  return reconcileOrderMutation(path, request);
}
