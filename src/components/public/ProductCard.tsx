"use client";
import Image from "next/image";
import { AvailabilityBadge } from "@/components/public/AvailabilityBadge";
import { ModifierHint } from "@/components/public/ModifierHint";

type Product = { id: string; name: string; description: string | null; priceAmount: number; available: boolean; featured: boolean; imageKey: string | null; imageAlt: string | null; modifiers: Array<{ name: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: string[] }> };

function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }

export function ProductCard({ product, featured = false, onAdd, added = false }: { product: Product; featured?: boolean; onAdd?: (product: Product) => void; added?: boolean }) {
  const imageUrl = product.imageKey ? `/api/media/products/${product.imageKey.split("/").map(encodeURIComponent).join("/")}` : null;
  return <article className={`product-card${featured ? " product-card--featured" : ""}${!product.available ? " product-card--sold-out" : ""}${added ? " product-card--added" : ""}`}>
    <div className="product-card__content">
      <div className="product-card__heading"><h3>{product.name}</h3><AvailabilityBadge available={product.available} /></div>
      {product.description && <p className="product-card__description">{product.description}</p>}
      {product.modifiers.length > 0 && <div className="product-card__modifiers">{product.modifiers.map((modifier) => <ModifierHint key={modifier.name} modifier={modifier} />)}</div>}
      <div className="product-card__footer"><p className="product-card__price">{formatPrice(product.priceAmount)}</p>{onAdd && <button className={`product-card__add${added ? " product-card__add--added" : ""}`} type="button" disabled={!product.available} onClick={() => onAdd(product)}>{added ? "Agregado" : product.available ? "Agregar" : "Agotado"}</button>}</div>
    </div>
    {imageUrl && <div className="product-card__media"><Image src={imageUrl} alt={product.imageAlt ?? `Imagen de ${product.name}`} width={104} height={104} unoptimized /></div>}
  </article>;
}
