import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { OrderForm } from "@/components/admin/OrderForm";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/modules/auth/session";

export const dynamic = "force-dynamic";
type CatalogProduct = { id: string; name: string; priceAmount: number; modifierGroups: Array<{ required: boolean; modifierGroup: { name: string; options: Array<{ name: string }> } }> };

export default async function NewOrderPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  const products = await db.product.findMany({ where: { archivedAt: null, published: true, available: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }], include: { modifierGroups: { include: { modifierGroup: { include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } } } } });
  const formProducts = (products as unknown as CatalogProduct[]).map((product: CatalogProduct) => ({ id: product.id, name: product.name, priceAmount: product.priceAmount, modifierGroups: product.modifierGroups.map((relation) => ({ name: relation.modifierGroup.name, required: relation.required, options: relation.modifierGroup.options.map((option) => option.name) })) }));
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Taco Loco · Operación</p><h1>Nuevo pedido</h1></div><div className="admin-header-actions"><Link className="admin-button admin-button--secondary" href="/admin/orders">Volver a pedidos</Link><LogoutButton /></div></header><p className="admin-user">Sesión activa: {user.email}</p><section className="admin-panel admin-panel--form"><OrderForm products={formProducts} /></section></main>;
}
