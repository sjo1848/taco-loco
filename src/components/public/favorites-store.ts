"use client";

import { useSyncExternalStore } from "react";
import { onCustomerSessionChange, readCustomerSessionGeneration } from "@/modules/orders/tracking-resume";

export type Favorite = { id: string; name: string; priceAmount: number; available: boolean; published: boolean; archived: boolean; category: string; imageKey?: string | null; imageAlt?: string | null };
export type SavedAddress = { id: string; label: string; address: string; reference: string | null };
type PreferencesState = { status: "loading" | "guest" | "ready" | "error"; items: Favorite[]; addresses: SavedAddress[]; viewerId: string | null };
const initial: PreferencesState = { status: "loading", items: [], addresses: [], viewerId: null };
let state = initial;
let read: AbortController | null = null;
let authRevision = 0;
let disconnect: (() => void) | undefined;
const listeners = new Set<() => void>();
const mutations = new Set<string>();

function publish(value: PreferencesState) {
  state = value;
  listeners.forEach((listener) => listener());
}

function load({ hide = true }: { hide?: boolean } = {}) {
  if (listeners.size === 0) return;
  read?.abort();
  const controller = new AbortController();
  read = controller;
  const generation = readCustomerSessionGeneration();
  if (hide) publish(initial);
  void fetch("/api/customer/preferences", { cache: "no-store", signal: controller.signal }).then(async (response) => {
    const body = response.ok ? await response.json() as { favorites: Favorite[]; addresses: SavedAddress[]; viewerId: string } : null;
    if (controller.signal.aborted || generation !== readCustomerSessionGeneration()) return;
    if (response.status === 401) publish({ ...initial, status: "guest" });
    else if (body && typeof body.viewerId === "string") publish({ status: "ready", items: body.favorites, addresses: body.addresses, viewerId: body.viewerId });
    else publish({ ...initial, status: "error" });
  }).catch(() => {
    if (!controller.signal.aborted) publish({ ...initial, status: "error" });
  }).finally(() => { if (read === controller) read = null; });
}

const reload = () => load();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const refresh = () => { if (!read) reload(); };
    const authChanged = () => { authRevision++; reload(); };
    const unsubscribe = onCustomerSessionChange(authChanged);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    disconnect = () => {
      read?.abort(); read = null; state = initial; authRevision++;
      unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
    reload();
  }
  return () => { listeners.delete(listener); if (!listeners.size) disconnect?.(); };
}
const noopSubscribe = () => () => {};
const snapshot = () => state;
const serverSnapshot = () => initial;

export function useFavorites({ enabled = true }: { enabled?: boolean } = {}) {
  const current = useSyncExternalStore(enabled ? subscribe : noopSubscribe, enabled ? snapshot : serverSnapshot, serverSnapshot);
  return { ...current, reload };
}

export async function updateFavorite(productId: string, desired: boolean, viewerId: string | null): Promise<"ok" | "guest" | "error" | "stale"> {
  if (state.status === "guest") return "guest";
  if (!viewerId || state.status !== "ready" || state.viewerId !== viewerId) return "stale";
  const mutation = `${viewerId}:${productId}`;
  if (mutations.has(mutation)) return "stale";
  const revision = authRevision;
  const generation = readCustomerSessionGeneration();
  mutations.add(mutation);
  try {
    const response = await fetch(`/api/customer/favorites/${encodeURIComponent(productId)}`, {
      method: "PUT", headers: { "content-type": "application/json", "x-customer-viewer": viewerId },
      body: JSON.stringify({ favorite: desired }),
    });
    if (revision !== authRevision || generation !== readCustomerSessionGeneration()) return "stale";
    if (response.status === 401 || response.status === 409) { reload(); return response.status === 401 ? "guest" : "stale"; }
    if (!response.ok) return "error";
    if (state.viewerId === viewerId && !desired) publish({ ...state, items: state.items.filter((item) => item.id !== productId) });
    load({ hide: false });
    return "ok";
  } catch { return "error"; }
  finally { mutations.delete(mutation); }
}
