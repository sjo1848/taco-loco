"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderStatus = "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED";
const labels: Record<OrderStatus, string> = { RECEIVED: "Recibido", CONFIRMED: "Confirmar pedido", IN_PREPARATION: "Pasar a preparación", READY: "Marcar como listo", DELIVERED: "Marcar entregado", CANCELLED: "Cancelar pedido" };

export function OrderActions({ orderId, transitions }: { orderId: string; transitions: OrderStatus[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function transition(toStatus: OrderStatus) {
    if (toStatus === "CANCELLED" && !reason.trim()) { setError("Indicá el motivo de cancelación."); return; }
    setPending(toStatus); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus, reason: toStatus === "CANCELLED" ? reason : undefined }) });
      if (response.status === 401) { router.push("/admin/login?expired=1"); return; }
      if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.message ?? "No se pudo actualizar el pedido."); setPending(null); return; }
      router.refresh(); setPending(null); setReason("");
    } catch { setError("No hay conexión con el servidor. Revisá la red e intentá de nuevo."); setPending(null); }
  }

  if (transitions.length === 0) return <p className="order-final">Este pedido está cerrado y no admite más cambios.</p>;
  return <section className="order-actions"><h2>Acciones operativas</h2>{transitions.includes("CANCELLED") && <label>Motivo si se cancela<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej.: sin disponibilidad" /></label>}{error && <p className="form-error" role="alert">{error}</p>}<div>{transitions.map((status) => <button className={`admin-button ${status === "CANCELLED" ? "admin-button--danger" : "admin-button--primary"}`} type="button" disabled={pending !== null} onClick={() => transition(status)} key={status}>{pending === status ? "Actualizando…" : labels[status]}</button>)}</div></section>;
}
