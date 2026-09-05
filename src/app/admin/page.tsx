import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/modules/auth/session";
import { productRepository } from "@/modules/catalog/repository";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  const products = await productRepository.list();
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Taco Loco</p><h1>Productos</h1></div><div className="admin-header-actions"><Link className="admin-button admin-button--secondary" href="/admin/orders">Pedidos</Link><Link className="admin-button admin-button--secondary" href="/admin/categories">Categorías</Link><Link className="admin-button admin-button--secondary" href="/admin/settings">WhatsApp</Link><Link className="admin-button admin-button--primary" href="/admin/products/new">Nuevo producto</Link><LogoutButton /></div></header><p className="admin-user">Sesión activa: {user.email}</p><ProductsManager products={products} /></main>;
}
