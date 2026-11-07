"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus = "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED";
type Order = { id: string; orderNumber: number; status: OrderStatus; fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY"; verificationStatus: string; paymentStatus: string; source: "WHATSAPP" | "PUBLIC_MENU"; customerName: string | null; customerPhone: string | null; totalAmount: number; createdAt: string; lines: Array<unknown> };
const statusLabels: Record<OrderStatus, string> = { RECEIVED: "Recibido", CONFIRMED: "Confirmado", IN_PREPARATION: "En preparación", READY: "Listo", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
const quickTransitions: Partial<Record<OrderStatus, { toStatus: OrderStatus; label: string }>> = { CONFIRMED: { toStatus: "IN_PREPARATION", label: "Iniciar preparación" }, IN_PREPARATION: { toStatus: "READY", label: "Marcar listo" }, READY: { toStatus: "DELIVERED", label: "Marcar entregado" } };
function orderCode(orderNumber: number) { return "TL-" + String(orderNumber).padStart(4, "0"); }
function formatMoney(amount: number) { return "$" + amount.toLocaleString("es-AR"); }

function QuickOrderAction({ order, onUpdated }: { order: Order; onUpdated: (order: Order) => void }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [message]);
  const transition = quickTransitions[order.status];
  const needsReview = order.verificationStatus === "PENDING";
  if (!transition && !needsReview) return null;
  async function run() {
    if (!transition) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/orders/" + order.id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ toStatus: transition.toStatus }) });
      const payload = await response.json().catch(() => null) as { order?: Order; message?: string } | null;
      if (!response.ok || !payload?.order) { setMessage(payload?.message ?? "No se pudo actualizar."); return; }
      onUpdated(payload.order); setMessage("Actualizado");
    } catch { setMessage("Sin conexión"); }
    finally { setPending(false); }
  }
  return <div className="order-row__quick-actions" onClick={(event) => event.stopPropagation()}>{needsReview ? <Link className="admin-button admin-button--secondary" href={"/admin/orders/" + order.id}>Revisar pedido/pago</Link> : <button className="admin-button admin-button--primary" type="button" onClick={() => void run()} disabled={pending}>{pending ? "Actualizando…" : transition?.label}</button>}{message && <span className="order-quick-feedback" role="status">{message}</span>}</div>;
}
export function OrdersBoard({ orders, initialCursor }: { orders: Order[]; initialCursor: string }) {
  const [currentOrders, setCurrentOrders] = useState(orders);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | OrderStatus>("ALL");
  const [queue, setQueue] = useState<"ALL" | "PENDING" | "OPERATING">("ALL");
  const [period, setPeriod] = useState<"ALL" | "TODAY" | "7D" | "30D" | "CUSTOM">("TODAY");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [keepPending, setKeepPending] = useState(true);
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "reconnecting">("connecting");
  useEffect(() => {
    const stream = new EventSource("/api/admin/orders/events?after=" + encodeURIComponent(initialCursor));
    const handleOrder = (event: MessageEvent<string>) => { try { const payload = JSON.parse(event.data) as { order: Order }; setCurrentOrders((current) => { const index = current.findIndex((order) => order.id === payload.order.id); if (index === -1) return [payload.order, ...current]; const next = [...current]; next[index] = payload.order; return next; }); } catch { /* cursor stream remains recoverable */ } };
    stream.addEventListener("order", handleOrder as EventListener); stream.onopen = () => setStreamStatus("live"); stream.onerror = () => setStreamStatus("reconnecting"); return () => stream.close();
  }, [initialCursor]);
  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
    const todayStart = new Date(today + "T00:00:00-03:00").getTime();
    const periodStart = period === "TODAY" ? todayStart : period === "7D" ? todayStart - 6 * 86400000 : period === "30D" ? todayStart - 29 * 86400000 : fromDate ? new Date(fromDate + "T00:00:00-03:00").getTime() : null;
    const periodEnd = period === "CUSTOM" && toDate ? new Date(toDate + "T23:59:59.999-03:00").getTime() : now.getTime();
    return currentOrders.filter((order) => {
      const haystack = (orderCode(order.orderNumber) + " " + (order.customerName ?? "") + " " + (order.customerPhone ?? "")).toLowerCase();
      const pending = order.verificationStatus === "PENDING";
      const inPeriod = period === "ALL" || (periodStart !== null && new Date(order.createdAt).getTime() >= periodStart && new Date(order.createdAt).getTime() <= periodEnd);
      return (status === "ALL" || order.status === status) && (queue === "ALL" || (queue === "PENDING" && pending) || (queue === "OPERATING" && !pending)) && (inPeriod || (keepPending && pending)) && haystack.includes(query.trim().toLowerCase());
    }).sort((left, right) => Number(right.verificationStatus === "PENDING") - Number(left.verificationStatus === "PENDING") || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [currentOrders, query, status, queue, period, fromDate, toDate, keepPending]);
  function updateOrder(updated: Order) { setCurrentOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } : order)); }
  const pendingCount = currentOrders.filter((order) => order.verificationStatus === "PENDING").length;
  const preparingCount = currentOrders.filter((order) => order.verificationStatus !== "PENDING" && order.status === "IN_PREPARATION").length;
  const readyCount = currentOrders.filter((order) => order.verificationStatus !== "PENDING" && order.status === "READY").length;
  return <section className="admin-panel orders-board">
    <header className="orders-board__header"><div><p className="eyebrow">Operación en vivo</p><h2>Pedidos del local</h2><p>Revisá los nuevos, prepará los confirmados y entregá los listos.</p></div><span className={`orders-board__live orders-board__live--${streamStatus}`} role="status">{streamStatus === "live" ? "En vivo" : streamStatus === "connecting" ? "Conectando…" : "Reconectando…"}</span></header>
    <div className="orders-board__lanes" aria-label="Colas de pedidos">
      <button type="button" className={`orders-board__lane orders-board__lane--pending${queue === "PENDING" ? " is-active" : ""}`} onClick={() => { setQueue("PENDING"); setStatus("ALL"); setPeriod("ALL"); }}><span>Pendientes de verificación</span><strong>{pendingCount}</strong><small>Revisar pedido o pago</small></button>
      <button type="button" className={`orders-board__lane${status === "IN_PREPARATION" ? " is-active" : ""}`} onClick={() => { setQueue("OPERATING"); setStatus("IN_PREPARATION"); setPeriod("ALL"); }}><span>Preparando</span><strong>{preparingCount}</strong><small>Trabajo en cocina</small></button>
      <button type="button" className={`orders-board__lane${status === "READY" ? " is-active" : ""}`} onClick={() => { setQueue("OPERATING"); setStatus("READY"); setPeriod("ALL"); }}><span>Listos</span><strong>{readyCount}</strong><small>Esperan entrega</small></button>
    </div>
    <div className="admin-toolbar"><label className="sr-only" htmlFor="order-search">Buscar pedido</label><input id="order-search" placeholder="Buscar TL-0001, cliente o teléfono…" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="sr-only" htmlFor="order-period">Período</label><select id="order-period" value={period} onChange={(event) => setPeriod(event.target.value as typeof period)}><option value="TODAY">Hoy</option><option value="7D">Últimos 7 días</option><option value="30D">Últimos 30 días</option><option value="ALL">Todo el historial</option><option value="CUSTOM">Rango personalizado</option></select>{period === "CUSTOM" && <><label className="sr-only" htmlFor="order-from">Desde</label><input id="order-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /><label className="sr-only" htmlFor="order-to">Hasta</label><input id="order-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></>}<label className="order-pending-toggle"><input type="checkbox" checked={keepPending} onChange={(event) => setKeepPending(event.target.checked)} /> Mantener pendientes visibles</label><label className="sr-only" htmlFor="order-queue">Cola operativa</label><select id="order-queue" value={queue} onChange={(event) => setQueue(event.target.value as "ALL" | "PENDING" | "OPERATING")}><option value="ALL">Todas las colas</option><option value="PENDING">Pendientes de verificación</option><option value="OPERATING">Cola operativa</option></select><label className="sr-only" htmlFor="order-status">Filtrar estado</label><select id="order-status" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "ALL")}><option value="ALL">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="orders-board__summary"><span>{filtered.length} pedido{filtered.length === 1 ? "" : "s"} en esta vista</span><span>Pendientes primero · Más recientes después</span></div>
    <div className="orders-list">{filtered.map((order) => <article className={`order-row${order.verificationStatus === "PENDING" ? " order-row--pending" : ""}`} key={order.id}><Link className="order-row__main" href={"/admin/orders/" + order.id}><div><div className="order-row__title"><strong>{orderCode(order.orderNumber)}</strong><span className={"order-status order-status--" + order.status.toLowerCase()}>{statusLabels[order.status]}</span>{order.verificationStatus === "PENDING" && <span className="order-source order-source--pending">Pendiente de verificación</span>}</div><p>{order.customerName || "Sin nombre"} · {order.fulfillment === "PICKUP" ? "Retiro" : order.fulfillment === "DELIVERY" ? "Delivery" : "Consumo local"}{order.paymentStatus === "PENDING" ? " · Pago pendiente" : ""}</p><small>{new Date(order.createdAt).toLocaleString("es-AR")} · {order.lines.length} línea{order.lines.length === 1 ? "" : "s"}</small></div><strong className="order-row__total">{formatMoney(order.totalAmount)}</strong></Link><div className="order-row__actions"><QuickOrderAction order={order} onUpdated={updateOrder} /><Link className="admin-button admin-button--secondary" href={"/admin/orders/" + order.id}>Ver detalle</Link></div></article>)}{filtered.length === 0 && <p className="admin-empty">No hay pedidos que coincidan con el filtro.</p>}</div>
  </section>;
}
