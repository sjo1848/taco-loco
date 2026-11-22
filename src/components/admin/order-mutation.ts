function isOrderFor(path: string, order: unknown): order is {
  id: string; status: string; verificationStatus: string; paymentStatus: string; refundStatus: string;
  createdAt: string; orderNumber: number; fulfillment: string; totalAmount: number; lines: unknown[];
  noShowAt?: string | null;
} {
  if (typeof order !== "object" || !order) return false;
  const value = order as Record<string, unknown>;
  return value.id === path.split("/").at(-1) &&
    ["RECEIVED", "CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED", "CANCELLED"].includes(String(value.status)) &&
    ["verificationStatus", "paymentStatus", "refundStatus", "createdAt", "fulfillment"].every(key => typeof value[key] === "string") &&
    typeof value.orderNumber === "number" && typeof value.totalAmount === "number" &&
    Array.isArray(value.lines) && value.lines.every(line => line && typeof line.productName === "string" && typeof line.quantity === "number");
}

export function mutationStateFingerprint(order: {
  status: string; verificationStatus: string; paymentStatus: string; refundStatus: string; noShowAt?: string | null;
}) {
  return JSON.stringify([order.status, order.verificationStatus, order.paymentStatus, order.refundStatus, order.noShowAt ?? null]);
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

export async function sendOrderMutation(path: string, payload: Record<string, unknown>, request = fetch) {
  try {
    const response = await request(path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status < 500 && response.status !== 409 && !response.ok) {
      return { kind: "response", response } as const;
    }
    if (response.ok) {
      const body = await response.json();
      const order = body?.order ?? body;
      if (isOrderFor(path, order)) return { kind: "success", order } as const;
    }
  } catch {
    // The write may still be in flight or may already have committed.
  }
  return readPersistedOrder(path, request);
}
