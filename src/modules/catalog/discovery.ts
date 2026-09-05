export type DiscoverableCategory = { id: string; name: string; slug: string; products: Array<{ name: string; description: string | null }> };

export function filterCatalog<T extends DiscoverableCategory>(categories: T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase("es-AR");
  if (!normalized) return categories;
  return categories.map((category) => ({ ...category, products: category.products.filter((product) => `${category.name} ${product.name} ${product.description ?? ""}`.toLocaleLowerCase("es-AR").includes(normalized)) })).filter((category) => category.products.length > 0);
}
