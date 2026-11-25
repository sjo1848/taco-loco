"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { terminalTrackingStages, type PublicOrderTracking } from "@/modules/orders/public-tracking";
import { finishTrackingHandoff, onCustomerSessionChange } from "@/modules/orders/tracking-resume";
import { initialTrackingPollDelay, maxTrackingPollDelay, nextTrackingPollDelay } from "./tracking-polling";
import { PublicShell } from "@/components/public/PublicShell";
function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }
export function OrderTracking({ initial, privateOrderId, children }: { initial: PublicOrderTracking; privateOrderId?: string; children?: React.ReactNode }) {
  const [tracking, setTracking] = useState(initial);
  const [denied, setDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(Boolean(privateOrderId));
  const [error, setError] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [reportingPayment, setReportingPayment] = useState(false);
  const [statusChanged, setStatusChanged] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const delay = useRef(initialTrackingPollDelay);
  const visible = useRef(true);
  const currentTracking = useRef(initial);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!privateOrderId) finishTrackingHandoff(window.location.pathname);
  }, [privateOrderId]);

  async function reportPayment() {
    setReportingPayment(true); setPaymentMessage("");
    try {
      const token = window.location.pathname.split("/").filter(Boolean).at(-1);
      if (!token) throw new Error("TRACKING_TOKEN_MISSING");
      const endpoint = privateOrderId ? `/api/customer/orders/${encodeURIComponent(privateOrderId)}/tracking` : `/api/orders/tracking/${encodeURIComponent(token)}`;
      const response = await fetch(`${endpoint}/payment`, { method: "POST", credentials: "same-origin" });
      if (privateOrderId && (response.status === 401 || response.status === 404)) setDenied(true);
      else if (response.ok) {
        const result = await response.json() as { reused?: boolean };
        setPaymentMessage(result.reused ? "El pago ya había sido informado. El local debe verificarlo antes de confirmar el pedido." : "Pago informado. El local debe verificarlo antes de confirmar el pedido.");
      } else setPaymentMessage("Este pedido ya no admite informar el pago.");
    } catch { setPaymentMessage("No pudimos informar el pago. Intentá nuevamente."); }
    finally { setReportingPayment(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let accessLost = false;
    const canPoll = () => !accessLost && (Boolean(privateOrderId) || !terminalTrackingStages.includes(currentTracking.current.currentStage));
    const endpoint = privateOrderId ? `/api/customer/orders/${encodeURIComponent(privateOrderId)}/tracking`
      : window.location.pathname.replace(/\/$/, "").replace("/pedido/", "/api/orders/tracking/");
    const requestController = { current: null as AbortController | null };
    const clear = () => { if (timer.current !== undefined) window.clearTimeout(timer.current); timer.current = undefined; };
    const schedule = (wait: number, poll: () => Promise<void>) => { clear(); if (!cancelled && visible.current && canPoll()) timer.current = window.setTimeout(() => void poll(), wait); };
    const poll = async (immediate = false): Promise<void> => {
      if (cancelled || !visible.current || !canPoll() || inFlight.current) return;
      if (!immediate) { schedule(delay.current, () => poll(true)); return; }
      const requestGeneration = generation;
      inFlight.current = true;
      const controller = new AbortController();
      requestController.current = controller;
      try {
        const response = await fetch(`${endpoint}?after=${encodeURIComponent(currentTracking.current.version)}`, { cache: "no-store", signal: controller.signal });
        if (cancelled || controller.signal.aborted || requestGeneration !== generation) return;
        if (privateOrderId && (response.status === 401 || response.status === 404)) {
          accessLost = true;
          setDenied(true);
          return;
        }
        if (privateOrderId && (response.status === 200 || response.status === 204)) setCheckingAccess(false);
        if (response.status === 200) {
          const next = await response.json() as PublicOrderTracking;
          if (cancelled || controller.signal.aborted || requestGeneration !== generation) return;
          const stageChanged = next.currentStage !== currentTracking.current.currentStage;
          currentTracking.current = next;
          setTracking(next);
          if (stageChanged) { setStatusChanged(true); window.setTimeout(() => setStatusChanged(false), 900); }
          delay.current = nextTrackingPollDelay(delay.current, true);
          setError(false);
        }
        else if (response.status !== 204) throw new Error("TRACKING_FAILED");
        else delay.current = nextTrackingPollDelay(delay.current, true);
      } catch { if (cancelled || controller.signal.aborted || requestGeneration !== generation) return; setError(true); delay.current = nextTrackingPollDelay(delay.current, false); }
      finally { if (requestGeneration !== generation) return; inFlight.current = false; requestController.current = null; if (!cancelled && visible.current && canPoll()) schedule(terminalTrackingStages.includes(currentTracking.current.currentStage) ? maxTrackingPollDelay : delay.current, () => poll(true)); }
    };
    const onVisibility = () => { if (privateOrderId) setCheckingAccess(true); visible.current = document.visibilityState === "visible"; generation += 1; if (visible.current) { requestController.current?.abort(); inFlight.current = false; delay.current = initialTrackingPollDelay; void poll(true); } else { clear(); requestController.current?.abort(); inFlight.current = false; } };
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = privateOrderId ? onCustomerSessionChange(onVisibility) : undefined;
    if (privateOrderId) { window.addEventListener("focus", onVisibility); window.addEventListener("pageshow", onVisibility); }
    if (document.visibilityState === "visible") void poll(true);
    return () => { unsubscribe?.(); cancelled = true; generation += 1; requestController.current?.abort(); clear(); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("focus", onVisibility); window.removeEventListener("pageshow", onVisibility); };
  }, [privateOrderId]);

  if (denied) return <PublicShell><section className="public-panel"><h1>Seguimiento no disponible</h1><p>Ingresá con la cuenta que hizo el pedido para consultar su estado.</p><Link className="button" href="/cuenta">Ir a mi cuenta</Link></section></PublicShell>;

  if (checkingAccess) return <PublicShell><section className="public-panel"><h1>Seguimiento</h1><p role="status">{error ? "No pudimos verificar el acceso. Estamos reintentando…" : "Verificando acceso al pedido…"}</p></section></PublicShell>;

  return <PublicShell className="public-menu public-tracking" live="polite">
    <section className="brand-pattern brand-pattern--hero tracking-hero"><div className="public-menu__content"><Link className="tracking-back" href="/pedidos"><span aria-hidden="true">‹</span> Volver a Pedidos</Link><p className="eyebrow">Taco Loco · Seguimiento</p><h1>Pedido {tracking.orderCode}</h1>
      <section className={`tracking-current tracking-current--active${statusChanged ? " tracking-current--changed" : ""}`} aria-labelledby="tracking-current-title" aria-describedby="tracking-current-message"><p className="eyebrow">Estado actual</p><h2 id="tracking-current-title">{tracking.title}</h2><p id="tracking-current-message">{tracking.message}</p></section></div></section>
    <div className="public-menu__content">
      {error && <p role="status">Estamos intentando actualizar el estado…</p>}
      {tracking.fulfillment === "DELIVERY" && tracking.currentStage === "WAITING_PAYMENT_CONFIRMATION" && <section className="tracking-payment" aria-labelledby="tracking-payment-title"><h2 id="tracking-payment-title">¿Ya hiciste la transferencia?</h2><p>Informalo para que el local revise el ingreso. La confirmación final la realiza el operador.</p><button className="button" type="button" disabled={reportingPayment} onClick={() => void reportPayment()}>{reportingPayment ? "Informando…" : "Informé la transferencia"}</button>{paymentMessage && <p role="status">{paymentMessage}</p>}</section>}
      <section className="tracking-history" aria-labelledby="tracking-history-title"><h2 id="tracking-history-title">Historial</h2><ol>{tracking.history.map((event, index) => <li key={`${event.at}-${event.stage}-${index}`}><strong>{event.label}</strong><time dateTime={event.at} suppressHydrationWarning>{new Date(event.at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ol></section>
      <section className="tracking-summary" aria-labelledby="tracking-summary-title"><h2 id="tracking-summary-title">Pedido</h2>{tracking.lines.map((line, index) => <div key={`${line.name}-${index}`}><span>{line.quantity} × {line.name}</span>{line.modifiers.length > 0 && <small>{line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(" · ")}</small>}</div>)}<strong>Total: {formatPrice(tracking.totalAmount)}</strong></section>
    </div>
    {children}
  </PublicShell>;
}
