export function CategoryNav({ categories }: { categories: Array<{ id: string; name: string }> }) {
  return <nav className="category-nav" aria-label="Categorías del menú"><div className="category-nav__scroll">{categories.map((category) => <a className="category-chip" href={`#category-${category.id}`} key={category.id}>{category.name}</a>)}</div></nav>;
}
