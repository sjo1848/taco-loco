import { redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { categoryRepository } from "@/modules/catalog/repository";
import { getCurrentAdmin } from "@/modules/auth/session";
export const dynamic = "force-dynamic";
export default async function NewProductPage() { if (!await getCurrentAdmin()) redirect("/admin/login"); const categories = await categoryRepository.list(); return <main className="admin-page"><div className="admin-header"><div><p className="eyebrow">Administración</p><h1>Nuevo producto</h1></div></div><section className="admin-panel admin-panel--form"><ProductForm categories={categories} /></section></main>; }
