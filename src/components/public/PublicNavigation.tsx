"use client";

import { useEffect, useState } from "react";
import { onCustomerSessionChange, trackingSessionStorage } from "@/modules/orders/tracking-resume";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

function readCartCount() {
  try {
    const lines = JSON.parse(trackingSessionStorage()?.getItem("taco-loco-selection") ?? "[]") as unknown;
    if (Array.isArray(lines)) return lines.reduce<number>((sum, line) => sum + (
      line && typeof line.productId === "string" && Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0
    ), 0);
  } catch { /* Session storage may be unavailable. */ }
  return 0;
}

export function PublicNavigation({ cartCount, onCartClick, cartOpen = false }: { cartCount?: number; onCartClick?: () => void; cartOpen?: boolean }) {
  const pathname = usePathname();
  const [storedCount, setStoredCount] = useState(0);
  useEffect(() => onCustomerSessionChange(), []);
  useEffect(() => {
    if (cartCount !== undefined) return;
    const refresh = () => setStoredCount(readCartCount());
    const initial = window.setTimeout(refresh, 0);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => { clearTimeout(initial); window.removeEventListener("pageshow", refresh); window.removeEventListener("focus", refresh); };
  }, [cartCount]);

  const count = cartCount ?? storedCount;
  const menuActive = !cartOpen && pathname === "/menu";
  const accountActive = pathname === "/cuenta" || pathname?.startsWith("/cuenta/");
  const ordersActive = pathname === "/pedidos" || pathname?.startsWith("/pedidos/") || pathname?.startsWith("/pedido/");
  const tab = (label: string, icon: string, href: string, active?: boolean) => (
    <Link className={`public-bottom-nav__item${active ? " public-bottom-nav__item--active" : ""}`} href={href} prefetch={false} aria-current={active ? "page" : undefined}>
      <span aria-hidden="true">{icon}</span><small>{label}</small>
    </Link>
  );
  function cartControl(desktop = false) {
    const label = desktop ? <><span aria-hidden="true">🛒</span> Carrito{count > 0 && <span className="public-navigation__count">{count}</span>}</>
      : <><span aria-hidden="true">🛒</span><small>Carrito{count > 0 ? ` (${count})` : ""}</small></>;
    const props = { className: desktop ? "public-navigation__cart" : `public-bottom-nav__item${cartOpen ? " public-bottom-nav__item--active" : ""}`,
      "aria-current": cartOpen ? "page" as const : undefined };
    return onCartClick
      ? <button {...props} type="button" onClick={onCartClick} aria-haspopup="dialog" aria-label={`Abrir carrito${count ? `, ${count} ${count === 1 ? "producto" : "productos"}` : ""}`}>{label}</button>
      : <Link {...props} href="/menu?carrito=1" prefetch={false}>{label}</Link>;
  }

  return <>
    <header className="public-navigation" aria-label="Navegación principal">
      <Link className="public-navigation__brand" href="/menu"><Image className="public-navigation__logo" src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={42} height={42} priority /><span><strong>Taco Loco</strong><small>Menú digital</small></span></Link>
      <nav className="public-navigation__links" aria-label="Secciones principales">
        <Link href="/menu" aria-current={menuActive ? "page" : undefined}>Menú</Link>
        <Link href="/pedidos" prefetch={false} aria-current={ordersActive ? "page" : undefined}>Pedidos</Link>
        <Link href="/cuenta" aria-current={accountActive ? "page" : undefined}>Cuenta</Link>
        {cartControl(true)}
      </nav>
    </header>
    <nav className="public-bottom-nav" aria-label="Navegación de la app">
      {tab("Menú", "⌂", "/menu", menuActive)}
      {tab("Pedidos", "▣", "/pedidos", ordersActive)}
      {cartControl()}
      {tab("Cuenta", "◎", "/cuenta", accountActive)}
    </nav>
  </>;
}
