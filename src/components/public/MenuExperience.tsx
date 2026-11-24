"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryNav } from "@/components/public/CategoryNav";
import { FeaturedProductCard } from "@/components/public/FeaturedProductCard";
import { ProductCard } from "@/components/public/ProductCard";
import { SaucesInfo } from "@/components/public/SaucesInfo";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { filterCatalog } from "@/modules/catalog/discovery";
import { activeTrackingStorageKey, createTrackingReference, finishTrackingHandoff, onCustomerSessionChange, readCustomerSessionGeneration, readTrackingReference, rememberGuestOrder, retireLegacyTrackingStorage, trackingResumeMaxAgeMs, trackingSessionStorage, writeTrackingReference, type TrackingReference } from "@/modules/orders/tracking-resume";
import { buildWhatsAppAppUrl, buildWhatsAppMessageWithCheckout, buildWhatsAppUrl, checkoutIntentStorageKey, createClientReference, addSelectionLine, lineId, removeSelectionLine, selectionCount, selectionTotal, updateSelectionQuantity, type CheckoutDetails, type SelectionLine } from "@/modules/selection/model";

type Product = { id: string; name: string; description: string | null; priceAmount: number; available: boolean; featured: boolean; imageKey: string | null; imageAlt: string | null; modifiers: Array<{ name: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: string[] }> };
type Menu = { settings: { businessName: string; whatsappUrl: string; deliveryEnabled: boolean; deliveryFeeAmount: number; operatingContext: { isOpen: boolean; label: string; detail: string } }; categories: Array<{ id: string; name: string; slug: string; products: Product[] }> };
type CompletedOrder = { number: number; lines: SelectionLine[]; total: number; whatsappHref: string; whatsappAppHref: string; trackingHref: string; message: string; ownerId?: string; sessionGeneration: string | null };
type CustomerSession = { authenticated?: boolean; customer?: { id?: string; displayName?: string | null } };
type SavedAddress = { id: string; label: string; address: string; reference: string | null };

const priceFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
function formatPrice(amount: number) { return priceFormatter.format(amount); }

function WhatsAppIcon() {
  return <svg className="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3Zm-8.4 18.1h-.1c-1.7 0-3.4-.5-4.8-1.4l-.3-.2-3.8 1 1-3.7-.2-.3a9.8 9.8 0 1 1 8.2 4.6Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.7-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.6.8.2 1.5.2 2.1.1.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z" /></svg>;
}

export function MenuExperience({ menu }: { menu: Menu }) {
  const [cartHydrated, setCartHydrated] = useState(false);
  const [lines, setLines] = useState<SelectionLine[]>([]);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ message: "", revision: 0 });
  const feedbackMessage = feedback.message;
  function setFeedbackMessage(message: string) { setFeedback((current) => ({ message, revision: current.revision + 1 })); }
  const [operatingContext, setOperatingContext] = useState(menu.settings.operatingContext);
  const [selectionError, setSelectionError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details">("cart");
  const [searchQuery, setSearchQuery] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showWhatsAppWebFallback, setShowWhatsAppWebFallback] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [checkout, setCheckout] = useState<CheckoutDetails>({ fulfillment: "PICKUP" });
  const [customerName, setCustomerName] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [needsOrderRecovery, setNeedsOrderRecovery] = useState(false);
  const menuMounted = useRef(false);
  const pendingIntent = useRef<{ reference: string; fingerprint: string } | null>(null);
  const submitInFlight = useRef(false);
  const handoffRef = useRef<{ sawBackground: boolean; reference?: TrackingReference } | null>(null);
  const resumeTrackingRef = useRef<(() => void) | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const visibleCategories = filterCatalog(menu.categories, searchQuery);
  const featured = visibleCategories.flatMap((category) => category.products.filter((product) => product.featured)).slice(0, 2);
  const count = selectionCount(lines);
  const total = selectionTotal(lines);
  useEffect(() => {
    if (!feedback.message) return;
    const timer = window.setTimeout(() => setFeedbackMessage(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function refreshOperatingStatus() {
    const response = await fetch("/api/menu/status", { cache: "no-store" });
    if (!response.ok) throw new Error("STATUS_UNAVAILABLE");
    const result = await response.json() as { operatingContext: Menu["settings"]["operatingContext"] };
    setOperatingContext(result.operatingContext);
    return result.operatingContext;
  }

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void refreshOperatingStatus().catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, []);

  useEffect(() => {
    menuMounted.current = true;
    const timer = window.setTimeout(() => {
      const storage = trackingSessionStorage();
      function readLines(key: string) {
        try {
          const raw = JSON.parse(storage?.getItem(key) ?? "null") as unknown;
          const parsed = key === "taco-loco-repeat-draft" && raw && typeof raw === "object" && "lines" in raw ? raw.lines : raw;
          if (!Array.isArray(parsed)) return [];
          return parsed.filter((line): line is SelectionLine => line && typeof line.productId === "string"
            && typeof line.name === "string" && Number.isFinite(line.priceAmount)
            && Number.isInteger(line.quantity) && line.quantity > 0 && Array.isArray(line.modifiers)
            && line.modifiers.every((modifier: unknown) => modifier && typeof modifier === "object"
              && "group" in modifier && typeof modifier.group === "string" && "option" in modifier && typeof modifier.option === "string"))
            .map((line) => ({ ...line, id: lineId(line.productId, line.modifiers) }));
        } catch { return []; }
      }
      try {
        const saved = JSON.parse(storage?.getItem(checkoutIntentStorageKey) ?? "null");
        if (saved && /^[a-zA-Z0-9-]{16,100}$/.test(saved.reference) && /^[0-9a-f]{64}$/.test(saved.fingerprint)) {
          pendingIntent.current = saved;
          setNeedsOrderRecovery(true);
        }
      } catch { /* Ignore malformed prior attempts. */ }
      const draft = readLines("taco-loco-repeat-draft");
      const cart = readLines("taco-loco-selection");
      try { storage?.removeItem("taco-loco-repeat-draft"); } catch { /* Optional storage. */ }
      retireLegacyTrackingStorage();
      const url = new URL(window.location.href);
      const openCart = url.searchParams.has("carrito");
      if (openCart) {
        url.searchParams.delete("carrito");
        window.history.replaceState(window.history.state, "", url);
      }
      setLines(draft.length ? draft : cart);
      setCartHydrated(true);
      if (openCart || draft.length) setShowSummary(true);
    }, 0);
    return () => { menuMounted.current = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/customer/auth/session", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as CustomerSession;
    }).then(async (session) => {
      if (cancelled || !session?.authenticated) return;
      setCustomerId(session.customer?.id ?? null);
      setCustomerName(session.customer?.displayName ?? "");
      const preferences = await fetch("/api/customer/preferences", { credentials: "same-origin", cache: "no-store" });
      if (preferences.ok && !cancelled) {
        const body = await preferences.json() as { addresses?: SavedAddress[] };
        setSavedAddresses(body.addresses ?? []);
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const navigateToTracking = async (reference: TrackingReference) => {
      if ((reference.sessionGeneration ?? null) !== readCustomerSessionGeneration()) return;
      if (reference.ownerId) {
        try {
          const response = await fetch("/api/customer/auth/session", { cache: "no-store" });
          const session = response.ok ? await response.json() as CustomerSession : null;
          if (!session?.authenticated || session.customer?.id !== reference.ownerId) {
            if (mounted) { setCompletedOrder(null); setShowWhatsAppWebFallback(false); }
            return;
          }
        } catch { return; }
      }
      if (mounted && (reference.sessionGeneration ?? null) === readCustomerSessionGeneration()) window.location.assign(reference.path);
    };
    const resumeTracking = () => {
      const handoff = handoffRef.current;
      if (!handoff?.sawBackground || !handoff.reference || document.visibilityState !== "visible") return;
      const { path, createdAt } = handoff.reference;
      handoffRef.current = null;
      finishTrackingHandoff(path);
      if (Date.now() - createdAt <= trackingResumeMaxAgeMs) void navigateToTracking(handoff.reference);
    };
    resumeTrackingRef.current = resumeTracking;
    const unsubscribe = onCustomerSessionChange(() => {
      handoffRef.current = null;
      finishTrackingHandoff();
      setCompletedOrder(null);
      setShowWhatsAppWebFallback(false);
    });
    const markBackground = () => {
      if (handoffRef.current) handoffRef.current.sawBackground = true;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") markBackground();
      else resumeTracking();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Browser Back restores a snapshot. A completed order must not reopen its dialog.
        handoffRef.current = null;
        setCompletedOrder(null);
        setShowWhatsAppWebFallback(false);
      }
    };
    const explicitlyOpeningCart = new URLSearchParams(window.location.search).has("carrito");
    const restore = window.setTimeout(() => {
      const reload = performance.getEntriesByType("navigation").some((entry) => (entry as PerformanceNavigationTiming).type === "reload");
      if (!reload || explicitlyOpeningCart) return;
      const storage = trackingSessionStorage();
      const pending = readTrackingReference(storage, activeTrackingStorageKey);
      if (!pending) return;
      try {
        if (JSON.parse(storage?.getItem("taco-loco-selection") ?? "[]")?.length) return;
      } catch { return; }
      finishTrackingHandoff(pending.path);
      void navigateToTracking(pending);
    }, 0);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", markBackground);
    window.addEventListener("focus", resumeTracking);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      mounted = false;
      unsubscribe();
      window.clearTimeout(restore);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", markBackground);
      window.removeEventListener("focus", resumeTracking);
      window.removeEventListener("pageshow", onPageShow);
      resumeTrackingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try { trackingSessionStorage()?.setItem("taco-loco-selection", JSON.stringify(lines)); } catch { /* Cart stays in memory. */ }
  }, [cartHydrated, lines]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const updateDeviceMode = () => setIsMobileDevice(mediaQuery.matches);
    updateDeviceMode();
    mediaQuery.addEventListener("change", updateDeviceMode);
    return () => mediaQuery.removeEventListener("change", updateDeviceMode);
  }, []);

  useEffect(() => {
    if (!pendingProduct && !showSummary && !completedOrder) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (submitInFlight.current) return;
        setPendingProduct(null);
        setEditingLineId(null);
        setShowSummary(false);
        if (completedOrder) dismissCompletedOrder();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.matches(":disabled") && element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!focusable.includes(document.activeElement as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingProduct, showSummary, completedOrder]);

  useEffect(() => {
    if (!pendingProduct && !showSummary && !completedOrder) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusTimer = window.requestAnimationFrame(() => (dialogCloseRef.current ?? dialogRef.current?.querySelector<HTMLElement>("a[href], button"))?.focus());
    return () => {
      window.cancelAnimationFrame(focusTimer);
      if (previousFocus && previousFocus !== document.body) previousFocus.focus();
    };
  }, [pendingProduct, showSummary, completedOrder]);

  useEffect(() => {
    if (!pendingProduct && !showSummary && !completedOrder) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [pendingProduct, showSummary, completedOrder]);

  function addProduct(product: Product) {
    if (!product.available) return;
    setEditingLineId(null);
    setPendingProduct(product);
    setPendingQuantity(1);
    setSelectedOptions({});
    setSelectionError("");
  }

  function flashAdded(productId: string) {
    setAddedProductId(productId);
    window.setTimeout(() => setAddedProductId((current) => current === productId ? null : current), 900);
  }

  function editLine(line: SelectionLine) {
    const product = menu.categories.flatMap((category) => category.products).find((item) => item.id === line.productId);
    if (!product) return;
    setPendingProduct(product);
    setEditingLineId(line.id);
    setPendingQuantity(line.quantity);
    setSelectedOptions(Object.fromEntries(product.modifiers.map((group) => [group.name, line.modifiers.filter((modifier) => modifier.group === group.name).map((modifier) => modifier.option)])));
    setSelectionError("");
    setShowSummary(false);
  }

  function toggleOption(group: Product["modifiers"][number], option: string) {
    setSelectedOptions((current) => {
      const selected = current[group.name] ?? [];
      const exists = selected.includes(option);
      const max = group.maxSelections ?? 1;
      const next = exists ? selected.filter((item) => item !== option) : max === 1 ? [option] : [...selected, option].slice(0, max);
      return { ...current, [group.name]: next };
    });
    setSelectionError("");
  }

  function confirmProduct() {
    if (!pendingProduct) return;
    const modifiers = pendingProduct.modifiers.flatMap((group) => (selectedOptions[group.name] ?? []).map((option) => ({ group: group.name, option })));
    const missingRequired = pendingProduct.modifiers.some((group) => group.required && (selectedOptions[group.name] ?? []).length < (group.minSelections ?? 1));
    if (missingRequired) { setSelectionError("Completá las opciones obligatorias para continuar."); return; }
    setLines((current) => {
      const nextLine = { productId: pendingProduct.id, name: pendingProduct.name, priceAmount: pendingProduct.priceAmount, modifiers };
      if (!editingLineId) return addSelectionLine(current, nextLine, pendingQuantity);
      const previous = current.find((line) => line.id === editingLineId);
      if (!previous) return current;
      const nextId = lineId(nextLine.productId, nextLine.modifiers);
      const others = current.filter((line) => line.id !== editingLineId);
      const matching = others.find((line) => line.id === nextId);
      if (matching) return others.map((line) => line.id === nextId ? { ...line, quantity: Math.min(line.quantity + pendingQuantity, 20) } : line);
      return [...others, { ...nextLine, id: nextId, quantity: pendingQuantity }];
    });
    flashAdded(pendingProduct.id);
    setFeedbackMessage(editingLineId ? `${pendingProduct.name} actualizado.` : `${pendingProduct.name} agregado al pedido.`);
    setSelectionError("");
    setPendingProduct(null);
    setEditingLineId(null);
  }

  function removeLine(line: SelectionLine) {
    setLines((current) => removeSelectionLine(current, line.id));
    setFeedbackMessage(`${line.name} quitado del pedido.`);
  }

  function discardPendingIntent() {
    if (!pendingIntent.current) return true;
    if (!window.confirm("El intento anterior pudo haber registrado un pedido. Revisá tu seguimiento o historial antes de descartarlo. ¿Querés descartar la recuperación y continuar con un pedido nuevo?")) return false;
    pendingIntent.current = null;
    setNeedsOrderRecovery(false);
    try { trackingSessionStorage()?.removeItem(checkoutIntentStorageKey); } catch { /* Optional storage. */ }
    setFeedbackMessage("Recuperación descartada. Volvé a revisar el carrito antes de registrar un pedido nuevo.");
    return true;
  }

  function clearSelection() {
    if (!discardPendingIntent()) return;
    setLines([]);
    setFeedbackMessage("Pedido vacío.");
  }

  function openCart() {
    setCheckoutStep("cart");
    setShowSummary(true);
  }

  async function copyWhatsAppMessage(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      window.setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      setFeedbackMessage("No pudimos copiar el mensaje. Usá el botón para abrir WhatsApp manualmente.");
    }
  }

  function openMobileWhatsApp(appUrl: string) {
    setShowWhatsAppWebFallback(false);
    try {
      window.location.assign(appUrl);
      window.setTimeout(() => {
        if (!handoffRef.current?.sawBackground) setShowWhatsAppWebFallback(true);
      }, 1200);
    } catch { setShowWhatsAppWebFallback(true); }
  }

  function dismissCompletedOrder() {
    handoffRef.current = null;
    finishTrackingHandoff();
    setCompletedOrder(null);
    setShowWhatsAppWebFallback(false);
    setCopiedMessage(false);
  }

  function startAnotherOrder() {
    dismissCompletedOrder();
    setCheckout({ fulfillment: "PICKUP" });
    setSaveNewAddress(false);
    setAddressLabel("");
    setFeedbackMessage("Podés armar otro pedido.");
  }

  function openPreparedWhatsApp() {
    if (!completedOrder) return;
    const reference = createTrackingReference(completedOrder.trackingHref, completedOrder.number);
    if (!reference) return;
    reference.ownerId = completedOrder.ownerId;
    reference.sessionGeneration = completedOrder.sessionGeneration;
    handoffRef.current = { sawBackground: false, reference };
    writeTrackingReference(trackingSessionStorage(), activeTrackingStorageKey, reference);
  }

  async function submitOrderIntent() {
    if (submitInFlight.current || count === 0) return;
    if (!operatingContext.isOpen && !needsOrderRecovery) return;
    if (checkout.fulfillment === "DELIVERY" && (!checkout.deliveryAddress?.trim() || !checkout.transferHolderName?.trim())) {
      setFeedbackMessage("Completá la dirección y el titular de la transferencia.");
      return;
    }
    const sessionGeneration = readCustomerSessionGeneration();
    submitInFlight.current = true;
    setSubmittingOrder(true);
    setFeedbackMessage("Preparando tu pedido para WhatsApp…");
    handoffRef.current = { sawBackground: false };
    let popup: Window | null = null;
    const storage = trackingSessionStorage();
    let registered = false;
    let rejectionMessage: string | undefined;
    try {
      if (!isMobileDevice) {
        popup = window.open("about:blank", "_blank");
        if (popup) popup.opener = null;
      }
      const payload = {
        customerName: customerName.trim() || null, fulfillment: checkout.fulfillment,
        deliveryAddress: checkout.fulfillment === "DELIVERY" ? checkout.deliveryAddress?.trim() || null : null,
        deliveryReference: checkout.fulfillment === "DELIVERY" ? checkout.deliveryReference?.trim() || null : null,
        transferHolderName: checkout.fulfillment === "DELIVERY" ? checkout.transferHolderName?.trim() || null : null,
        lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, modifiers: line.modifiers })),
      };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const saved = pendingIntent.current;
      if (saved && saved.fingerprint !== fingerprint) {
        rejectionMessage = "Hay un intento sin confirmar. Restaurá los datos originales y recuperalo antes de enviar un pedido distinto.";
        throw new Error("ORDER_INTENT_CHANGED");
      }
      if (!saved && !(await refreshOperatingStatus()).isOpen) throw new Error("ORDERS_CLOSED");
      if (!menuMounted.current) { popup?.close(); return; }
      if (sessionGeneration !== readCustomerSessionGeneration()) {
        rejectionMessage = "La sesión cambió. Recargá la página y revisá tu cuenta antes de enviar el pedido.";
        throw new Error("CHECKOUT_SESSION_CHANGED");
      }
      const clientReference = saved?.reference ?? createClientReference();
      pendingIntent.current = { fingerprint, reference: clientReference };
      setNeedsOrderRecovery(true);
      try { storage?.setItem(checkoutIntentStorageKey, JSON.stringify(pendingIntent.current)); } catch { /* Preserve the in-memory attempt. */ }
      const response = await fetch("/api/orders/intents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, clientReference, expectedCustomerId: customerId }) });
      if (!menuMounted.current) { popup?.close(); return; }
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { code?: string; message?: string } | null;
        if (!menuMounted.current) { popup?.close(); return; }
        if (!saved && (response.status === 400 || error?.code === "ORDERS_CLOSED" || error?.code === "CHECKOUT_SESSION_CHANGED")) {
          // On a retry the original request could still commit after this rejection.
          pendingIntent.current = null;
          setNeedsOrderRecovery(false);
          try { storage?.removeItem(checkoutIntentStorageKey); } catch { /* Optional storage. */ }
        }
        if (error?.code === "ORDERS_CLOSED") {
          await refreshOperatingStatus().catch(() => undefined);
          throw new Error("ORDERS_CLOSED");
        }
        if (response.status < 500) rejectionMessage = error?.message;
        throw new Error("ORDER_INTENT_FAILED");
      }
      const result = await response.json() as { order: { orderNumber: number; totalAmount: number }; tracking: { path: string; url: string } | null; reused?: boolean; customerId: string | null };
      if (!menuMounted.current) { popup?.close(); return; }
      const reference = result.tracking && createTrackingReference(result.tracking.path, result.order.orderNumber);
      if (!reference || !result.tracking) throw new Error("TRACKING_UNAVAILABLE");
      if (sessionGeneration !== readCustomerSessionGeneration()) {
        popup?.close();
        handoffRef.current = null;
        setFeedbackMessage("La sesión cambió durante el envío. Volvé a la sesión anterior y elegí Recuperar intento para consultar el pedido.");
        return;
      }
      registered = true;
      pendingIntent.current = null;
      setNeedsOrderRecovery(false);
      try {
        storage?.removeItem(checkoutIntentStorageKey);
        storage?.setItem("taco-loco-selection", "[]");
      } catch { /* The registered order remains authoritative. */ }
      setLines([]);
      setShowSummary(false);
      reference.ownerId = result.customerId ?? undefined;
      reference.sessionGeneration = sessionGeneration;
      const message = buildWhatsAppMessageWithCheckout(lines, menu.settings.businessName, result.order.orderNumber, checkout, result.tracking.url);
      const preparedOrder: CompletedOrder = {
        number: result.order.orderNumber, lines, total: result.order.totalAmount, trackingHref: reference.path, message, ownerId: reference.ownerId, sessionGeneration,
        whatsappHref: buildWhatsAppUrl(menu.settings.whatsappUrl, message),
        whatsappAppHref: buildWhatsAppAppUrl(menu.settings.whatsappUrl, message),
      };
      const handoff = handoffRef.current;
      if (handoff) handoff.reference = reference;
      if (popup || isMobileDevice) writeTrackingReference(storage, activeTrackingStorageKey, reference);
      if (result.customerId === null) rememberGuestOrder(reference);
      setCompletedOrder(preparedOrder);
      if (!result.reused && saveNewAddress && customerId && customerId === result.customerId && payload.fulfillment === "DELIVERY" && payload.deliveryAddress && addressLabel.trim()) {
        void fetch("/api/customer/preferences", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: addressLabel.trim(), address: payload.deliveryAddress, reference: payload.deliveryReference }) }).catch(() => undefined);
      }
      setFeedbackMessage(`Pedido TL-${String(result.order.orderNumber).padStart(4, "0")} preparado. Confirmá el mensaje en WhatsApp.`);
      if (isMobileDevice) openMobileWhatsApp(preparedOrder.whatsappAppHref);
      else if (popup) {
        popup.location.replace(preparedOrder.whatsappHref);
        setShowWhatsAppWebFallback(true);
        if (handoff?.sawBackground && document.hasFocus()) resumeTrackingRef.current?.();
      } else {
        handoffRef.current = null;
        setShowWhatsAppWebFallback(true);
      }
    } catch (error) {
      popup?.close();
      handoffRef.current = null;
      if (!menuMounted.current) return;
      if (registered) {
        setShowWhatsAppWebFallback(true);
        return;
      }
      setFeedbackMessage(error instanceof Error && error.message === "ORDERS_CLOSED"
        ? "No estamos tomando pedidos en este momento. Revisá nuestros horarios para volver a pedir."
        : rejectionMessage ?? "No pudimos confirmar si se registró el pedido. Reintentá con los mismos datos para recuperar el intento.");
    } finally {
      submitInFlight.current = false;
      if (menuMounted.current) setSubmittingOrder(false);
    }
  }

  return <main className="public-menu"><PublicNavigation cartCount={count} onCartClick={openCart} /><section className="brand-pattern brand-pattern--hero brand-hero"><div className="brand-hero__copy"><p className="eyebrow">{menu.settings.businessName} · Menú digital</p><h1>Elegí tu próximo antojo</h1><p>Sabores para compartir, pedir y volver a disfrutar.</p></div></section><CategoryNav categories={visibleCategories} /><p className="sr-only" aria-live="polite">{addedProductId ? "Producto agregado al pedido" : ""}</p>
    <div className="public-menu__content">
      <section className={`operating-status operating-status--${operatingContext.isOpen ? "open" : "closed"}`} aria-live="polite"><strong>{operatingContext.label}</strong><span>{operatingContext.detail}</span></section>
      {feedbackMessage && !showSummary && <p className="menu-order-feedback" role="status">{feedbackMessage}</p>}
      <label className="menu-search">Buscar en el menú<input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ej.: taco, pizza, bebida…" /></label>
      {searchQuery.trim() && visibleCategories.length === 0 && <p className="search-empty" role="status">No encontramos productos con “{searchQuery}”. Probá con otro término.</p>}
      {featured.length > 0 && <section className="menu-section menu-section--featured" aria-labelledby="featured-heading"><h2 id="featured-heading">Favoritos de la casa</h2>{featured.map((product) => <FeaturedProductCard key={product.id} product={product} onAdd={addProduct} added={addedProductId === product.id} />)}</section>}
      {visibleCategories.map((category) => <section className="menu-section" id={`category-${category.id}`} key={category.id} aria-labelledby={`heading-${category.id}`}><h2 id={`heading-${category.id}`}>{category.name}</h2><div className="product-list">{category.products.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} added={addedProductId === product.id} />)}</div></section>)}
      <SaucesInfo />
    </div>
    {count > 0 && <button className={`selection-bar${addedProductId ? " selection-bar--updated" : ""}`} type="button" onClick={openCart}><span>Pedido · {count} {count === 1 ? "producto" : "productos"}</span><strong>{formatPrice(total)}</strong></button>}
    {completedOrder && <div className="selection-overlay" role="presentation"><section ref={dialogRef} className="selection-sheet selection-sheet--success" role="dialog" aria-modal="true" aria-labelledby="completed-order-title" aria-describedby="completed-order-help"><div className="brand-pattern brand-pattern--accent success-pattern"><div className="success-mark" aria-hidden="true">✓</div><p className="eyebrow">Pedido preparado</p><h2 id="completed-order-title">¡Listo, tu pedido está armado!</h2></div><p id="completed-order-help" className="selection-help">Pedido TL-{String(completedOrder.number).padStart(4, "0")}. El mensaje está preparado en WhatsApp; confirmá el envío desde la aplicación.</p>{showWhatsAppWebFallback && <p className="selection-help">Si WhatsApp no se abrió, copiá el mensaje o abrilo manualmente.</p>}<div className="completed-order-summary"><strong>Resumen del pedido</strong>{completedOrder.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><span>{formatPrice(line.priceAmount * line.quantity)}</span></div>)}<div className="completed-order-total"><span>Total informativo</span><strong>{formatPrice(completedOrder.total)}</strong></div></div><div className="selection-actions"><a className="button button--secondary" href={completedOrder.trackingHref} onClick={dismissCompletedOrder}>Ver estado de mi pedido</a><a className="button" href={isMobileDevice ? completedOrder.whatsappAppHref : completedOrder.whatsappHref} onClick={openPreparedWhatsApp} target="_blank" rel="noreferrer">Volver a WhatsApp</a>{isMobileDevice && <a className="button button--secondary" href={completedOrder.whatsappHref} onClick={openPreparedWhatsApp} target="_blank" rel="noreferrer">Abrir WhatsApp Web</a>}<button className="button button--secondary" type="button" onClick={() => void copyWhatsAppMessage(completedOrder.message)}>{copiedMessage ? "Mensaje copiado" : "Copiar mensaje"}</button><button className="button button--secondary" type="button" onClick={startAnotherOrder}>Realizar otro pedido</button><button className="selection-clear" type="button" onClick={dismissCompletedOrder}>Seguir viendo el menú</button></div></section></div>}
    {pendingProduct && <div className="selection-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) { setPendingProduct(null); setEditingLineId(null); } }}><section ref={dialogRef} className="selection-sheet selection-sheet--product" role="dialog" aria-modal="true" aria-labelledby="selection-title" aria-describedby="selection-help"><span className="selection-sheet__handle" aria-hidden="true" /><div className="selection-sheet__header"><div><p className="eyebrow">Paso 1 · Personalizá</p><h2 id="selection-title">{pendingProduct.name}</h2></div><button ref={dialogCloseRef} className="selection-close" type="button" onClick={() => { setPendingProduct(null); setEditingLineId(null); }} aria-label="Cerrar">×</button></div><p id="selection-help" className="selection-help">Elegí las opciones necesarias, la cantidad y confirmá para sumar el producto.</p><div className="product-quantity"><span>Cantidad</span><div className="quantity-control"><button type="button" onClick={() => setPendingQuantity((quantity) => Math.max(1, quantity - 1))} aria-label="Quitar una unidad">−</button><strong>{pendingQuantity}</strong><button type="button" onClick={() => setPendingQuantity((quantity) => Math.min(20, quantity + 1))} aria-label="Agregar una unidad">+</button></div><strong>{formatPrice(pendingProduct.priceAmount * pendingQuantity)}</strong></div>{pendingProduct.modifiers.map((group) => <fieldset className="modifier-group" key={group.name}><legend>{group.name}{group.required ? " · obligatorio" : ""}</legend><div className="modifier-options">{group.options.map((option) => { const checked = (selectedOptions[group.name] ?? []).includes(option); return <button className={`modifier-option${checked ? " modifier-option--selected" : ""}`} type="button" aria-pressed={checked} key={option} onClick={() => toggleOption(group, option)}>{option}</button>; })}</div></fieldset>)}{selectionError && <p className="selection-error" role="alert">{selectionError}</p>}<button className="button selection-confirm" type="button" onClick={confirmProduct}>{editingLineId ? "Guardar cambios" : "Agregar al pedido"} · {formatPrice(pendingProduct.priceAmount * pendingQuantity)}</button></section></div>}
    {showSummary && <div className="selection-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !submitInFlight.current) setShowSummary(false); }}><section ref={dialogRef} className="selection-sheet selection-sheet--summary" role="dialog" aria-modal="true" tabIndex={-1} aria-labelledby="summary-title" aria-describedby="summary-help"><span className="selection-sheet__handle" aria-hidden="true" /><div className="selection-sheet__header"><div><p className="eyebrow">Paso {checkoutStep === "cart" ? "1 · Carrito" : "2 · Tus datos"}</p><h2 id="summary-title">{checkoutStep === "cart" ? "Revisá tu pedido" : "Completá tus datos"}</h2></div><button ref={dialogCloseRef} className="selection-close" type="button" onClick={() => setShowSummary(false)} disabled={submittingOrder} aria-label="Cerrar">×</button></div><p id="summary-help" className="selection-help">Podés editar cantidades, quitar productos o seguir viendo el menú.</p>{feedbackMessage && <p className="selection-help" role="status">{feedbackMessage}</p>}{needsOrderRecovery && !submittingOrder && <button className="selection-clear" type="button" onClick={discardPendingIntent}>Descartar intento anterior</button>}<div className="checkout-stepper" aria-label="Pasos del checkout"><span className={checkoutStep === "cart" ? "checkout-step checkout-step--active" : "checkout-step"}>1 Carrito</span><span className={checkoutStep === "details" ? "checkout-step checkout-step--active" : "checkout-step"}>2 Tus datos</span></div>{lines.length === 0 ? <p className="selection-empty">Todavía no agregaste productos.</p> : <><fieldset className="selection-lines" disabled={submittingOrder}>{lines.map((line) => <div className="selection-line" key={line.id}><div><strong>{line.name}</strong>{line.modifiers.length > 0 && <small>{line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(" · ")}</small>}<span>{formatPrice(line.priceAmount)} c/u</span></div><div className="selection-line__actions"><button className="selection-edit" type="button" onClick={() => editLine(line)}>Editar</button><button className="selection-remove" type="button" onClick={() => removeLine(line)} aria-label={`Quitar ${line.name} del pedido`}>Quitar</button><div className="quantity-control" aria-label={`Cantidad de ${line.name}`}><button type="button" onClick={() => setLines((current) => updateSelectionQuantity(current, line.id, line.quantity - 1))} aria-label={`Quitar una unidad de ${line.name}`}>−</button><strong>{line.quantity}</strong><button type="button" onClick={() => setLines((current) => updateSelectionQuantity(current, line.id, line.quantity + 1))} aria-label={`Agregar una unidad de ${line.name}`}>+</button></div></div></div>)}</fieldset><button className="selection-clear" type="button" disabled={submittingOrder} onClick={clearSelection}>Vaciar pedido</button></>}{checkoutStep === "details" && <fieldset className="checkout-details" disabled={submittingOrder}><label className="checkout-name">Nombre para el pedido (opcional)<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={customerId ? "Tu nombre de perfil" : "Cómo te llamamos"} maxLength={160} /></label><fieldset className="checkout-options"><legend>¿Cómo querés recibirlo?</legend><label><input type="radio" name="fulfillment" checked={checkout.fulfillment === "PICKUP"} onChange={() => setCheckout({ fulfillment: "PICKUP" })} /> Retiro</label>{menu.settings.deliveryEnabled && <label><input type="radio" name="fulfillment" checked={checkout.fulfillment === "DELIVERY"} onChange={() => setCheckout({ fulfillment: "DELIVERY", deliveryAddress: "", deliveryReference: "", transferHolderName: "" })} /> Delivery · {formatPrice(menu.settings.deliveryFeeAmount)}</label>}</fieldset>{checkout.fulfillment === "DELIVERY" && <div className="checkout-delivery-fields">{customerId && savedAddresses.length > 0 && <label>Dirección guardada<select value="" onChange={(event) => { const address = savedAddresses.find((item) => item.id === event.target.value); if (address) setCheckout({ ...checkout, deliveryAddress: address.address, deliveryReference: address.reference ?? "" }); }}><option value="">Elegir una dirección</option>{savedAddresses.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.address}</option>)}</select></label>}<label>Dirección<input required value={checkout.deliveryAddress ?? ""} onChange={(event) => setCheckout({ ...checkout, deliveryAddress: event.target.value })} /></label>{customerId && <label className="checkout-save-address"><input type="checkbox" checked={saveNewAddress} onChange={(event) => setSaveNewAddress(event.target.checked)} /> Guardar esta dirección en mi cuenta</label>}{customerId && saveNewAddress && <label>Etiqueta de la dirección<input value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} placeholder="Casa, trabajo…" maxLength={80} /></label>}<label>Referencia (opcional)<input value={checkout.deliveryReference ?? ""} onChange={(event) => setCheckout({ ...checkout, deliveryReference: event.target.value })} /></label><label>Titular de la transferencia<input required value={checkout.transferHolderName ?? ""} onChange={(event) => setCheckout({ ...checkout, transferHolderName: event.target.value })} /></label><p className="selection-help">La transferencia se verifica manualmente antes de confirmar el pedido.</p></div>}</fieldset>}<div className="selection-summary"><span>Total informativo{checkout.fulfillment === "DELIVERY" ? " con envío" : ""}</span><strong>{formatPrice(total + (checkout.fulfillment === "DELIVERY" ? menu.settings.deliveryFeeAmount : 0))}</strong></div><div className="selection-actions">{checkoutStep === "cart" ? <><button className="button" type="button" onClick={() => setCheckoutStep("details")}>Continuar con tus datos</button><button className="button button--secondary" type="button" onClick={() => setShowSummary(false)}>Seguir viendo el menú</button></> : <><button className="button button--secondary" type="button" disabled={submittingOrder} onClick={() => setCheckoutStep("cart")}>Volver al carrito</button><button className="button button--whatsapp" type="button" onClick={() => void submitOrderIntent()} disabled={submittingOrder || (!operatingContext.isOpen && !needsOrderRecovery)}>{submittingOrder ? "Preparando pedido…" : <><WhatsAppIcon /><span>{needsOrderRecovery ? "Recuperar intento" : "Enviar pedido"}</span></>}</button>{!operatingContext.isOpen && <p className="selection-help">{needsOrderRecovery ? "El local está cerrado. Sólo podés recuperar el intento anterior." : operatingContext.detail}</p>}</>}</div></section></div>}
  </main>;
}
