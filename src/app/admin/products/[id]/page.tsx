import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { categoryRepository, productRepository } from "@/modules/catalog/repository";
import { getCurrentAdmin } from "@/modules/auth/session";
export const dynamic = "force-dynamic";
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) { const {id}=await params;if (!await getCurrentAdmin()) redirect(`/admin/login?returnTo=${encodeURIComponent(`/admin/products/${id}`)}`); const product = await productRepository.findById(id); if (!product) notFound(); const categories = await categoryRepository.list(); return <main className="admin-page"><div className="admin-header"><div><p className="eyebrow">Administración</p><h1>Editar producto</h1></div></div><section className="admin-panel admin-panel--form"><ProductForm categories={categories} product={product} /></section></main>; }
