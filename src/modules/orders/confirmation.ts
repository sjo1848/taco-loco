import { formatOrderNumber } from "@/modules/orders/model";

export type OrderConfirmationInput = {
  businessName: string;
  orderNumber: number;
  totalAmount: number;
  customerName: string | null;
  fulfillment: "PICKUP" | "DINE_IN";
};

export function buildOrderConfirmationMessage(input: OrderConfirmationInput) {
  const greeting = input.customerName ? `Hola ${input.customerName},` : "Hola,";
  const modality = input.fulfillment === "PICKUP" ? "Te esperamos para retirarlo." : "Te esperamos para disfrutarlo en el local.";
  return [greeting, `Tu pedido ${formatOrderNumber(input.orderNumber)} fue confirmado.`, "", `Total final: ${formatAmount(input.totalAmount)}.`, modality, "", "Si necesitás hacer algún cambio, respondé por este medio."].join("\n");
}

export function normalizeCustomerPhone(phone: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? digits : null;
}

export function buildCustomerWhatsAppUrl(phone: string | null, message: string) {
  const normalized = normalizeCustomerPhone(phone);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
}

export function buildCustomerWhatsAppAppUrl(phone: string | null, message: string) {
  const normalized = normalizeCustomerPhone(phone);
  return normalized ? `whatsapp://send?phone=${encodeURIComponent(normalized)}&text=${encodeURIComponent(message)}` : null;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount).replace(/\u00a0/g, " ");
}
