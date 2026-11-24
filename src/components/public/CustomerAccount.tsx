"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/public/GoogleSignInButton";
import { CustomerPreferences } from "@/components/public/CustomerPreferences";
import { PublicShell } from "@/components/public/PublicShell";
import { announceCustomerSessionChange, clearGuestOrders, finishTrackingHandoff, onCustomerSessionChange } from "@/modules/orders/tracking-resume";
import type { PublicCustomer } from "@/modules/auth/customer-types";
import styles from "./customer-profile.module.css";

type AccountState = "loading" | "visitor" | "authenticating" | "authenticated" | "error";
function invalidateGeneration(ref: { current: number }) { ref.current++; }
const profileRoutes = ["/cuenta/datos", "/cuenta/direcciones", "/cuenta/favoritos"] as const;
type ProfileRoute = (typeof profileRoutes)[number];
function validReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (profileRoutes.includes(value as ProfileRoute)) return value;
  // Preserve the existing one-shot order claim/tracking handoff.
  return /^\/pedido\/[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}` : parts[0]?.slice(0, 2) || "TL").toLocaleUpperCase();
}

export function CustomerAccount() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = validReturnTo(searchParams.get("returnTo"));
  const isProfileRoute = profileRoutes.includes(pathname as ProfileRoute);
  const [state, setState] = useState<AccountState>("loading");
  const [customer, setCustomer] = useState<PublicCustomer | null>(null);
  const [message, setMessage] = useState("");
  const sessionGeneration = useRef(0);
  const authRevision = useRef(0);
  const loginRevision = useRef(0);
  const mounted = useRef(true);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const loadSession = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const requestGeneration = ++sessionGeneration.current;
    if (!silent) setState("loading");
    try {
      const response = await fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" });
      if (requestGeneration !== sessionGeneration.current) return;
      if (response.status === 401) { setCustomer(null); setState("visitor"); return; }
      if (!response.ok) throw new Error("SESSION_LOOKUP_FAILED");
      const body = await response.json() as { authenticated?: boolean; customer?: PublicCustomer };
      if (!body.authenticated || !body.customer) throw new Error("SESSION_RESPONSE_INVALID");
      if (requestGeneration !== sessionGeneration.current) return;
      setCustomer(body.customer); setState("authenticated");
    } catch {
      if (requestGeneration === sessionGeneration.current && !silent) { setCustomer(null); setState("error"); }
    }
  }, []);
  // Session identity is checked on route entry and when the tab returns to the foreground.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadSession(); }, [pathname, loadSession]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onCustomerSessionChange(() => {
      authRevision.current++;
      sessionGeneration.current++;
      setCustomer(null);
      void loadSession();
    });
    const refresh = () => { if (document.visibilityState === "visible") void loadSession({ silent: true }); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { mounted.current = false; invalidateGeneration(authRevision); invalidateGeneration(sessionGeneration); unsubscribe(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [loadSession]);

  const handleAuthenticated = useCallback((value: PublicCustomer) => {
    if (loginRevision.current !== authRevision.current || !mounted.current) return;
    // Invalidate any session GET started before this verified sign-in completed.
    sessionGeneration.current++;
    finishTrackingHandoff(); clearGuestOrders(); announceCustomerSessionChange();
    // The session event invalidates old in-flight reads; this callback carries the newly verified identity.
    setCustomer(value); setState("authenticated"); setMessage("Sesión iniciada correctamente.");
    if (returnTo) router.replace(returnTo); else router.refresh();
  }, [returnTo, router]);
  const handleAuthStatus = useCallback((status: "idle" | "loading" | "error") => {
    if (status === "loading") { loginRevision.current = authRevision.current; setState("authenticating"); }
    else if (status === "error") setState("visitor");
  }, []);
  const handleCustomerUpdated = useCallback((updated: PublicCustomer) => {
    setCustomer((current) => current?.id === updated.id ? updated : current);
  }, []);

  async function logout() {
    setMessage("");
    authRevision.current++;
    const logoutRevision = authRevision.current;
    const response = await fetch("/api/customer/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
    if (logoutRevision !== authRevision.current || !mounted.current) return;
    if (!response?.ok) { setMessage("No pudimos cerrar la sesión. Intentá nuevamente."); return; }
    sessionGeneration.current++;
    finishTrackingHandoff(); clearGuestOrders(); announceCustomerSessionChange();
    setCustomer(null); setState("visitor"); setMessage("Sesión cerrada.");
    if (isProfileRoute) router.replace("/cuenta");
  }

  return <PublicShell className={`public-shell ${styles.page}`}>
    {state === "loading" && <section className={styles.panel} aria-busy="true"><p role="status">Verificando tu sesión…</p></section>}
    {state === "error" && <section className={styles.panel}><h1>Mi cuenta</h1><p className={styles.error} role="alert">No pudimos verificar tu sesión.</p><button className="button button--secondary" type="button" onClick={() => void loadSession()}>Reintentar</button></section>}
    {state === "visitor" || state === "authenticating" ? <section className={styles.panel} aria-labelledby="account-title">
      <p className="eyebrow">Taco Club</p><h1 id="account-title">Mi cuenta</h1>
      <p className={styles.muted}>Al iniciar sesión podés guardar tus pedidos vinculados, direcciones y favoritos.</p>
      <GoogleSignInButton onStatusChange={handleAuthStatus} onAuthenticated={handleAuthenticated} />
      {state === "authenticating" && <p role="status" aria-live="polite">Validando tu cuenta…</p>}
      {message && <p role="status">{message}</p>}
      <Link className="button button--secondary" href="/menu">Seguir comprando</Link>
      {isProfileRoute && <p className={styles.muted}>Iniciá sesión para continuar a esta sección.</p>}
    </section> : null}
    {state === "authenticated" && customer && (isProfileRoute ? <CustomerPreferences key={customer.id} customer={customer} onCustomerUpdated={handleCustomerUpdated} section={pathname as ProfileRoute} /> : <>
      <section className={`${styles.panel} ${styles.identity}`} aria-labelledby="account-title">
        {customer.avatarUrl && failedAvatarUrl !== customer.avatarUrl ? <img className={styles.avatar} src={customer.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatarUrl(customer.avatarUrl)} /> : <span className={styles.avatarFallback} aria-hidden="true">{initials(customer.displayName)}</span>}
        <div className={styles.identityText}><p className="eyebrow">Taco Club</p><h1 id="account-title">{customer.displayName?.trim() || "Mi cuenta"}</h1><p className={styles.muted}>{customer.email}</p></div>
      </section>
      <nav className={styles.panel} aria-label="Secciones de mi cuenta">
        <AccountRow href="/cuenta/datos" title="Mis datos" detail="Nombre y datos de acceso" />
        <AccountRow href="/cuenta/direcciones" title="Mis direcciones" detail="Administrá tus direcciones guardadas" />
        <AccountRow href="/cuenta/favoritos" title="Mis favoritos" detail="Productos que guardaste" />
        <AccountRow id="customer-orders" href="/pedidos" title="Mis pedidos" detail="Consultá tus pedidos" />
      </nav>
      <section className={styles.panel}><button className="button button--secondary" type="button" onClick={() => void logout()}>Cerrar sesión</button>{message && <p role="status">{message}</p>}</section>
    </>)}
  </PublicShell>;
}

function AccountRow({ href, title, detail, id }: { href: string; title: string; detail: string; id?: string }) {
  return <Link className={styles.row} href={href} id={id}><span><strong>{title}</strong><small>{detail}</small></span><span className={styles.chevron} aria-hidden="true">›</span></Link>;
}
