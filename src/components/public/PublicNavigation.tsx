"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { readActiveTrackingResume } from "@/modules/orders/tracking-resume";

export function PublicNavigation({ cartCount = 0, onCartClick }: { cartCount?: number; onCartClick?: () => void }) {
  const [trackingPath, setTrackingPath] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const resume = readActiveTrackingResume(window.localStorage);
    // Browser storage is an external synchronization boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrackingPath(resume?.path ?? null);
  }, []);

  const menuActive = pathname === "/menu";
  const accountActive = pathname === "/cuenta";
  const ordersActive = Boolean(trackingPath && pathname?.startsWith("/pedido/"));
  const ordersHref = trackingPath ?? "/cuenta#customer-orders";

  return <>
    <header className="public-navigation" aria-label="Navegación principal">
      <Link className="public-navigation__brand" href="/menu"><Image className="public-navigation__logo" src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={42} height={42} priority /><span><strong>Taco Loco</strong><small>Menú digital</small></span></Link>
      <div className="public-navigation__links">
        {onCartClick ? <button className="public-navigation__cart" type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}><span aria-hidden="true">🛒</span> Carrito{cartCount > 0 && <span className="public-navigation__count">{cartCount}</span>}</button> : <Link className="public-navigation__cart" href="/menu"><span aria-hidden="true">🛒</span> Carrito</Link>}
      </div>
    </header>
    <nav className="public-bottom-nav" aria-label="Navegación de la app">
      <Link className={menuActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/menu" aria-current={menuActive ? "page" : undefined}><span aria-hidden="true">⌂</span><small>Menú</small></Link>
      <Link className={ordersActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href={ordersHref} aria-current={ordersActive ? "page" : undefined}><span aria-hidden="true">▣</span><small>Pedidos</small></Link>
      <Link className={accountActive ? "public-bottom-nav__item public-bottom-nav__item--active" : "public-bottom-nav__item"} href="/cuenta" aria-current={accountActive ? "page" : undefined}><span aria-hidden="true">◎</span><small>Cuenta</small></Link>
    </nav>
  </>;
}
