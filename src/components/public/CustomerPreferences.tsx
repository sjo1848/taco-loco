"use client";

import { useEffect, useState } from "react";

type Address = { id: string; label: string; address: string; reference: string | null };
type Favorite = { id: string; name: string; priceAmount: number; available: boolean; published: boolean; archived: boolean; category: string };
type Preferences = { addresses: Address[]; favorites: Favorite[] };
const emptyForm = { label: "", address: "", reference: "" };

export function CustomerPreferences() {
  const [data, setData] = useState<Preferences>({ addresses: [], favorites: [] });
  const [form, setForm] = useState(emptyForm); const [editing, setEditing] = useState<string | null>(null); const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/customer/preferences", { credentials: "same-origin", cache: "no-store" }); if (response.ok) setData(await response.json()); }
  // Preferences are synchronized with the authenticated session on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) { event.preventDefault(); setMessage(""); const url = editing ? `/api/customer/preferences/${editing}` : "/api/customer/preferences"; const response = await fetch(url, { method: editing ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); if (!response.ok) { setMessage("No pudimos guardar la dirección."); return; } setForm(emptyForm); setEditing(null); setMessage("Dirección guardada."); await load(); }
  async function remove(id: string) { const response = await fetch(`/api/customer/preferences/${id}`, { method: "DELETE", credentials: "same-origin" }); if (response.ok) await load(); }
  async function toggleFavorite(productId: string, favorite: boolean) { const response = await fetch(`/api/customer/favorites/${productId}`, { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ favorite }) }); if (response.ok) await load(); }
  return <section className="public-panel" aria-labelledby="preferences-title"><p className="eyebrow">Taco Club</p><h2 id="preferences-title">Preferencias</h2><h3>Direcciones guardadas</h3>{data.addresses.map((item) => <article key={item.id}><strong>{item.label}</strong><p>{item.address}{item.reference ? ` · ${item.reference}` : ""}</p><button className="button button--secondary" type="button" onClick={() => { setEditing(item.id); setForm({ label: item.label, address: item.address, reference: item.reference ?? "" }); }}>Editar</button> <button className="button button--secondary" type="button" onClick={() => void remove(item.id)}>Eliminar</button></article>)}<form onSubmit={save}><label>Etiqueta<input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label><label>Dirección<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label><label>Referencia opcional<input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label><button className="button" type="submit">{editing ? "Actualizar dirección" : "Guardar dirección"}</button>{editing && <button className="button button--secondary" type="button" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancelar</button>}</form>{message && <p role="status">{message}</p>}<h3>Favoritos</h3>{data.favorites.length === 0 ? <p className="selection-help">Todavía no guardaste favoritos. Podés administrar favoritos desde el menú cuando inicies sesión.</p> : data.favorites.map((item) => <article key={item.id}><strong>{item.name}</strong><p>{item.category} · {item.available && item.published && !item.archived ? "Disponible" : "No disponible actualmente"}</p><button className="button button--secondary" type="button" onClick={() => void toggleFavorite(item.id, false)}>Quitar favorito</button></article>)}</section>;
}
