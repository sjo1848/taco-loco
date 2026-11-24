"use client";

import type { ReactNode } from "react";
import { PublicNavigation } from "./PublicNavigation";

export function PublicShell({ children, className = "public-shell", cartCount, onCartClick, cartOpen, action, modal, live }: {
  children: ReactNode;
  className?: string;
  cartCount?: number;
  onCartClick?: () => void;
  cartOpen?: boolean;
  action?: ReactNode;
  modal?: ReactNode;
  live?: "polite";
}) {
  return <div className="public-frame">
    <div className={action ? "public-frame__body public-frame__body--action" : "public-frame__body"} inert={Boolean(modal)}>
      <PublicNavigation cartCount={cartCount} onCartClick={onCartClick} cartOpen={cartOpen} />
      <main className={className} aria-live={live}>{children}</main>
      {action}
    </div>
    {modal}
  </div>;
}
