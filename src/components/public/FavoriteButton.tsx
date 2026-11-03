"use client";

import { useEffect, useState } from "react";

let favoritesPromise: Promise<Set<string> | null> | null = null;
function loadFavorites() {
  favoritesPromise ??= fetch("/api/customer/preferences", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
    if (!response.ok) return null;
    const body = await response.json() as { favorites?: Array<{ id: string }> };
    return new Set((body.favorites ?? []).map((favorite) => favorite.id));
  }).catch(() => null);
  return favoritesPromise;
}

export function FavoriteButton({ productId }: { productId: string }) {
  const [favorite, setFavorite] = useState(false); const [message, setMessage] = useState("");
  // One shared request hydrates all cards without exposing preference data to the public API.
  useEffect(() => { void loadFavorites().then((favorites) => { if (favorites) setFavorite(favorites.has(productId)); }); }, [productId]);
  async function toggle() { const response = await fetch(`/api/customer/favorites/${productId}`, { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ favorite: !favorite }) }); if (response.status === 401) { setMessage("Iniciá sesión para guardar favoritos."); return; } if (response.ok) { setFavorite(!favorite); setMessage(!favorite ? "Guardado" : "Quitado"); } }
  return <span><button className="product-card__favorite" type="button" aria-pressed={favorite} onClick={() => void toggle()}>{favorite ? "★ Favorito" : "☆ Guardar"}</button>{message && <small role="status"> {message}</small>}</span>;
}
