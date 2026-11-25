"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateFavorite, useFavorites, type Favorite } from "@/components/public/favorites-store";
import { PublicPageHeader } from "@/components/public/PublicPageHeader";
import type { PublicCustomer } from "@/modules/auth/customer-types";
import { resolveStaticProductAsset } from "@/modules/media/static-assets";
import styles from "./customer-profile.module.css";

type Address = { id: string; label: string; address: string; reference: string | null };
type ProfileRoute = "/cuenta/datos" | "/cuenta/direcciones" | "/cuenta/favoritos";
type Section = "datos" | "direcciones" | "favoritos";
const labels: Record<Section, string> = { datos: "Datos personales", direcciones: "Direcciones", favoritos: "Favoritos" };
const emptyForm = { label: "", address: "", reference: "" };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function CustomerPreferences({ section, customer, onCustomerUpdated }: { section: ProfileRoute; customer: PublicCustomer; onCustomerUpdated: (customer: PublicCustomer) => void }) {
  const router = useRouter();
  const active = section.slice("/cuenta/".length) as Section;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draftName, setDraftName] = useState(customer.displayName ?? "");
  const [nameEditing, setNameEditing] = useState(false);
  const [favoritesBusy, setFavoritesBusy] = useState<string | null>(null);
  const favoriteState = useFavorites({ enabled: active === "favoritos" });
  const requestGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoading(true); setLoadError(false);
    try {
      if (active === "direcciones") {
        const prefsResponse = await fetch("/api/customer/preferences", { credentials: "same-origin", cache: "no-store" });
        if (generation !== requestGeneration.current) return;
        if (prefsResponse.status === 401) { router.replace(`/cuenta?returnTo=${encodeURIComponent(section)}`); return; }
        if (!prefsResponse.ok) throw new Error("PREFERENCES_LOOKUP_FAILED");
        const data = await prefsResponse.json() as { addresses?: Address[]; viewerId?: string };
        if (generation !== requestGeneration.current) return;
        if (data.viewerId !== customer.id) { setLoadError(true); return; }
        setAddresses(data.addresses ?? []);
      }
    } catch { if (generation === requestGeneration.current) setLoadError(true); }
    finally { if (generation === requestGeneration.current) setLoading(false); }
  }, [active, customer.id, router, section]);
  // Private profile data is loaded from the current authenticated session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => { requestGeneration.current++; }, []);

  const dirtyName = useMemo(() => draftName !== (customer.displayName ?? ""), [customer.displayName, draftName]);
  const hasUnsavedChanges = (dirtyName && nameEditing) || (formOpen && (form.label !== "" || form.address !== "" || form.reference !== ""));
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === "_blank"
        || new URL(link.href).pathname === window.location.pathname) return;
      if (window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?")) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, [hasUnsavedChanges]);
  function confirmDiscard() {
    return !hasUnsavedChanges || window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?");
  }
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const handlePopState = () => {
      if (window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?")) return;
      window.history.pushState(window.history.state, "", currentUrl);
      router.replace(currentUrl);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges, router]);
  function leaveNameEditor() {
    if (dirtyName && !window.confirm("Tenés cambios sin guardar. ¿Querés descartarlos?")) return;
    setDraftName(customer?.displayName ?? ""); setNameEditing(false);
  }
  async function saveName(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const displayName = draftName.trim();
    const characterCount = Array.from(displayName).length;
    if (characterCount < 1 || characterCount > 160) { setMessage("El nombre debe tener entre 1 y 160 caracteres."); return; }
    const generation = requestGeneration.current;
    setBusy(true);
    try {
      const response = await fetch("/api/customer/profile", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-customer-viewer": customer.id }, body: JSON.stringify({ displayName }) });
      if (generation !== requestGeneration.current) return;
      if (!response.ok) {
        if (response.status === 401) { router.replace(`/cuenta?returnTo=${encodeURIComponent(section)}`); return; }
        if (response.status === 400) { setMessage("Revisá el nombre e intentá nuevamente."); return; }
        throw new Error("PROFILE_UPDATE_FAILED");
      }
      const body = await response.json() as { customer?: PublicCustomer };
      if (generation !== requestGeneration.current) return;
      if (!body.customer || body.customer.id !== customer.id) throw new Error("PROFILE_RESPONSE_INVALID");
      onCustomerUpdated(body.customer); setDraftName(body.customer.displayName ?? ""); setNameEditing(false); setMessage("Nombre actualizado.");
    } catch {
      if (generation !== requestGeneration.current) return;
      // A lost response can follow a successful update; reconcile once without replaying the write.
      try {
        const response = await fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" });
        const body = await response.json() as { authenticated?: boolean; customer?: PublicCustomer };
        if (generation === requestGeneration.current && response.ok && body.authenticated && body.customer?.id === customer.id && body.customer.displayName === draftName.trim()) {
          onCustomerUpdated(body.customer); setDraftName(body.customer.displayName ?? ""); setNameEditing(false); setMessage("Nombre actualizado.");
        } else if (generation === requestGeneration.current) setMessage("No pudimos confirmar el cambio. Revisá tu sesión e intentá nuevamente.");
      } catch { if (generation === requestGeneration.current) setMessage("No pudimos confirmar el cambio. Revisá tu sesión e intentá nuevamente."); }
    } finally { setBusy(false); }
  }
  function beginAddress(item?: Address) {
    setEditing(item?.id ?? null); setForm(item ? { label: item.label, address: item.address, reference: item.reference ?? "" } : emptyForm); setFormOpen(true); setMessage("");
  }
  async function saveAddress(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const generation = requestGeneration.current;
      const response = await fetch(editing ? `/api/customer/preferences/${encodeURIComponent(editing)}` : "/api/customer/preferences", {
        method: editing ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-customer-viewer": customer.id },
        body: JSON.stringify({ label: form.label.trim(), address: form.address.trim(), reference: form.reference.trim() || null }),
      });
      if (generation !== requestGeneration.current) return;
      if (response.status === 401) { router.replace(`/cuenta?returnTo=${encodeURIComponent(section)}`); return; }
      if (!response.ok) { setMessage(response.status === 400 ? "Revisá la etiqueta, dirección y referencia." : "No pudimos guardar la dirección."); return; }
      setFormOpen(false); setEditing(null); setForm(emptyForm); setMessage("Dirección guardada."); await load();
    } catch { setMessage("No pudimos guardar la dirección. Intentá nuevamente."); }
    finally { setBusy(false); }
  }
  async function removeAddress(item: Address) {
    if (!window.confirm(`¿Eliminar la dirección «${item.label}»?`)) return;
    setBusy(true); setMessage("");
    try {
      const generation = requestGeneration.current;
      const response = await fetch(`/api/customer/preferences/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "same-origin", headers: { "x-customer-viewer": customer.id } });
      if (generation !== requestGeneration.current) return;
      if (response.status === 401) { router.replace(`/cuenta?returnTo=${encodeURIComponent(section)}`); return; }
      if (!response.ok) throw new Error("ADDRESS_DELETE_FAILED");
      setMessage("Dirección eliminada."); await load();
    } catch { setMessage("No pudimos eliminar la dirección. Intentá nuevamente."); }
    finally { setBusy(false); }
  }
  async function removeFavorite(productId: string) {
    const generation = requestGeneration.current;
    setFavoritesBusy(productId); setMessage("");
    const result = await updateFavorite(productId, false, favoriteState.viewerId);
    if (generation !== requestGeneration.current) return;
    setFavoritesBusy(null);
    if (result === "stale") return;
    if (result === "ok") setMessage("Favorito eliminado.");
    else if (result === "guest") router.replace(`/cuenta?returnTo=${encodeURIComponent(section)}`);
    else setMessage("No pudimos actualizar tus favoritos. Intentá nuevamente.");
  }

  const products: Favorite[] = favoriteState.status === "ready" ? favoriteState.items : [];
  return <section className={styles.panel} aria-label={labels[active]}>
    <PublicPageHeader title={labels[active]} backHref="/cuenta" backLabel="Perfil" />
    {loading && <p role="status" aria-live="polite">Cargando {active === "datos" ? "tus datos" : active === "direcciones" ? "tus direcciones" : "tus favoritos"}…</p>}
    {loadError && <div role="alert"><p className={styles.error}>No pudimos cargar esta sección.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Reintentar</button></div>}
    {!loading && !loadError && active === "datos" && customer && <div className={styles.content}>
      {nameEditing ? <form className={styles.form} onSubmit={saveName}>
        <label htmlFor="display-name">Nombre</label><input id="display-name" autoComplete="name" required value={draftName} onChange={(event) => setDraftName(event.target.value)} />
        <p className={styles.hint}>Este nombre se usará en tus próximas compras.</p>
        <div className={styles.actions}><button className="button" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button><button className="button button--secondary" type="button" disabled={busy} onClick={leaveNameEditor}>Cancelar</button></div>
      </form> : <div className={styles.dataRow}><div><span>Nombre</span><strong>{customer.displayName?.trim() || "Sin nombre"}</strong></div><button className="button button--secondary" type="button" aria-label="Editar nombre" onClick={() => { setDraftName(customer.displayName ?? ""); setNameEditing(true); }}>Editar</button></div>}
      <div className={styles.readonly}><span>Correo electrónico</span><strong>{customer.email ?? "Sin correo disponible"}</strong><p className={styles.hint}>Vinculado a Google. No se puede editar aquí.</p></div>
    </div>}
    {!loading && !loadError && active === "direcciones" && <div className={styles.content}>
      {!formOpen && <button className="button" type="button" onClick={() => beginAddress()}>Agregar dirección</button>}
      {formOpen && <form className={styles.form} onSubmit={saveAddress}>
        <h2>{editing ? "Editar dirección" : "Nueva dirección"}</h2>
        <label htmlFor="address-label">Nombre de la dirección</label><input id="address-label" required maxLength={80} value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Casa, Trabajo…" />
        <label htmlFor="address-value">Dirección</label><input id="address-value" required maxLength={500} autoComplete="street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        <label htmlFor="address-reference">Referencia <span className={styles.hint}>Opcional</span></label><textarea id="address-reference" maxLength={200} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} />
        <div className={styles.actions}><button className="button" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar dirección"}</button><button className="button button--secondary" type="button" disabled={busy} onClick={() => { if (!confirmDiscard()) return; setFormOpen(false); setForm(emptyForm); setEditing(null); }}>Cancelar</button></div>
      </form>}
      {addresses.length === 0 && !formOpen ? <div className={styles.empty}><h2>Todavía no guardaste direcciones</h2><p>Agregá una para encontrarla fácilmente en una próxima compra.</p></div> : <div className={styles.list}>{addresses.map((item) => <article className={styles.item} key={item.id}><div><h2>{item.label}</h2><p>{item.address}</p>{item.reference && <p className={styles.muted}>{item.reference}</p>}</div><div className={styles.actions}><button className="button button--secondary" type="button" aria-label={`Editar dirección ${item.label}`} disabled={busy} onClick={() => beginAddress(item)}>Editar</button><button className="button button--secondary" type="button" aria-label={`Eliminar dirección ${item.label}`} disabled={busy} onClick={() => void removeAddress(item)}>Eliminar</button></div></article>)}</div>}
    </div>}
    {!loading && !loadError && active === "favoritos" && <div className={styles.content}>
      {(favoriteState.status === "loading" || favoriteState.status === "error") && <p role={favoriteState.status === "error" ? "alert" : "status"}>{favoriteState.status === "loading" ? "Cargando tus favoritos…" : "No pudimos cargar tus favoritos."} {favoriteState.status === "error" && <button className={styles.inlineButton} type="button" onClick={favoriteState.reload}>Reintentar</button>}</p>}
      {favoriteState.status === "guest" && <div className={styles.empty}><h2>Iniciá sesión para ver tus favoritos</h2><Link className="button" href={`/cuenta?returnTo=${encodeURIComponent(section)}`}>Iniciar sesión</Link></div>}
      {favoriteState.status === "ready" && favoriteState.viewerId !== customer.id && <p role="status">Actualizando tus favoritos…</p>}
      {favoriteState.status === "ready" && favoriteState.viewerId === customer.id && products.length === 0 && <div className={styles.empty}><h2>Todavía no guardaste favoritos</h2><p>Explorá el menú y guardá los productos que quieras encontrar después.</p><Link className="button" href="/menu">Ver menú</Link></div>}
      {favoriteState.status === "ready" && favoriteState.viewerId === customer.id && products.length > 0 && <><Link className="button button--secondary" href="/menu">Ver menú</Link><div className={styles.list}>{products.map((item) => <article className={styles.favorite} key={item.id}>
        {item.imageKey && <img src={resolveStaticProductAsset(item.imageKey) ?? undefined} alt={item.imageAlt ?? ""} loading="lazy" />}
        <div className={styles.favoriteInfo}><p className="eyebrow">{item.category}</p><h2>{item.name}</h2>{item.available && item.published && !item.archived && <strong>{money.format(item.priceAmount)}</strong>}<p className={item.available && item.published && !item.archived ? styles.available : styles.unavailable}>{item.available && item.published && !item.archived ? "Disponible" : "No disponible actualmente"}</p></div>
        <div className={styles.actions}><button className="button button--secondary" type="button" aria-label={`Quitar favorito: ${item.name}`} disabled={favoritesBusy === item.id} onClick={() => void removeFavorite(item.id)}>{favoritesBusy === item.id ? "Quitando…" : "Quitar"}</button></div>
      </article>)}</div></>}
    </div>}
    {message && <p className={styles.feedback} role="status" aria-live="polite">{message}</p>}
  </section>;
}
