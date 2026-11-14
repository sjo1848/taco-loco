import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { getCurrentAdmin } from "@/modules/auth/session";
import { productRepository } from "@/modules/catalog/repository";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login?returnTo=%2Fadmin%2Fproducts");
  const products = await productRepository.list();
  return <main className="admin-page"><header className="admin-header"><Link className="admin-button admin-button--primary" href="/admin/products/new">+ Nuevo</Link></header><p className="admin-user">Sesión activa: {user.email}</p><ProductsManager products={products} /></main>;
}
