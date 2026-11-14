"use client";

import Link from "next/link";
import { usePathname,useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, History, Package, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./AdminShell.module.css";

const destinations = [
  { href: "/admin/orders", label: "Pedidos", Icon: ClipboardList },
  { href: "/admin/orders/history", label: "Historial", Icon: History },
  { href: "/admin/products", label: "Productos", Icon: Package },
  { href: "/admin/more", label: "Más", Icon: MoreHorizontal },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin/orders") return pathname.startsWith("/admin/orders") && !pathname.startsWith("/admin/orders/history");
  if (href === "/admin/products") return pathname.startsWith("/admin/products");
  if (href === "/admin/more") return pathname === "/admin/more" || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/settings");
  return pathname === href;
}

function title(path: string) {
  if (path === "/admin/orders") return "Pedidos";
  if (path.startsWith("/admin/orders/attention")) return "Necesitan atención";
  if (path.startsWith("/admin/orders/history")) return "Historial";
  if (path.startsWith("/admin/orders/new")) return "Nuevo pedido";
  if (path.startsWith("/admin/orders/")) return "Detalle del pedido";
  if (path.startsWith("/admin/products/new")) return "Nuevo producto";
  if (path.startsWith("/admin/products/")) return "Editar producto";
  if (path.startsWith("/admin/products")) return "Productos";
  if (path.startsWith("/admin/categories")) return "Categorías";
  if (path.startsWith("/admin/settings")) return "Configuración";
  return "Más";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const searchParams=useSearchParams();
  if (pathname === "/admin/login") return children;
  const currentTitle = title(pathname);
  const back = pathname !== "/admin/orders" && pathname !== "/admin/products" && pathname !== "/admin/more" && pathname !== "/admin/orders/history";
  const requestedBack=searchParams.get("back");
  const backHref=pathname.startsWith("/admin/orders/")&&requestedBack?.startsWith("/admin/orders/history")?requestedBack:pathname.startsWith("/admin/orders/")&&searchParams.get("from")==="attention"?"/admin/orders/attention":pathname.startsWith("/admin/orders/")?"/admin/orders":pathname.startsWith("/admin/products/")?"/admin/products":"/admin/more";
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Navegación administrativa">
      <Link className={styles.wordmark} href="/admin/orders">TACO <span>LOCO</span></Link>
      <nav>{destinations.map(({ href, label, Icon }) => { const active = isActive(href, pathname); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? styles.active : ""}><Icon size={20} strokeWidth={2.1}/><span>{label}</span></Link>; })}</nav>
    </aside>
    <div className={styles.app}>
      <header className={styles.topbar}>
        {back && <Link href={backHref} className={styles.back} aria-label="Volver"><ArrowLeft size={20}/></Link>}
        <strong>{currentTitle}</strong>
        <span className={styles.topbarSpacer}/>
      </header>
      {children}
      <nav className={styles.bottomNav} aria-label="Navegación administrativa móvil">{destinations.map(({ href, label, Icon }) => { const active = isActive(href, pathname); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? styles.bottomActive : ""}><Icon size={21}/><span>{label}</span></Link>; })}</nav>
    </div>
  </div>;
}
