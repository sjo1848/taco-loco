"use client";

import { useEffect, useState } from "react";

export function CategoryNav({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [activeId, setActiveId] = useState(categories[0]?.id ?? "");

  useEffect(() => {
    const sections = categories.map((category) => document.getElementById(`category-${category.id}`)).filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveId(visible[0].target.id.replace("category-", ""));
    }, { rootMargin: "-132px 0px -58% 0px", threshold: [0, .2, .6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  return <nav className="category-nav" aria-label="Categorías del menú"><div className="category-nav__scroll">{categories.map((category) => <a className={`category-chip${activeId === category.id ? " category-chip--active" : ""}`} href={`#category-${category.id}`} aria-current={activeId === category.id ? "location" : undefined} onClick={() => setActiveId(category.id)} key={category.id}>{category.name}</a>)}</div></nav>;
}
