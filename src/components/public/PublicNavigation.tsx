"use client";

import { useEffect } from "react";
import { onCustomerSessionChange } from "@/modules/orders/tracking-resume";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function PublicNavigation({ cartCount = 0, onCartClick }: { cartCount?: number; onCartClick?: () => void }) {
  const pathname = usePathname();
  useEffect(() => onCustomerSessionChange(), []);
  const menuActive = pathname === "/menu";
  const accountActive = pathname === "/cuenta";
  const ordersActive = pathname === "/pedidos" || pathname?.startsWith("/pedidos/") || pathname?.startsWith("/pedido/");
  const ordersHref = "/pedidos";
  const cartHref = "/menu?carrito=1";
  const cartControl = onCartClick
    ? <button className="public-navigation__cart" type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}><span aria-hidden="true">🛒</span> Carrito{cartCount > 0 && <span className="public-navigation__count">{cartCount}</span>}</button>
    : <Link className="public-navigation__cart" href={cartHref}><span aria-hidden="true">🛒</span> Carrito</Link>;

  return <>
    <header className="public-navigation" aria-label="Navegación principal">
      <Link className="public-navigation__brand" href="/menu"><Image className="public-navigation__logo" src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={42} height={42} priority /><span><strong>Taco Loco</strong><small>Menú digital</small></span></Link>
      <nav className="public-navigation__links" aria-label="Secciones principales">
        <Link className="public-navigation__desktop-link" href="/menu" aria-current={menuActive ? "page" : undefined}>Menú</Link>
        <Link className="public-navigation__desktop-link" href={ordersHref} prefetch={false} aria-current={ordersActive ? "page" : undefined}>Pedidos</Link>
        <Link className="public-navigation__desktop-link" href="/cuenta" aria-current={accountActive ? "page" : undefined}>Cuenta</Link>
        {cartControl}
      </nav>
    </header>
    <nav className="public-bottom-nav" aria-label="Navegación de la app">
      <Link className={menuActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/menu" aria-current={menuActive ? "page" : undefined}><span aria-hidden="true">⌂</span><small>Menú</small></Link>
      <Link className={ordersActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href={ordersHref} prefetch={false} aria-current={ordersActive ? "page" : undefined}><span aria-hidden="true">▣</span><small>Pedidos</small></Link>
      <Link className={accountActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/cuenta" aria-current={accountActive ? "page" : undefined}><span aria-hidden="true">◎</span><small>Cuenta</small></Link>
      {onCartClick
        ? <button className="public-bottom-nav__item" type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}><span aria-hidden="true">🛒</span><small>Carrito{cartCount ? ` (${cartCount})` : ""}</small></button>
        : <Link className="public-bottom-nav__item" href={cartHref}><span aria-hidden="true">🛒</span><small>Carrito</small></Link>}
    </nav>
  </>;
}
