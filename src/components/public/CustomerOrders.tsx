"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerOrderSummary } from "@/modules/orders/public-tracking";

type CustomerOrdersResponse = { orders: CustomerOrderSummary[]; nextCursor: string | null };

function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function CustomerOrders() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [repeatMessage, setRepeatMessage] = useState("");

  async function repeatOrder(repeatPath: string | null, orderCode: string) {
    if (!repeatPath) { setRepeatMessage("Este pedido no puede repetirse."); return; }
    setRepeating(orderCode); setRepeatMessage("");
    const clientReference = `repeat-${crypto.randomUUID()}`;
    try {
      const response = await fetch(repeatPath, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientReference }) });
      const body = await response.json() as { tracking?: { path?: string } | null; message?: string };
      if (!response.ok) throw new Error(body.message ?? "No pudimos repetir el pedido.");
      setRepeatMessage(body.tracking?.path ? "Pedido repetido. Abrimos su seguimiento." : "Pedido repetido.");
      if (body.tracking?.path) window.location.assign(body.tracking.path);
    } catch (repeatError) { setRepeatMessage(repeatError instanceof Error ? repeatError.message : "No pudimos repetir el pedido."); }
    finally { setRepeating(null); }
  }

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);
    try {
      const response = await fetch(cursor ? `/api/customer/orders?cursor=${encodeURIComponent(cursor)}` : "/api/customer/orders", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("CUSTOMER_ORDERS_FAILED");
      const body = await response.json() as CustomerOrdersResponse;
      setOrders((current) => append ? [...current, ...body.orders] : body.orders);
      setNextCursor(body.nextCursor);
    } catch {
      setError(true);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  // The authenticated account state is the parent synchronization boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(null, false); }, [load]);

  return <section className="public-panel" aria-labelledby="customer-orders-title">
    <div className="selection-sheet__header"><div><p className="eyebrow">Taco Club</p><h2 id="customer-orders-title">Mis pedidos</h2></div></div>
    {loading && <p className="selection-help" role="status" aria-live="polite">Cargando tus pedidos…</p>}
    {error && <div role="alert"><p className="form-error">No pudimos cargar tus pedidos.</p><button className="button button--secondary" type="button" onClick={() => void load(null, false)}>Reintentar</button></div>}
    {!loading && !error && orders.length === 0 && <p className="selection-help">Todavía no tenés pedidos asociados a esta cuenta. Comprar como invitado sigue siendo posible.</p>}
    {!loading && !error && orders.length > 0 && <div className="customer-orders" aria-live="polite">{orders.map((order) => <article className="customer-order-card" key={`${order.orderCode}-${order.createdAt}`}><header><div><strong>{order.orderCode}</strong><p className="selection-help">{formatDate(order.createdAt)} · {order.fulfillment === "DELIVERY" ? "Delivery" : "Retiro"}</p></div><span className="order-status">{order.title}</span></header><p>{order.message}</p><div>{order.lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.quantity} × {line.name}</span>{line.modifiers.length > 0 && <small> · {line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(", ")}</small>}</div>)}</div><strong>{formatPrice(order.totalAmount)}</strong><button className="button button--secondary" type="button" disabled={repeating !== null || !order.repeatPath} onClick={() => void repeatOrder(order.repeatPath, order.orderCode)}>{repeating === order.orderCode ? "Repitiendo…" : order.repeatPath ? "Repetir pedido" : "No disponible"}</button></article>)}</div>}
    {repeatMessage && <p className="selection-help" role="status">{repeatMessage}</p>}
    {!loading && !error && nextCursor && <button className="button button--secondary" type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? "Cargando…" : "Ver más pedidos"}</button>}
  </section>;
}
