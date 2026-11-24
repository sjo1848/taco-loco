"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { readTrackingReference, recentGuestTrackingKey, trackingChangedEvent, trackingSessionStorage } from "@/modules/orders/tracking-resume";

export function PublicNavigation({ cartCount = 0, onCartClick, authenticated }: { cartCount?: number; onCartClick?: () => void; authenticated?: boolean }) {
  const [guestPath, setGuestPath] = useState<string | null>(null);
  const [accountHash, setAccountHash] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const refresh = async () => {
      const revision = ++generation;
      setAccountHash(window.location.hash);
      const recent = readTrackingReference(trackingSessionStorage(), recentGuestTrackingKey);
      if (!recent || authenticated === true) {
        setGuestPath(null);
        return;
      }
      // Do not offer a guest capability while the browser has an authenticated account.
      try {
        const session = await fetch("/api/customer/auth/session", { cache: "no-store" });
        if (!cancelled && revision === generation) setGuestPath(session.status === 401 ? recent.path : null);
      } catch { if (!cancelled && revision === generation) setGuestPath(null); }
    };
    const timer = window.setTimeout(() => void refresh(), 0);
    const onRefresh = () => { void refresh(); };
    for (const event of ["focus", "pageshow", "hashchange", "popstate", trackingChangedEvent]) window.addEventListener(event, onRefresh);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const event of ["focus", "pageshow", "hashchange", "popstate", trackingChangedEvent]) window.removeEventListener(event, onRefresh);
    };
  }, [authenticated, pathname]);

  const menuActive = pathname === "/menu";
  const orderHistoryActive = pathname === "/cuenta" && accountHash === "#customer-orders";
  const accountActive = pathname === "/cuenta" && !orderHistoryActive;
  const ordersActive = Boolean(pathname?.startsWith("/pedido/") || orderHistoryActive);
  const ordersHref = authenticated !== true && guestPath ? guestPath : "/cuenta#customer-orders";
  const cartHref = "/menu?carrito=1";
  const cartControl = onCartClick
    ? <button className="public-navigation__cart" type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}><span aria-hidden="true">🛒</span> Carrito{cartCount > 0 && <span className="public-navigation__count">{cartCount}</span>}</button>
    : <Link className="public-navigation__cart" href={cartHref}><span aria-hidden="true">🛒</span> Carrito</Link>;

  return <>
    <header className="public-navigation" aria-label="Navegación principal">
      <Link className="public-navigation__brand" href="/menu"><Image className="public-navigation__logo" src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={42} height={42} priority /><span><strong>Taco Loco</strong><small>Menú digital</small></span></Link>
      <nav className="public-navigation__links" aria-label="Secciones principales">
        <Link className="public-navigation__desktop-link" href="/menu" aria-current={menuActive ? "page" : undefined}>Menú</Link>
        <Link className="public-navigation__desktop-link" href={ordersHref} prefetch={false} onClick={() => setAccountHash(ordersHref.endsWith("#customer-orders") ? "#customer-orders" : "")} aria-current={ordersActive ? "page" : undefined}>Pedidos</Link>
        <Link className="public-navigation__desktop-link" href="/cuenta" onClick={() => setAccountHash("")} aria-current={accountActive ? "page" : undefined}>Cuenta</Link>
        {cartControl}
      </nav>
    </header>
    <nav className="public-bottom-nav" aria-label="Navegación de la app">
      <Link className={menuActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/menu" aria-current={menuActive ? "page" : undefined}><span aria-hidden="true">⌂</span><small>Menú</small></Link>
      <Link className={ordersActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href={ordersHref} prefetch={false} onClick={() => setAccountHash(ordersHref.endsWith("#customer-orders") ? "#customer-orders" : "")} aria-current={ordersActive ? "page" : undefined}><span aria-hidden="true">▣</span><small>Pedidos</small></Link>
      <Link className={accountActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/cuenta" onClick={() => setAccountHash("")} aria-current={accountActive ? "page" : undefined}><span aria-hidden="true">◎</span><small>Cuenta</small></Link>
      {onCartClick
        ? <button className="public-bottom-nav__item" type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}><span aria-hidden="true">🛒</span><small>Carrito{cartCount ? ` (${cartCount})` : ""}</small></button>
        : <Link className="public-bottom-nav__item" href={cartHref}><span aria-hidden="true">🛒</span><small>Carrito</small></Link>}
    </nav>
  </>;
}
