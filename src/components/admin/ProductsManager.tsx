"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Product = { id: string; name: string; priceAmount: number; available: boolean; published: boolean; featured: boolean; category: { name: string } };

export function ProductsManager({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState(products);
  const categories = [...new Set(items.map((product) => product.category.name))];
  const filtered = useMemo(() => items.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()) && (category === "all" || product.category.name === category)), [items, query, category]);
  async function toggleAvailability(product: Product) { const available = !product.available; setItems((current) => current.map((item) => item.id === product.id ? { ...item, available } : item)); const response = await fetch(`/api/admin/products/${product.id}/availability`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ available }) }); if (!response.ok) setItems((current) => current.map((item) => item.id === product.id ? { ...item, available: product.available } : item)); }
  return <section className="admin-panel"><div className="admin-toolbar"><label className="sr-only" htmlFor="product-search">Buscar producto</label><input id="product-search" placeholder="Buscar producto…" value={query} onChange={(event) => setQuery(event.target.value)} /><label className="sr-only" htmlFor="product-category">Filtrar categoría</label><select id="product-category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas las categorías</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div className="admin-product-list">{filtered.map((product) => <article className="admin-product-row" key={product.id}><div><h3>{product.name}</h3><p>{product.category.name} · ${product.priceAmount.toLocaleString("es-AR")}</p></div><div className="admin-product-actions"><span className={product.published ? "admin-status admin-status--published" : "admin-status"}>{product.published ? "Publicado" : "Oculto"}</span><button className="admin-toggle" onClick={() => toggleAvailability(product)} aria-pressed={product.available}>{product.available ? "Disponible" : "Agotado"}</button><Link className="admin-button admin-button--secondary" href={`/admin/products/${product.id}`}>Editar</Link></div></article>)}{filtered.length === 0 && <p className="admin-empty">No encontramos productos con esos filtros.</p>}</div></section>;
}
