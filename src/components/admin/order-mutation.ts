// A lost response cannot tell us whether the mutation committed.
export async function readPersistedOrder(path: string, request = fetch) {
  try {
    const response = await request(path, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (response.status === 401) return { kind: "expired" } as const;
    if (!response.ok) return { kind: "unknown" } as const;
    const order = await response.json();
    if (!order || typeof order.status !== "string") return { kind: "unknown" } as const;
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
      if (order && typeof order.status === "string") return { kind: "success", order } as const;
    }
  } catch {
    // The write may still be in flight or may already have committed.
  }
  return readPersistedOrder(path, request);
}
