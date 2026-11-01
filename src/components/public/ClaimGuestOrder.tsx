"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ClaimState = "loading" | "visitor" | "authenticated" | "confirming" | "claimed" | "error";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function ClaimGuestOrder({ token }: { token: string }) {
  const [state, setState] = useState<ClaimState>(() => tokenPattern.test(token) ? "loading" : "error");
  const [message, setMessage] = useState("");
  const returnPath = `/pedido/${token}`;
  useEffect(() => {
    let active = true;
    if (!tokenPattern.test(token)) return () => { active = false; };
    void fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" }).then((response) => { if (active) setState(response.status === 401 ? "visitor" : response.ok ? "authenticated" : "error"); }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [token]);
  async function claim() {
    setState("confirming"); setMessage("");
    try {
      const response = await fetch(`/api/customer/orders/${token}/claim`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      if (response.status === 200) { setState("claimed"); setMessage("Pedido guardado en tu cuenta."); return; }
      if (response.status === 409) { setState("error"); setMessage("Este pedido ya está asociado a otra cuenta."); return; }
      if (response.status === 401) { setState("visitor"); setMessage("Iniciá sesión para guardar este pedido."); return; }
      setState("error"); setMessage("No pudimos guardar este pedido.");
    } catch { setState("error"); setMessage("No pudimos guardar este pedido."); }
  }
  if (state === "loading") return <section className="tracking-claim" aria-live="polite"><p>Verificando si podés guardar este pedido…</p></section>;
  if (state === "claimed") return <section className="tracking-claim" aria-live="polite"><p role="status">{message}</p><Link className="button" href="/cuenta">Ver mis pedidos</Link></section>;
  if (state === "visitor") return <section className="tracking-claim"><h2>Guardá este pedido</h2><p>Iniciá sesión en Taco Club para conservarlo en tu historial.</p><Link className="button" href={`/cuenta?returnTo=${encodeURIComponent(returnPath)}`}>Iniciar sesión para guardar</Link>{message && <p role="status">{message}</p>}</section>;
  if (state === "authenticated") return <section className="tracking-claim"><h2>Guardá este pedido</h2><p>Podés asociarlo voluntariamente a tu cuenta de Taco Club.</p><button className="button" type="button" onClick={() => setState("confirming")}>Guardar en mi cuenta</button></section>;
  if (state === "confirming") return <section className="tracking-claim"><h2>Confirmá la vinculación</h2><p>Este pedido quedará asociado a tu cuenta y aparecerá en “Mis pedidos”.</p><div className="selection-actions"><button className="button" type="button" onClick={() => void claim()}>Sí, guardarlo</button><button className="button button--secondary" type="button" onClick={() => setState("authenticated")}>Cancelar</button></div></section>;
  return <section className="tracking-claim" role="alert"><p>{message || "No pudimos verificar este pedido."}</p></section>;
}
