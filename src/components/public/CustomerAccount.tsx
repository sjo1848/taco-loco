"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/public/GoogleSignInButton";
import type { PublicCustomer } from "@/modules/auth/customer-types";

type AccountState = "loading" | "visitor" | "authenticating" | "authenticated" | "error";

export function CustomerAccount() {
  const [state, setState] = useState<AccountState>("loading");
  const [customer, setCustomer] = useState<PublicCustomer | null>(null);
  const [message, setMessage] = useState("");

  const loadSession = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        setCustomer(null);
        setState("visitor");
        return;
      }
      if (!response.ok) throw new Error("SESSION_LOOKUP_FAILED");
      const body = await response.json() as { authenticated?: boolean; customer?: PublicCustomer };
      if (!body.authenticated || !body.customer) throw new Error("SESSION_RESPONSE_INVALID");
      setCustomer(body.customer);
      setState("authenticated");
    } catch {
      setCustomer(null);
      setState("error");
    }
  }, []);

  // The initial session lookup is an external synchronization boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadSession(); }, [loadSession]);

  const handleAuthenticated = useCallback((value: PublicCustomer) => {
    setCustomer(value);
    setState("authenticated");
    setMessage("Sesión iniciada correctamente.");
  }, []);

  const handleAuthStatus = useCallback((status: "idle" | "loading" | "error") => {
    if (status === "loading") setState("authenticating");
    else if (status === "error") setState("visitor");
  }, []);

  async function logout() {
    setMessage("");
    const response = await fetch("/api/customer/auth/logout", { method: "POST", credentials: "same-origin" });
    if (!response.ok) {
      setMessage("No pudimos cerrar la sesión. Intentá nuevamente.");
      return;
    }
    setCustomer(null);
    setState("visitor");
    setMessage("Sesión cerrada.");
  }

  return <main className="public-shell"><section className="public-panel" aria-labelledby="account-title">
    <p className="eyebrow">Taco Club</p>
    <h1 id="account-title">Tu cuenta, cuando quieras</h1>
    <p className="selection-help">Comprar como invitado sigue siendo siempre posible. El acceso al Taco Club es opcional.</p>
    {state === "loading" && <p className="selection-help" role="status" aria-live="polite">Verificando tu sesión…</p>}
    {state === "error" && <div role="alert"><p className="form-error">No pudimos verificar tu sesión.</p><button className="button button--secondary" type="button" onClick={() => void loadSession()}>Reintentar</button></div>}
    {(state === "visitor" || state === "authenticating") && <><GoogleSignInButton onStatusChange={handleAuthStatus} onAuthenticated={handleAuthenticated} />{state === "authenticating" && <p className="selection-help" role="status" aria-live="polite">Validando tu cuenta…</p>}<p className="selection-help" role="status" aria-live="polite">{message}</p></>}
    {state === "authenticated" && customer && <div className="customer-account" aria-live="polite"><p className="customer-account__welcome">¡Bienvenido{customer.displayName ? `, ${customer.displayName}` : " al Taco Club"}!</p><p className="selection-help">Tu sesión está activa en este navegador.</p><div className="selection-actions"><Link className="button" href="/menu">Ver menú</Link><button className="button button--secondary" type="button" onClick={logout}>Cerrar sesión</button></div>{message && <p className="selection-help" role="status">{message}</p>}</div>}
    <p className="selection-help"><Link href="/menu">Volver al menú</Link></p>
  </section></main>;
}
