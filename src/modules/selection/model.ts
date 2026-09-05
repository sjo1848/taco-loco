export type SelectionModifier = { group: string; option: string };

export type SelectionLine = {
  id: string;
  productId: string;
  name: string;
  priceAmount: number;
  quantity: number;
  modifiers: SelectionModifier[];
};

export function lineId(productId: string, modifiers: SelectionModifier[]) {
  return `${productId}:${JSON.stringify(modifiers)}`;
}

export function addSelectionLine(lines: SelectionLine[], line: Omit<SelectionLine, "id" | "quantity">) {
  const id = lineId(line.productId, line.modifiers);
  const existing = lines.find((item) => item.id === id);
  if (existing) return lines.map((item) => item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, 20) } : item);
  return [...lines, { ...line, id, quantity: 1 }];
}

export function removeSelectionLine(lines: SelectionLine[], id: string) {
  return lines.filter((item) => item.id !== id);
}

export function updateSelectionQuantity(lines: SelectionLine[], id: string, quantity: number) {
  if (quantity <= 0) return lines.filter((item) => item.id !== id);
  return lines.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, 20) } : item);
}

export function selectionTotal(lines: SelectionLine[]) {
  return lines.reduce((total, line) => total + line.priceAmount * line.quantity, 0);
}

export function selectionCount(lines: SelectionLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function buildWhatsAppMessage(lines: SelectionLine[], businessName: string) {
  const rows = lines.map((line) => {
    const modifiers = line.modifiers.length > 0 ? ` (${line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(", ")})` : "";
    return `- ${line.quantity} x ${line.name}${modifiers}`;
  });
  return [`Hola ${businessName}, quiero ordenar:`, ...rows, "", "¿Me confirman disponibilidad y total final?"] .join("\n");
}

export function buildWhatsAppMessageWithOrder(lines: SelectionLine[], businessName: string, orderNumber: number) {
  const rows = lines.map((line) => {
    const modifiers = line.modifiers.length > 0 ? ` (${line.modifiers.map((modifier) => `${modifier.group}: ${modifier.option}`).join(", ")})` : "";
    return `- ${line.quantity} x ${line.name}${modifiers}`;
  });
  return [`Hola ${businessName}, quiero ordenar:`, `Pedido: TL-${String(orderNumber).padStart(4, "0")}`, "", ...rows, "", "Quedo a la espera de confirmación."] .join("\n");
}

export function buildWhatsAppUrl(baseUrl: string, message: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("text", message);
  return url.toString();
}

export function buildWhatsAppAppUrl(baseUrl: string, message: string) {
  const url = new URL(baseUrl);
  const phone = url.pathname.replace(/\D/g, "");
  return `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`;
}

export function createClientReference() {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  if (typeof webCrypto?.getRandomValues === "function") {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `intent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
