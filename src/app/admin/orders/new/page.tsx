import { redirect } from "next/navigation";
import { OrderForm } from "@/components/admin/OrderForm";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/modules/auth/session";

export const dynamic = "force-dynamic";
type CatalogProduct = { id: string; name: string; priceAmount: number; imageKey: string | null; category: { name: string }; modifierGroups: Array<{ required: boolean; modifierGroup: { name: string; options: Array<{ name: string }> } }> };

export default async function NewOrderPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login?returnTo=%2Fadmin%2Forders%2Fnew");
  const products = await db.product.findMany({ where: { archivedAt: null, published: true, available: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }], include: { category: { select: { name: true } }, modifierGroups: { include: { modifierGroup: { include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } } } } } });
  const formProducts = (products as unknown as CatalogProduct[]).map((product: CatalogProduct) => ({ id: product.id, name: product.name, priceAmount: product.priceAmount, imageKey: product.imageKey, categoryName: product.category.name, modifierGroups: product.modifierGroups.map((relation) => ({ name: relation.modifierGroup.name, required: relation.required, options: relation.modifierGroup.options.map((option) => option.name) })) }));
  return <main className="admin-page"><h1 className="visually-hidden">Nuevo pedido</h1><section className="admin-panel admin-panel--form"><OrderForm products={formProducts} /></section></main>;
}
