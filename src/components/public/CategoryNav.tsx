"use client";

import { useEffect, useState } from "react";

export function CategoryNav({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const [activeId, setActiveId] = useState("");
  const categoryIds = JSON.stringify(categories.map(({ id }) => id));

  useEffect(() => {
    const ids: string[] = JSON.parse(categoryIds);
    const sections = ids.map((id) => document.getElementById(`category-${id}`)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const sync = () => {
      const nav = document.querySelector(".category-nav");
      const offset = (nav?.getBoundingClientRect().bottom ?? 120) + 16;
      const current = sections.findLast((section) => section.getBoundingClientRect().top <= offset) ?? sections[0];
      setActiveId(current.id.slice("category-".length));
    };
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", sync); window.removeEventListener("resize", sync); };
  }, [categoryIds]);

  if (!categories.length) return null;
  const selected = categories.some(({ id }) => id === activeId) ? activeId : categories[0].id;
  return <nav className="category-nav" aria-label="Categorías del menú"><div className="category-nav__scroll">{categories.map((category) => <a className={`category-chip${selected === category.id ? " category-chip--active" : ""}`} href={`#category-${category.id}`} aria-current={selected === category.id ? "location" : undefined} onClick={() => setActiveId(category.id)} key={category.id}>{category.name}</a>)}</div></nav>;
}
