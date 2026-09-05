import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/modules/auth/session";
import { categoryRepository } from "@/modules/catalog/repository";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
export const dynamic = "force-dynamic";
export default async function CategoriesPage() { if (!await getCurrentAdmin()) redirect("/admin/login"); return <main className="admin-page"><div className="admin-header"><div><p className="eyebrow">Administración</p><h1>Categorías</h1></div></div><CategoriesManager initial={await categoryRepository.listAll()} /></main>; }
