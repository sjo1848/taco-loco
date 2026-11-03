"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readActiveTrackingResume } from "@/modules/orders/tracking-resume";

export function PublicNavigation({ cartCount = 0, onCartClick }: { cartCount?: number; onCartClick?: () => void }) {
  const [trackingPath, setTrackingPath] = useState<string | null>(null);

  useEffect(() => {
    const resume = readActiveTrackingResume(window.localStorage);
    // Browser storage is an external synchronization boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrackingPath(resume?.path ?? null);
  }, []);

  return <nav className="public-navigation" aria-label="Navegación principal">
    <Link className="public-navigation__brand" href="/menu">Taco Loco</Link>
    <div className="public-navigation__links">
      <Link href="/menu">Menú</Link>
      {onCartClick ? <button type="button" onClick={onCartClick} aria-label={`Abrir carrito${cartCount ? `, ${cartCount} productos` : ""}`}>Carrito{cartCount > 0 && <span className="public-navigation__count">{cartCount}</span>}</button> : <Link href="/menu">Carrito{cartCount > 0 && <span className="public-navigation__count">{cartCount}</span>}</Link>}
      {trackingPath && <Link href={trackingPath}>Seguimiento</Link>}
      <Link href="/cuenta">Mi cuenta</Link>
    </div>
  </nav>;
}
