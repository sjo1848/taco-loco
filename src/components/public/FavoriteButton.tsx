"use client";

import { useState } from "react";
export function FavoriteButton({ productId }: { productId: string }) {
  const [favorite, setFavorite] = useState(false); const [message, setMessage] = useState("");
  async function toggle() { const response = await fetch(`/api/customer/favorites/${productId}`, { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ favorite: !favorite }) }); if (response.status === 401) { setMessage("Iniciá sesión para guardar favoritos."); return; } if (response.ok) { setFavorite(!favorite); setMessage(!favorite ? "Guardado" : "Quitado"); } }
  return <span><button className="product-card__favorite" type="button" aria-pressed={favorite} onClick={() => void toggle()}>{favorite ? "★ Favorito" : "☆ Guardar"}</button>{message && <small role="status"> {message}</small>}</span>;
}
