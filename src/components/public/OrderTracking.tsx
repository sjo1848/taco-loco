"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicOrderTracking } from "@/modules/orders/public-tracking";
import { clearActiveTrackingResume } from "@/modules/orders/tracking-resume";
import { initialTrackingPollDelay, nextTrackingPollDelay, terminalTrackingStages } from "./tracking-polling";
import { PublicNavigation } from "@/components/public/PublicNavigation";
function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }

export function OrderTracking({ initial }: { initial: PublicOrderTracking }) {
  const [tracking, setTracking] = useState(initial);
  const [error, setError] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [reportingPayment, setReportingPayment] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const delay = useRef(initialTrackingPollDelay);
  const visible = useRef(true);
  const currentTracking = useRef(initial);
  const inFlight = useRef(false);

  useEffect(() => {
    clearActiveTrackingResume(window.localStorage);
  }, []);

  async function reportPayment() {
    setReportingPayment(true); setPaymentMessage("");
    try {
      const token = window.location.pathname.split("/").filter(Boolean).at(-1);
      if (!token) throw new Error("TRACKING_TOKEN_MISSING");
      const response = await fetch(`/api/orders/tracking/${encodeURIComponent(token)}/payment`, { method: "POST", credentials: "same-origin" });
      if (response.ok) {
        const result = await response.json() as { reused?: boolean };
        setPaymentMessage(result.reused ? "El pago ya había sido informado. El local debe verificarlo antes de confirmar el pedido." : "Pago informado. El local debe verificarlo antes de confirmar el pedido.");
      } else setPaymentMessage("Este pedido ya no admite informar el pago.");
    } catch { setPaymentMessage("No pudimos informar el pago. Intentá nuevamente."); }
    finally { setReportingPayment(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const requestController = { current: null as AbortController | null };
    const clear = () => { if (timer.current !== undefined) window.clearTimeout(timer.current); timer.current = undefined; };
    const schedule = (wait: number, poll: () => Promise<void>) => { clear(); if (!cancelled && visible.current && !terminalTrackingStages.includes(currentTracking.current.currentStage)) timer.current = window.setTimeout(() => void poll(), wait); };
    const poll = async (immediate = false): Promise<void> => {
      if (cancelled || !visible.current || terminalTrackingStages.includes(currentTracking.current.currentStage) || inFlight.current) return;
      if (!immediate) { schedule(delay.current, () => poll(true)); return; }
      const requestGeneration = generation;
      inFlight.current = true;
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const response = await fetch(`${window.location.pathname.replace(/\/$/, "").replace("/pedido/", "/api/orders/tracking/")}?after=${encodeURIComponent(currentTracking.current.version)}`, { cache: "no-store", signal: controller.signal });
        if (response.status === 200) { const next = await response.json() as PublicOrderTracking; currentTracking.current = next; setTracking(next); delay.current = nextTrackingPollDelay(delay.current, true); setError(false); }
        else if (response.status !== 204) throw new Error("TRACKING_FAILED");
        else delay.current = nextTrackingPollDelay(delay.current, true);
      } catch { if (cancelled || controller.signal.aborted || requestGeneration !== generation) return; setError(true); delay.current = nextTrackingPollDelay(delay.current, false); }
      finally { if (requestGeneration !== generation) return; inFlight.current = false; requestController.current = null; if (!cancelled && visible.current && !terminalTrackingStages.includes(currentTracking.current.currentStage)) schedule(delay.current, () => poll(true)); }
    };
    const onVisibility = () => { visible.current = document.visibilityState === "visible"; generation += 1; if (visible.current) { requestController.current?.abort(); inFlight.current = false; delay.current = initialTrackingPollDelay; void poll(true); } else { clear(); requestController.current?.abort(); inFlight.current = false; } };
    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "visible") void poll(true);
    return () => { cancelled = true; generation += 1; requestController.current?.abort(); clear(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  return <main className="public-menu public-tracking" ref={(node) => { if (node) node.setAttribute("aria-live", "polite"); }}><PublicNavigation />
    <section className="brand-pattern brand-pattern--hero tracking-hero"><div className="public-menu__content"><p className="eyebrow">Taco Loco · Seguimiento</p><h1>Pedido {tracking.orderCode}</h1>
      <section className="tracking-current"><p className="eyebrow">Estado actual</p><h2>{tracking.title}</h2><p>{tracking.message}</p></section></div></section>
    <div className="public-menu__content">
      {error && <p role="status">Estamos intentando actualizar el estado…</p>}
      {tracking.fulfillment === "DELIVERY" && tracking.currentStage === "WAITING_PAYMENT_CONFIRMATION" && <section className="tracking-payment" aria-labelledby="tracking-payment-title"><h2 id="tracking-payment-title">¿Ya hiciste la transferencia?</h2><p>Informalo para que el local revise el ingreso. La confirmación final la realiza el operador.</p><button className="button" type="button" disabled={reportingPayment} onClick={() => void reportPayment()}>{reportingPayment ? "Informando…" : "Informé la transferencia"}</button>{paymentMessage && <p role="status">{paymentMessage}</p>}</section>}
      <section className="tracking-history" aria-labelledby="tracking-history-title"><h2 id="tracking-history-title">Historial</h2><ol>{tracking.history.map((event, index) => <li key={`${event.at}-${event.stage}-${index}`}><strong>{event.label}</strong><time dateTime={event.at} suppressHydrationWarning>{new Date(event.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ol></section>
      <section className="tracking-summary" aria-labelledby="tracking-summary-title"><h2 id="tracking-summary-title">Pedido</h2>{tracking.lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.quantity} × {line.name}</span>{line.modifiers.length > 0 && <small>{line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(" · ")}</small>}</div>)}<strong>Total: {formatPrice(tracking.totalAmount)}</strong></section>
    </div>
  </main>;
}
