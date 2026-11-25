"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkoutIntentStorageKey } from "@/modules/selection/model";
import { terminalTrackingStages, type CustomerOrderSummary, type PublicOrderTracking } from "@/modules/orders/public-tracking";
import { clearGuestOrders, onCustomerSessionChange, readGuestOrders } from "@/modules/orders/tracking-resume";

type OrderCard = Omit<CustomerOrderSummary, "repeatReference"> & { path: string | null; repeatReference?: string | null };
type CustomerOrdersResponse = { orders: CustomerOrderSummary[]; nextCursor: string | null; viewerId: string };
type OrderPage = { orders: OrderCard[]; nextCursor: string | null };
type OrderList = { active: OrderPage; history: OrderPage; guest: boolean; viewerId?: string; guestIncomplete?: boolean };
type Bucket = "active" | "history";

function accountOrders(page: CustomerOrdersResponse): OrderPage {
  return { ...page, orders: page.orders.map((order) => ({
    ...order, path: order.repeatReference ? `/pedidos/${encodeURIComponent(order.repeatReference)}` : null,
  })) };
}

type VisiblePages = { active: number; history: number; viewerId?: string };
const firstPages: VisiblePages = { active: 1, history: 1 };

async function fetchAccountPage(bucket: Bucket, signal: AbortSignal, cursor?: string) {
  const search = new URLSearchParams({ view: bucket });
  if (cursor) search.set("cursor", cursor);
  return fetch(`/api/customer/orders?${search}`, { cache: "no-store", signal });
}

async function collectPages(bucket: Bucket, page: CustomerOrdersResponse, count: number, signal: AbortSignal) {
  const orders = new Map(page.orders.map((order) => [order.orderCode, order]));
  let nextCursor = page.nextCursor;
  for (let loaded = 1; nextCursor && loaded < count; loaded++) {
    const response = await fetchAccountPage(bucket, signal, nextCursor);
    if (!response.ok) throw new Error("CUSTOMER_ORDERS_UNAVAILABLE");
    const next: CustomerOrdersResponse = await response.json();
    if (next.viewerId !== page.viewerId) throw new Error("CUSTOMER_SESSION_CHANGED");
    for (const order of next.orders) orders.set(order.orderCode, order);
    nextCursor = next.nextCursor;
  }
  return { ...page, orders: [...orders.values()], nextCursor };
}

async function loadOrderLists(signal: AbortSignal, pages: VisiblePages, validateGuest = true): Promise<OrderList> {
  const active = await fetchAccountPage("active", signal);
  if (active.status === 401) {
    const references = readGuestOrders();
    const results = await Promise.allSettled(references.map(async ({ path }) => {
      const response = await fetch(path.replace("/pedido/", "/api/orders/tracking/"), { cache: "no-store", referrerPolicy: "no-referrer", signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("GUEST_TRACKING_UNAVAILABLE");
      return { ...(await response.json() as PublicOrderTracking), path };
    }));
    if (references.length && validateGuest) {
      const session = await fetch("/api/customer/auth/session", { cache: "no-store", signal });
      if (session.ok) return loadOrderLists(signal, firstPages, false);
      if (session.status !== 401) throw new Error("CUSTOMER_SESSION_UNAVAILABLE");
    }
    const orders = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
    return {
      guest: true, guestIncomplete: results.some((row) => row.status === "rejected"),
      active: { orders: orders.filter((order) => !terminalTrackingStages.includes(order.currentStage)), nextCursor: null },
      history: { orders: orders.filter((order) => terminalTrackingStages.includes(order.currentStage)), nextCursor: null },
    };
  }
  if (!active.ok) throw new Error("CUSTOMER_ORDERS_UNAVAILABLE");
  const history = await fetchAccountPage("history", signal);
  if (!history.ok) throw new Error("CUSTOMER_ORDERS_UNAVAILABLE");
  const activePage: CustomerOrdersResponse = await active.json();
  const historyPage: CustomerOrdersResponse = await history.json();
  if (activePage.viewerId !== historyPage.viewerId) throw new Error("CUSTOMER_SESSION_CHANGED");
  const visible = activePage.viewerId === pages.viewerId ? pages : firstPages;
  const [ongoing, past] = await Promise.all([collectPages("active", activePage, visible.active, signal), collectPages("history", historyPage, visible.history, signal)]);
  if (!signal.aborted) clearGuestOrders();
  const finished = new Set(past.orders.map((order) => order.orderCode));
  return {
    guest: false, viewerId: activePage.viewerId,
    active: accountOrders({ ...ongoing, orders: ongoing.orders.filter((order) => !finished.has(order.orderCode)) }),
    history: accountOrders(past),
  };
}

function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function CustomerOrders() {
  const router = useRouter();
  const [lists, setLists] = useState<OrderList | null>(null);
  const request = useRef<AbortController | null>(null);
  const visiblePages = useRef<VisiblePages>(firstPages);
  const [proposalViewer, setProposalViewer] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [repeatMessage, setRepeatMessage] = useState("");
  const [proposal, setProposal] = useState<{ fulfillment: "PICKUP" | "DELIVERY"; subtotalAmount: number; lines: Array<{ productId: string; name: string; priceAmount: number; quantity: number; modifiers: Array<{ group: string; option: string }> }> } | null>(null);

  async function repeatOrder(reference: string | null, orderCode: string) {
    if (!reference) { setRepeatMessage("Este pedido no puede repetirse."); return; }
    setRepeating(orderCode); setRepeatMessage("");
    try {
      const response = await fetch(`/api/customer/orders/${encodeURIComponent(reference)}/repeat`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json() as { proposal?: typeof proposal; message?: string };
      if (!response.ok) throw new Error(body.message ?? "No pudimos repetir el pedido.");
      setProposalViewer(lists?.viewerId);
      setProposal(body.proposal ?? null);
      setRepeatMessage("Revisá el pedido con precios y disponibilidad actuales antes de continuar.");
    } catch (repeatError) { setRepeatMessage(repeatError instanceof Error ? repeatError.message : "No pudimos repetir el pedido."); }
    finally { setRepeating(null); }
  }

  function openRepeatDraft() {
    if (!proposal) return;
    try {
      if (window.sessionStorage.getItem(checkoutIntentStorageKey)) {
        setRepeatMessage("Hay un intento sin confirmar. Recuperalo o descartalo desde el carrito antes de repetir este pedido.");
        return;
      }
      const cart = JSON.parse(window.sessionStorage.getItem("taco-loco-selection") ?? "[]");
      if (Array.isArray(cart) && cart.length > 0 && !window.confirm("Ya tenés productos en el carrito. ¿Querés reemplazarlos por este pedido?")) return;
      window.sessionStorage.setItem("taco-loco-repeat-draft", JSON.stringify(proposal));
    } catch {
      setRepeatMessage("No pudimos llevar el borrador al carrito. Permití el almacenamiento en esta pestaña y reintentá.");
      return;
    }
    router.push("/menu?carrito=1");
  }

  const load = useCallback(async (bucket?: Bucket, cursor?: string, viewerId?: string, quiet = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (bucket && cursor) setLoadingMore(true);
    else if (!quiet) setLoading(true);
    setError(false);
    try {
      if (bucket && cursor) {
        const response = await fetchAccountPage(bucket, controller.signal, cursor);
        if (!response.ok) throw new Error("CUSTOMER_ORDERS_UNAVAILABLE");
        const result: CustomerOrdersResponse = await response.json();
        if (result.viewerId !== viewerId) throw new Error("CUSTOMER_SESSION_CHANGED");
        const next = accountOrders(result);
        if (controller.signal.aborted) return;
        visiblePages.current = { ...visiblePages.current, [bucket]: visiblePages.current[bucket] + 1 };
        setLists((current) => {
          if (!current || current.viewerId !== result.viewerId) return current;
          const existing = current[bucket].orders;
          const known = new Set(existing.map((order) => order.orderCode));
          const otherBucket = bucket === "active" ? "history" : "active";
          const moves = new Set(next.orders.map((order) => order.orderCode));
          return {
            ...current,
            [bucket]: { ...next, orders: [...existing, ...next.orders.filter((order) => !known.has(order.orderCode))] },
            [otherBucket]: { ...current[otherBucket], orders: current[otherBucket].orders.filter((order) => !moves.has(order.orderCode)) },
          };
        });
      } else {
        const next = await loadOrderLists(controller.signal, visiblePages.current);
        if (!controller.signal.aborted) {
          if (next.viewerId !== visiblePages.current.viewerId) visiblePages.current = { ...firstPages, viewerId: next.viewerId };
          setLists(next);
        }
      }
    } catch {
      if (!controller.signal.aborted) { setLists(null); setError(true); }
    } finally {
      if (!controller.signal.aborted) { request.current = null; setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !request.current) void load(undefined, undefined, undefined, true);
    };
    const initial = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 30_000);
    const unsubscribe = onCustomerSessionChange(() => {
      void load();
    });
    const events = ["focus", "pageshow", "visibilitychange"] as const;
    for (const event of events) window.addEventListener(event, refresh);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      unsubscribe();
      request.current?.abort();
      for (const event of events) window.removeEventListener(event, refresh);
    };
  }, [load]);

  const proposalVisible = proposal && lists?.viewerId && proposalViewer === lists.viewerId;
  function renderBucket(bucket: Bucket, title: string, empty: string) {
    const page = lists?.[bucket];
    return <section className="customer-order-section" aria-labelledby={`orders-${bucket}-title`}>
      <h2 id={`orders-${bucket}-title`}>{title}</h2>
      {page && page.orders.length === 0 && <p className="selection-help">{empty}</p>}
      {page && <div className="customer-orders">{page.orders.map((order) => <article className={`customer-order-card customer-order-card--${bucket}`} key={order.orderCode}>
        <header><div><h3>{order.orderCode}</h3><p className="selection-help"><time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time> · {order.fulfillment === "DELIVERY" ? "Delivery" : "Retiro"}</p></div><span className="order-status">{order.title}</span></header>
        {bucket === "active" && <>
          <div>{order.lines.slice(0, 2).map((line, index) => <div key={`${line.name}-${index}`}>{line.quantity} × {line.name}</div>)}{order.lines.length > 2 && <div>+ {order.lines.length - 2} productos</div>}</div>
          <strong>{formatPrice(order.totalAmount)}</strong>
        </>}
        {bucket === "history" && <><div>{order.lines.map((line, index) => <div key={`${line.name}-${index}`}>{line.quantity} × {line.name}{line.modifiers.length > 0 && <small> · {line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(", ")}</small>}</div>)}</div><strong>{formatPrice(order.totalAmount)}</strong></>}
        <div className="customer-order-actions">
          {order.path && <Link prefetch={false} className={bucket === "active" ? "button" : "button button--secondary"} href={order.path}>{bucket === "active" ? "Ver seguimiento" : "Ver detalle"}<span className="sr-only"> de {order.orderCode}</span></Link>}
          {bucket === "history" && order.repeatReference && <button className="button button--secondary" type="button" disabled={repeating !== null} onClick={() => void repeatOrder(order.repeatReference ?? null, order.orderCode)}>{repeating === order.orderCode ? "Revisando…" : "Repetir pedido"}</button>}
        </div>
      </article>)}</div>}
      {page?.nextCursor && <button className="button button--secondary" type="button" disabled={loadingMore} onClick={() => void load(bucket, page.nextCursor ?? undefined, lists?.viewerId)}>{loadingMore ? "Cargando…" : bucket === "active" ? "Ver más pedidos en curso" : "Ver más del historial"}</button>}
    </section>;
  }

  return <section id="customer-orders" className="public-panel" aria-labelledby="customer-orders-title">
    <h1 id="customer-orders-title">Mis pedidos</h1>
    {loading && <p className="selection-help" role="status">Cargando tus pedidos…</p>}
    {error && <div role="alert"><p className="form-error">No pudimos cargar tus pedidos.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Reintentar</button></div>}
    {!loading && lists && <>
      {renderBucket("active", "En curso", "No tenés pedidos en curso.")}
      {renderBucket("history", "Historial", "Todavía no hay pedidos finalizados.")}
      {lists.guestIncomplete && <p role="status">Algunos estados no se pudieron consultar. <button className="button button--secondary" type="button" onClick={() => void load()}>Reintentar</button></p>}
      {lists.guest && <p className="selection-help">Como invitado, ves los pedidos recientes de esta pestaña. Podés abrir un enlace privado de seguimiento. <Link href="/cuenta">Ingresá a Taco Club</Link> para ver los pedidos de tu cuenta.</p>}
      {!lists.guestIncomplete && lists.active.orders.length === 0 && lists.history.orders.length === 0 && <p><Link className="button button--secondary" href="/menu">Ver menú</Link></p>}
    </>}
    {!loading && proposalVisible && <section className="public-panel" aria-labelledby="repeat-proposal-title"><h2 id="repeat-proposal-title">Revisá tu pedido repetido</h2><p className="selection-help">Estos son los precios, disponibilidad y modificadores actuales. La orden todavía no fue creada.</p>{proposal.lines.map((line) => <p key={`${line.productId}-${line.name}`}><strong>{line.quantity} × {line.name}</strong> · {formatPrice(line.priceAmount)}{line.modifiers.length > 0 && ` · ${line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(", ")}`}</p>)}<strong>Subtotal actual: {formatPrice(proposal.subtotalAmount)}</strong><div className="selection-actions"><button className="button" type="button" onClick={openRepeatDraft}>Ir al carrito</button><button className="button button--secondary" type="button" onClick={() => setProposal(null)}>Cancelar</button></div></section>}
    {repeatMessage && lists && !lists.guest && <p className="selection-help" role="status">{repeatMessage}</p>}
  </section>;
}
