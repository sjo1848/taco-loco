import { ProductCard } from "@/components/public/ProductCard";

type Featured = Parameters<typeof ProductCard>[0]["product"];

export function FeaturedProductCard({ product, onAdd, added }: { product: Featured; onAdd?: (product: Featured) => void; added?: boolean }) { return <ProductCard product={product} featured onAdd={onAdd} added={added} />; }
