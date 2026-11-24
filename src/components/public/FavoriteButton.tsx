"use client";

import Link from "next/link";
import { useState } from "react";
import { updateFavorite, useFavorites } from "./favorites-store";

export function FavoriteButton({ productId }: { productId: string }) {
  const { status, items, viewerId, reload } = useFavorites();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ viewerId: string | null; message: string } | null>(null);
  const favorite = items.some(item => item.id === productId);
  if (status === "guest") return <Link className="product-card__favorite" href="/cuenta" aria-label="Ingresá para guardar favoritos">☆ Guardar</Link>;

  async function toggle() {
    if (pending) return;
    if (status === "error") { reload(); return; }
    setPending(true);
    const result = await updateFavorite(productId, !favorite, viewerId);
    if (result !== "stale") setFeedback({ viewerId, message: result === "ok" ? favorite ? "Quitado" : "Guardado" : "No pudimos actualizar el favorito." });
    setPending(false);
  }

  return <span className="product-card__favorite-control">
    <button className="product-card__favorite" type="button" aria-pressed={favorite} disabled={pending || status === "loading"} onClick={() => void toggle()}>{status === "error" ? "Reintentar favoritos" : favorite ? "★ Favorito" : "☆ Guardar"}</button>
    {feedback && feedback.viewerId === viewerId && <small className="sr-only" role="status">{feedback.message}</small>}
  </span>;
}
