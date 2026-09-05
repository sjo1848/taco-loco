"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BrandHeader } from "@/components/public/BrandHeader";
import { CategoryNav } from "@/components/public/CategoryNav";
import { FeaturedProductCard } from "@/components/public/FeaturedProductCard";
import { ProductCard } from "@/components/public/ProductCard";
import { SaucesInfo } from "@/components/public/SaucesInfo";
import { filterCatalog } from "@/modules/catalog/discovery";
import { buildWhatsAppAppUrl, buildWhatsAppMessage, buildWhatsAppMessageWithOrder, buildWhatsAppUrl, createClientReference, addSelectionLine, lineId, removeSelectionLine, selectionCount, selectionTotal, updateSelectionQuantity, type SelectionLine } from "@/modules/selection/model";

type Product = { id: string; name: string; description: string | null; priceAmount: number; available: boolean; featured: boolean; imageKey: string | null; imageAlt: string | null; modifiers: Array<{ name: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: string[] }> };
type Menu = { settings: { businessName: string; whatsappUrl: string; operatingContext: { isOpen: boolean; label: string; detail: string } }; categories: Array<{ id: string; name: string; slug: string; products: Product[] }> };
type CompletedOrder = { number: number; lines: SelectionLine[]; total: number; whatsappHref: string; whatsappAppHref: string };

function formatPrice(amount: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount); }

function WhatsAppIcon() {
  return <svg className="whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.1-3.5-8.3Zm-8.4 18.1h-.1c-1.7 0-3.4-.5-4.8-1.4l-.3-.2-3.8 1 1-3.7-.2-.3a9.8 9.8 0 1 1 8.2 4.6Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.8-1.8-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.7-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.6.8.2 1.5.2 2.1.1.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z" /></svg>;
}

export function MenuExperience({ menu }: { menu: Menu }) {
  const [lines, setLines] = useState<SelectionLine[]>([]);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showWhatsAppWebFallback, setShowWhatsAppWebFallback] = useState(false);
  const [whatsappWebFallbackHref, setWhatsappWebFallbackHref] = useState("");
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [orderIntent, setOrderIntent] = useState<{ reference: string; signature: string; number: number } | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const visibleCategories = filterCatalog(menu.categories, searchQuery);
  const featured = visibleCategories.flatMap((category) => category.products.filter((product) => product.featured)).slice(0, 2);
  const count = selectionCount(lines);
  const total = selectionTotal(lines);
  const selectionSignature = useMemo(() => JSON.stringify(lines.map(({ productId, quantity, modifiers }) => ({ productId, quantity, modifiers }))), [lines]);
  const currentOrderIntent = orderIntent?.signature === selectionSignature ? orderIntent : null;
  const whatsappHref = useMemo(() => lines.length > 0 ? buildWhatsAppUrl(menu.settings.whatsappUrl, buildWhatsAppMessage(lines, menu.settings.businessName)) : menu.settings.whatsappUrl, [lines, menu.settings.businessName, menu.settings.whatsappUrl]);
  const whatsappAppHref = useMemo(() => lines.length > 0 ? buildWhatsAppAppUrl(menu.settings.whatsappUrl, buildWhatsAppMessage(lines, menu.settings.businessName)) : menu.settings.whatsappUrl, [lines, menu.settings.businessName, menu.settings.whatsappUrl]);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const saved = window.sessionStorage.getItem("taco-loco-selection");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) timer = window.setTimeout(() => setLines(parsed as SelectionLine[]), 0);
      }
    } catch {
      // La selección es opcional: si storage está bloqueado, el menú sigue funcionando.
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    try {
      const saved = window.sessionStorage.getItem("taco-loco-completed-order");
      if (saved) timer = window.setTimeout(() => setCompletedOrder(JSON.parse(saved) as CompletedOrder), 0);
    } catch {
      // El resumen de cierre es opcional: el menú continúa disponible.
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem("taco-loco-selection", JSON.stringify(lines)); } catch {
      // La selección en memoria continúa disponible durante la navegación actual.
    }
  }, [lines]);

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
        setPendingProduct(null);
        setEditingLineId(null);
        setShowSummary(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingProduct, showSummary, completedOrder]);

  useEffect(() => {
    if (!pendingProduct && !showSummary && !completedOrder) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusTimer = window.requestAnimationFrame(() => dialogCloseRef.current?.focus());
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
    if (product.modifiers.length > 0) {
      setPendingProduct(product);
      setSelectedOptions({});
      setSelectionError("");
      return;
    }
    setLines((current) => addSelectionLine(current, { productId: product.id, name: product.name, priceAmount: product.priceAmount, modifiers: [] }));
    setFeedbackMessage(`${product.name} agregado al pedido.`);
    flashAdded(product.id);
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
      if (!editingLineId) return addSelectionLine(current, nextLine);
      const previous = current.find((line) => line.id === editingLineId);
      if (!previous) return current;
      return current.map((line) => line.id === editingLineId ? { ...nextLine, id: lineId(nextLine.productId, nextLine.modifiers), quantity: previous.quantity } : line);
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

  function clearSelection() {
    setLines([]);
    setFeedbackMessage("Pedido vacío.");
  }

  function openMobileWhatsApp(appUrl = whatsappAppHref, webUrl = whatsappHref) {
    setShowWhatsAppWebFallback(false);
    setWhatsappWebFallbackHref(webUrl);
    let appSwitchDetected = false;
    const markAppSwitch = () => {
      appSwitchDetected = true;
      setFeedbackMessage("WhatsApp está abierto. Confirmá el envío en la aplicación y luego podés volver al menú.");
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") markAppSwitch();
    };
    window.addEventListener("blur", markAppSwitch, { once: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    try {
      window.location.assign(appUrl);
      window.setTimeout(() => {
        window.removeEventListener("blur", markAppSwitch);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (!appSwitchDetected) setShowWhatsAppWebFallback(true);
      }, 1200);
    } catch {
      window.removeEventListener("blur", markAppSwitch);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setShowWhatsAppWebFallback(true);
    }
  }

  function startAnotherOrder() {
    setCompletedOrder(null);
    setFeedbackMessage("Podés armar otro pedido.");
    try { window.sessionStorage.removeItem("taco-loco-completed-order"); } catch {
      // El estado visual continúa siendo suficiente para esta navegación.
    }
  }

  function dismissCompletedOrder() {
    setCompletedOrder(null);
    try { window.sessionStorage.removeItem("taco-loco-completed-order"); } catch {
      // El cierre visual no depende de storage.
    }
  }

  async function submitOrderIntent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (submittingOrder) return;
    const popup = isMobileDevice ? null : window.open("about:blank", "_blank", "noopener,noreferrer");
    if (!menu.settings.operatingContext.isOpen || count === 0) {
      if (isMobileDevice) openMobileWhatsApp();
      else if (popup) popup.location.href = whatsappHref;
      else window.location.assign(whatsappHref);
      return;
    }
    const clientReference = currentOrderIntent?.reference ?? createClientReference();
    setSubmittingOrder(true);
    setFeedbackMessage("Preparando tu pedido para WhatsApp…");
    try {
      const response = await fetch("/api/orders/intents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientReference, lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity, modifiers: line.modifiers })) }) });
      if (!response.ok) throw new Error("ORDER_INTENT_FAILED");
      const result = await response.json() as { order: { orderNumber: number; totalAmount: number } };
      const preparedMessage = buildWhatsAppMessageWithOrder(lines, menu.settings.businessName, result.order.orderNumber);
      const preparedWhatsappHref = buildWhatsAppUrl(menu.settings.whatsappUrl, preparedMessage);
      const preparedWhatsappAppHref = buildWhatsAppAppUrl(menu.settings.whatsappUrl, preparedMessage);
      const preparedOrder: CompletedOrder = { number: result.order.orderNumber, lines, total: result.order.totalAmount, whatsappHref: preparedWhatsappHref, whatsappAppHref: preparedWhatsappAppHref };
      setCompletedOrder(preparedOrder);
      try { window.sessionStorage.setItem("taco-loco-completed-order", JSON.stringify(preparedOrder)); } catch {
        // El pedido ya quedó persistido en el servidor; solo se pierde el resumen al recargar.
      }
      setLines([]);
      setShowSummary(false);
      setOrderIntent({ reference: clientReference, signature: selectionSignature, number: result.order.orderNumber });
      setFeedbackMessage(`Pedido TL-${String(result.order.orderNumber).padStart(4, "0")} preparado. Confirmá el mensaje en WhatsApp.`);
      if (isMobileDevice) openMobileWhatsApp(preparedWhatsappAppHref, preparedWhatsappHref);
      else if (popup) popup.location.href = preparedWhatsappHref;
      else window.location.assign(preparedWhatsappHref);
    } catch {
      popup?.close();
      setFeedbackMessage("No pudimos registrar el pedido. Revisá la conexión e intentá nuevamente.");
    } finally {
      setSubmittingOrder(false);
    }
  }

  return <main className="public-menu"><BrandHeader businessName={menu.settings.businessName} /><CategoryNav categories={visibleCategories} /><p className="sr-only" aria-live="polite">{feedbackMessage || (addedProductId ? "Producto agregado al pedido" : "")}</p>
    <div className="public-menu__content"><div className="public-menu__intro"><p className="eyebrow">Menú digital</p><h1>Elegí tu próximo antojo</h1></div>
      <section className={`operating-status operating-status--${menu.settings.operatingContext.isOpen ? "open" : "closed"}`} aria-live="polite"><strong>{menu.settings.operatingContext.label}</strong><span>{menu.settings.operatingContext.detail}</span></section>
      <label className="menu-search">Buscar en el menú<input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ej.: taco, pizza, bebida…" /></label>
      {searchQuery.trim() && visibleCategories.length === 0 && <p className="search-empty" role="status">No encontramos productos con “{searchQuery}”. Probá con otro término.</p>}
      {featured.length > 0 && <section className="menu-section menu-section--featured" aria-labelledby="featured-heading"><h2 id="featured-heading">Favoritos de la casa</h2>{featured.map((product) => <FeaturedProductCard key={product.id} product={product} onAdd={addProduct} added={addedProductId === product.id} />)}</section>}
      {visibleCategories.map((category) => <section className="menu-section" id={`category-${category.id}`} key={category.id} aria-labelledby={`heading-${category.id}`}><h2 id={`heading-${category.id}`}>{category.name}</h2><div className="product-list">{category.products.map((product) => <ProductCard key={product.id} product={product} onAdd={addProduct} added={addedProductId === product.id} />)}</div></section>)}
      <SaucesInfo />
    </div>
    {count > 0 && <button className={`selection-bar${addedProductId ? " selection-bar--updated" : ""}`} type="button" onClick={() => setShowSummary(true)}><span>Pedido · {count} {count === 1 ? "producto" : "productos"}</span><strong>{formatPrice(total)}</strong></button>}
    {currentOrderIntent && <p className="order-intent-feedback" role="status">Pedido TL-{String(currentOrderIntent.number).padStart(4, "0")} preparado. El local lo ve como recibido y debe confirmarlo por WhatsApp.</p>}
    {showWhatsAppWebFallback && <p className="whatsapp-fallback" role="status">¿No se abrió WhatsApp? <a href={whatsappWebFallbackHref || whatsappHref} target="_blank" rel="noreferrer">Abrir WhatsApp Web</a></p>}
    {completedOrder && <div className="selection-overlay" role="presentation"><section ref={dialogRef} className="selection-sheet selection-sheet--success" role="dialog" aria-modal="true" aria-labelledby="completed-order-title" aria-describedby="completed-order-help"><div className="success-mark" aria-hidden="true">✓</div><p className="eyebrow">Pedido preparado</p><h2 id="completed-order-title">¡Listo, tu pedido está armado!</h2><p id="completed-order-help" className="selection-help">Pedido TL-{String(completedOrder.number).padStart(4, "0")}. El mensaje está preparado en WhatsApp; confirmá el envío desde la aplicación.</p><div className="completed-order-summary"><strong>Resumen del pedido</strong>{completedOrder.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><span>{formatPrice(line.priceAmount * line.quantity)}</span></div>)}<div className="completed-order-total"><span>Total informativo</span><strong>{formatPrice(completedOrder.total)}</strong></div></div><div className="selection-actions"><a className="button" href={isMobileDevice ? completedOrder.whatsappAppHref : completedOrder.whatsappHref} target="_blank" rel="noreferrer">Volver a WhatsApp</a><button className="button button--secondary" type="button" onClick={startAnotherOrder}>Realizar otro pedido</button><button className="selection-clear" type="button" onClick={dismissCompletedOrder}>Seguir viendo el menú</button></div></section></div>}
    {pendingProduct && <div className="selection-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) { setPendingProduct(null); setEditingLineId(null); } }}><section ref={dialogRef} className="selection-sheet selection-sheet--product" role="dialog" aria-modal="true" aria-labelledby="selection-title" aria-describedby="selection-help"><span className="selection-sheet__handle" aria-hidden="true" /><div className="selection-sheet__header"><div><p className="eyebrow">Paso 1 · Personalizá</p><h2 id="selection-title">{pendingProduct.name}</h2></div><button ref={dialogCloseRef} className="selection-close" type="button" onClick={() => { setPendingProduct(null); setEditingLineId(null); }} aria-label="Cerrar">×</button></div><p id="selection-help" className="selection-help">Elegí las opciones necesarias y confirmá para sumar el producto.</p>{pendingProduct.modifiers.map((group) => <fieldset className="modifier-group" key={group.name}><legend>{group.name}{group.required ? " · obligatorio" : ""}</legend><div className="modifier-options">{group.options.map((option) => { const checked = (selectedOptions[group.name] ?? []).includes(option); return <button className={`modifier-option${checked ? " modifier-option--selected" : ""}`} type="button" aria-pressed={checked} key={option} onClick={() => toggleOption(group, option)}>{option}</button>; })}</div></fieldset>)}{selectionError && <p className="selection-error" role="alert">{selectionError}</p>}<button className="button selection-confirm" type="button" onClick={confirmProduct}>{editingLineId ? "Guardar cambios" : "Agregar al pedido"} · {formatPrice(pendingProduct.priceAmount)}</button></section></div>}
    {showSummary && <div className="selection-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowSummary(false); }}><section ref={dialogRef} className="selection-sheet selection-sheet--summary" role="dialog" aria-modal="true" aria-labelledby="summary-title" aria-describedby="summary-help"><span className="selection-sheet__handle" aria-hidden="true" /><div className="selection-sheet__header"><div><p className="eyebrow">Paso 2 · Tu selección</p><h2 id="summary-title">Revisá tu pedido</h2></div><button ref={dialogCloseRef} className="selection-close" type="button" onClick={() => setShowSummary(false)} aria-label="Cerrar">×</button></div><p id="summary-help" className="selection-help">Podés editar cantidades, quitar productos o seguir viendo el menú.</p>{lines.length === 0 ? <p className="selection-empty">Todavía no agregaste productos.</p> : <><div className="selection-lines">{lines.map((line) => <div className="selection-line" key={line.id}><div><strong>{line.name}</strong>{line.modifiers.length > 0 && <small>{line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(" · ")}</small>}<span>{formatPrice(line.priceAmount)} c/u</span></div><div className="selection-line__actions"><button className="selection-edit" type="button" onClick={() => editLine(line)}>Editar</button><button className="selection-remove" type="button" onClick={() => removeLine(line)} aria-label={`Quitar ${line.name} del pedido`}>Quitar</button><div className="quantity-control" aria-label={`Cantidad de ${line.name}`}><button type="button" onClick={() => setLines((current) => updateSelectionQuantity(current, line.id, line.quantity - 1))} aria-label={`Quitar una unidad de ${line.name}`}>−</button><strong>{line.quantity}</strong><button type="button" onClick={() => setLines((current) => updateSelectionQuantity(current, line.id, line.quantity + 1))} aria-label={`Agregar una unidad de ${line.name}`}>+</button></div></div></div>)}</div><button className="selection-clear" type="button" onClick={clearSelection}>Vaciar pedido</button></>}<div className="selection-summary"><span>Total informativo</span><strong>{formatPrice(total)}</strong></div><div className="selection-actions"><button className="button button--secondary" type="button" onClick={() => setShowSummary(false)}>Seguir viendo el menú</button><a className="button button--whatsapp" href={whatsappHref} rel="noreferrer" target="_blank" onClick={submitOrderIntent} aria-disabled={submittingOrder}>{submittingOrder ? "Preparando pedido…" : <><WhatsAppIcon /><span>Enviar pedido</span></>}</a></div></section></div>}
  </main>;
}
