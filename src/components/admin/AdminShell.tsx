"use client";

import Link from "next/link";
import { usePathname,useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, History, Package, MoreHorizontal } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./AdminShell.module.css";

const destinations = [
  { href: "/admin/orders", label: "Pedidos", Icon: ClipboardList },
  { href: "/admin/orders/history", label: "Historial", Icon: History },
  { href: "/admin/products", label: "Productos", Icon: Package },
  { href: "/admin/more", label: "Más", Icon: MoreHorizontal },
];

type LiveOrder = { id: string; orderNumber: number; status: "RECEIVED"|"CONFIRMED"|"IN_PREPARATION"|"READY"|"DELIVERED"|"CANCELLED"; fulfillment: "PICKUP"|"DINE_IN"|"DELIVERY"; verificationStatus: string; paymentStatus: string; refundStatus: string; customerName: string | null; totalAmount: number; createdAt: string; lines: Array<{ quantity: number; productName: string; modifiersSnapshot: unknown; note?: string | null }>; notes?: string | null };
type LiveSubscriber = { onOrder: (order: LiveOrder) => void; onSync: () => void | Promise<void> };
type AdminLiveState = { connection: "connecting" | "live" | "reconnecting" | "offline" | "expired"; subscribe: (onOrder: (order: LiveOrder) => void, onSync: () => void | Promise<void>) => () => void };
const AdminLiveContext = createContext<AdminLiveState>({ connection: "connecting", subscribe: () => () => {} });
export function useAdminLiveEvents() { return useContext(AdminLiveContext); }

function isActive(href: string, pathname: string) {
  if (href === "/admin/orders") return pathname.startsWith("/admin/orders") && !pathname.startsWith("/admin/orders/history");
  if (href === "/admin/products") return pathname.startsWith("/admin/products");
  if (href === "/admin/more") return pathname === "/admin/more" || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/settings");
  return pathname === href;
}

function title(path: string) {
  if (path === "/admin/orders") return "Pedidos";
  if (path.startsWith("/admin/orders/attention")) return "Necesitan atención";
  if (path.startsWith("/admin/orders/history")) return "Historial";
  if (path.startsWith("/admin/orders/new")) return "Nuevo pedido";
  if (path.startsWith("/admin/orders/")) return "Detalle del pedido";
  if (path.startsWith("/admin/products/new")) return "Nuevo producto";
  if (path.startsWith("/admin/products/")) return "Editar producto";
  if (path.startsWith("/admin/products")) return "Productos";
  if (path.startsWith("/admin/categories")) return "Categorías";
  if (path.startsWith("/admin/settings")) return "Configuración";
  return "Más";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const searchParams=useSearchParams();
  const [connection, setConnection] = useState<AdminLiveState["connection"]>("connecting");
  const [streamGeneration, setStreamGeneration] = useState(0);
  const connectionRef = useRef(connection);
  const lastSequence = useRef<bigint>(BigInt(0));
  const subscribers = useRef(new Set<LiveSubscriber>());
  const active = pathname.startsWith("/admin/orders");
  const subscribe = useCallback((onOrder: (order: LiveOrder) => void, onSync: () => void | Promise<void>) => {
    const subscriber = { onOrder, onSync };
    subscribers.current.add(subscriber);
    if (connectionRef.current === "live") void Promise.resolve(onSync()).catch(() => {});
    return () => subscribers.current.delete(subscriber);
  }, []);
  const updateConnection = useCallback((next: AdminLiveState["connection"]) => {
    connectionRef.current = next;
    setConnection(next);
  }, []);
  const reconcileSubscribers = useCallback(() => {
    for (const subscriber of subscribers.current) void Promise.resolve(subscriber.onSync()).catch(() => {});
  }, []);
  const onOrder = useCallback((event: MessageEvent<string>) => {
    try {
      const sequence = event.lastEventId && /^\d+$/.test(event.lastEventId) ? BigInt(event.lastEventId) : null;
      if (sequence !== null && sequence <= lastSequence.current) return;
      if (sequence !== null) lastSequence.current = sequence;
      const payload = JSON.parse(event.data) as { order?: LiveOrder };
      if (payload.order) subscribers.current.forEach((subscriber) => subscriber.onOrder(payload.order!));
    } catch { /* Ignore malformed events; EventSource will continue and the next event is authoritative. */ }
  }, []);
  const onReady = useCallback((event: MessageEvent<string>) => {
    const sequence = event.lastEventId && /^\d+$/.test(event.lastEventId) ? BigInt(event.lastEventId) : null;
    if (sequence !== null && sequence > lastSequence.current) lastSequence.current = sequence;
  }, []);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const cursor = lastSequence.current;
    const streamUrl = cursor > BigInt(0) ? `/api/admin/orders/events?after=${cursor}` : "/api/admin/orders/events";
    const stream = new EventSource(streamUrl);
    const onOffline = () => updateConnection("offline");
    const onOnline = () => {
      if (connectionRef.current === "expired") return;
      // Some browsers keep EventSource.readyState === OPEN after a brief
      // offline/online transition but no longer deliver events. Replace the
      // source instead of treating that stale state as a healthy transport.
      // Closing this source before the effect creates its replacement keeps at
      // most one active stream for this admin shell.
      updateConnection("reconnecting");
      stream.close();
      setStreamGeneration((generation) => generation + 1);
    };
    stream.addEventListener("order", onOrder as EventListener);
    stream.addEventListener("ready", onReady as EventListener);
    stream.addEventListener("session-expired", () => {
      stream.close();
      if (alive) updateConnection("expired");
    });
    stream.onopen = () => {
      if (!alive) return;
      updateConnection("live");
      // The server starts a fresh stream at its current event sequence. Reconcile
      // each mounted view after every open so a write between its initial query
      // and this connection cannot fall into the snapshot/stream gap. On browser
      // reconnect, EventSource replays after Last-Event-ID and this sync also
      // repairs any gap caused by a suspended tab or a lost connection.
      reconcileSubscribers();
    };
    stream.onerror = () => {
      if (!alive) return;
      if (navigator.onLine) updateConnection("reconnecting");
      else updateConnection("offline");
      void fetch("/api/auth/session", { cache: "no-store" }).then((response) => {
        if (alive && response.status === 401) {
          stream.close();
          updateConnection("expired");
        }
      }).catch(() => {});
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const onVisible = () => { if (document.visibilityState === "visible") reconcileSubscribers(); };
    window.addEventListener("pageshow", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      stream.removeEventListener("order", onOrder as EventListener);
      stream.removeEventListener("ready", onReady as EventListener);
      stream.close();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, onOrder, onReady, reconcileSubscribers, streamGeneration, updateConnection]);
  if (pathname === "/admin/login") return children;
  const currentTitle = title(pathname);
  const back = pathname !== "/admin/orders" && pathname !== "/admin/products" && pathname !== "/admin/more" && pathname !== "/admin/orders/history";
  const requestedBack=searchParams.get("back");
  const backHref=pathname.startsWith("/admin/orders/")&&requestedBack?.startsWith("/admin/orders/history")?requestedBack:pathname.startsWith("/admin/orders/")&&searchParams.get("from")==="attention"?"/admin/orders/attention":pathname.startsWith("/admin/orders/")?"/admin/orders":pathname.startsWith("/admin/products/")?"/admin/products":"/admin/more";
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Navegación administrativa">
      <Link className={styles.wordmark} href="/admin/orders">TACO <span>LOCO</span></Link>
      <nav>{destinations.map(({ href, label, Icon }) => { const active = isActive(href, pathname); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? styles.active : ""}><Icon size={20} strokeWidth={2.1}/><span>{label}</span></Link>; })}</nav>
    </aside>
    <div className={styles.app}>
      <header className={styles.topbar}>
        {back && <Link href={backHref} className={styles.back} aria-label="Volver"><ArrowLeft size={20}/></Link>}
        <strong>{currentTitle}</strong>
        <span className={styles.topbarSpacer}/>
      </header>
      <AdminLiveContext.Provider value={{ connection, subscribe }}>{children}</AdminLiveContext.Provider>
      <nav className={styles.bottomNav} aria-label="Navegación administrativa móvil">{destinations.map(({ href, label, Icon }) => { const active = isActive(href, pathname); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? styles.bottomActive : ""}><Icon size={21}/><span>{label}</span></Link>; })}</nav>
    </div>
  </div>;
}
