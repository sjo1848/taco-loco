"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrderStatus = "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED";
const labels: Record<OrderStatus, string> = { RECEIVED: "Recibido", CONFIRMED: "Confirmar pedido", IN_PREPARATION: "Pasar a preparación", READY: "Marcar como listo", DELIVERED: "Marcar entregado", CANCELLED: "Cancelar pedido" };

export function OrderActions({ orderId, transitions, fulfillment, verificationStatus = "VERIFIED", paymentStatus = "NOT_REQUIRED", refundStatus = "NOT_REQUIRED", status = "RECEIVED" }: { orderId: string; transitions: OrderStatus[]; fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY"; verificationStatus?: string; paymentStatus?: string; refundStatus?: string; status?: OrderStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [workflow, setWorkflow] = useState({ status, verificationStatus, paymentStatus, refundStatus });
  useEffect(() => { fetch(`/api/admin/orders/${orderId}`).then((response) => response.ok ? response.json() : null).then((order) => { if (order) setWorkflow({ status: order.status, verificationStatus: order.verificationStatus, paymentStatus: order.paymentStatus, refundStatus: order.refundStatus }); }).catch(() => undefined); }, [orderId]);

  async function transition(toStatus: OrderStatus) {
    if (toStatus === "CANCELLED" && !reason.trim()) { setError("Indicá el motivo de cancelación."); return; }
    setPending(toStatus); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus, confirmPayment: fulfillment === "DELIVERY" && toStatus === "CONFIRMED", reason: toStatus === "CANCELLED" ? reason : undefined }) });
      if (response.status === 401) { router.push("/admin/login?expired=1"); return; }
      if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.message ?? "No se pudo actualizar el pedido."); setPending(null); return; }
      router.refresh(); setPending(null); setReason("");
    } catch { setError("No hay conexión con el servidor. Revisá la red e intentá de nuevo."); setPending(null); }
  }

  async function applyAction(action: "EXPIRE_PENDING" | "MARK_NO_SHOW" | "REPORT_PAYMENT" | "REJECT_PAYMENT" | "REQUIRE_REFUND" | "MARK_REFUNDED") {
    setPending("CANCELLED"); setError("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.message ?? "No se pudo aplicar la acción."); setPending(null); return; }
      router.refresh(); setPending(null);
    } catch { setError("No hay conexión con el servidor."); setPending(null); }
  }

  if (false) return <p className="order-final">Este pedido está cerrado y no admite más cambios.</p>;
  return <section className="order-actions"><h2>Acciones operativas</h2>{transitions.includes("CANCELLED") && <label>Motivo si se cancela<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej.: sin disponibilidad" /></label>}{error && <p className="form-error" role="alert">{error}</p>}<div>{transitions.map((nextStatus) => <button className={`admin-button ${nextStatus === "CANCELLED" ? "admin-button--danger" : "admin-button--primary"}`} type="button" disabled={pending !== null} onClick={() => transition(nextStatus)} key={nextStatus}>{pending === nextStatus ? "Actualizando…" : nextStatus === "CONFIRMED" && fulfillment === "DELIVERY" ? "Confirmar pago y pedido" : labels[nextStatus]}</button>)}{workflow.verificationStatus === "PENDING" && <button className="admin-button admin-button--secondary" type="button" disabled={pending !== null} onClick={() => applyAction("EXPIRE_PENDING")}>Cerrar como pendiente vencido</button>}{fulfillment === "PICKUP" && ["READY", "DELIVERED"].includes(workflow.status) && <button className="admin-button admin-button--secondary" type="button" disabled={pending !== null} onClick={() => applyAction("MARK_NO_SHOW")}>Registrar no-show</button>}{fulfillment === "DELIVERY" && workflow.status === "CANCELLED" && workflow.paymentStatus === "CONFIRMED" && workflow.refundStatus === "NOT_REQUIRED" && <button className="admin-button admin-button--secondary" type="button" disabled={pending !== null} onClick={() => applyAction("REQUIRE_REFUND")}>Marcar devolución requerida</button>}{workflow.refundStatus === "REQUIRED" && <button className="admin-button admin-button--secondary" type="button" disabled={pending !== null} onClick={() => applyAction("MARK_REFUNDED")}>Marcar devolución realizada</button>}</div></section>;
}
