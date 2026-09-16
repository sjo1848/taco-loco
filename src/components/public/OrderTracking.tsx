"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicOrderTracking, PublicOrderStage } from "@/modules/orders/public-tracking";

const terminalStages: PublicOrderStage[] = ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"];
function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }

export function OrderTracking({ initial }: { initial: PublicOrderTracking }) {
  const [tracking, setTracking] = useState(initial);
  const [error, setError] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const delay = useRef(5000);
  const visible = useRef(true);
  const terminal = terminalStages.includes(tracking.currentStage);

  useEffect(() => {
    const clear = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = undefined; };
    const poll = async (immediate = false) => {
      clear();
      if (!visible.current || terminal) return;
      if (!immediate) await new Promise<void>((resolve) => { timer.current = window.setTimeout(resolve, delay.current); });
      try {
        const response = await fetch(`${window.location.pathname.replace(/\/$/, "").replace("/pedido/", "/api/orders/tracking/")}?after=${encodeURIComponent(tracking.version)}`, { cache: "no-store" });
        if (response.status === 200) { setTracking(await response.json() as PublicOrderTracking); delay.current = 5000; setError(false); }
        else if (response.status !== 204) throw new Error("TRACKING_FAILED");
        poll();
      } catch { setError(true); delay.current = Math.min(delay.current * 2, 30000); poll(); }
    };
    const onVisibility = () => { visible.current = document.visibilityState === "visible"; if (visible.current) { delay.current = 5000; poll(true); } else clear(); };
    document.addEventListener("visibilitychange", onVisibility);
    poll();
    return () => { clear(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [tracking.version, terminal]);

  return <main className="public-menu public-tracking" ref={(node) => { if (node) node.setAttribute("aria-live", "polite"); }}>
    <div className="public-menu__content"><p className="eyebrow">Taco Loco</p><h1>Pedido {tracking.orderCode}</h1>
      <section className="tracking-current"><p className="eyebrow">Estado actual</p><h2>{tracking.title}</h2><p>{tracking.message}</p></section>
      {error && <p role="status">Estamos intentando actualizar el estado…</p>}
      <section className="tracking-history" aria-labelledby="tracking-history-title"><h2 id="tracking-history-title">Historial</h2><ol>{tracking.history.map((event, index) => <li key={`${event.at}-${event.stage}-${index}`}><strong>{event.label}</strong><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ol></section>
      <section className="tracking-summary" aria-labelledby="tracking-summary-title"><h2 id="tracking-summary-title">Pedido</h2>{tracking.lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.quantity} × {line.name}</span>{line.modifiers.length > 0 && <small>{line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(" · ")}</small>}</div>)}<strong>Total: {formatPrice(tracking.totalAmount)}</strong></section>
    </div>
  </main>;
}
