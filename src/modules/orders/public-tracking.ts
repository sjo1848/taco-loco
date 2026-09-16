import { formatOrderNumber } from "@/modules/orders/model";

export type PublicOrderStage = "WAITING_CONFIRMATION" | "WAITING_PAYMENT_CONFIRMATION" | "PAYMENT_ISSUE" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "REFUND_PENDING" | "REFUNDED";
export type PublicTrackingEvent = { stage: PublicOrderStage; label: string; at: string };
export type PublicOrderTracking = {
  orderCode: string;
  fulfillment: "PICKUP" | "DELIVERY";
  currentStage: PublicOrderStage;
  title: string;
  message: string;
  totalAmount: number;
  deliveryFeeAmount: number;
  createdAt: string;
  updatedAt: string;
  history: PublicTrackingEvent[];
  lines: Array<{ name: string; quantity: number; modifiers: Array<{ group: string; option: string }> }>;
  version: string;
};

type PublicOrderRecord = {
  orderNumber: number; fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY"; status: string; verificationStatus: string; paymentStatus: string; refundStatus: string;
  totalAmount: number; deliveryFeeAmount: number; createdAt: Date | string; updatedAt: Date | string;
  lines: Array<{ productName: string; quantity: number; modifiersSnapshot: unknown }>;
  events: Array<{ sequence: bigint | number; kind?: string; toStatus: string; createdAt: Date | string }>;
};

const MAX_SAFE_SEQUENCE = BigInt(Number.MAX_SAFE_INTEGER);
export function sequenceAsBigInt(sequence: bigint | number) {
  if (typeof sequence === "number" && !Number.isSafeInteger(sequence)) throw new Error("ORDER_EVENT_SEQUENCE_UNSAFE");
  const normalized = BigInt(sequence);
  if (normalized > MAX_SAFE_SEQUENCE) throw new Error("ORDER_EVENT_SEQUENCE_UNSAFE");
  return normalized;
}

function iso(value: Date | string) { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }
function stageTitle(stage: PublicOrderStage, fulfillment: "PICKUP" | "DELIVERY") {
  const copy: Record<PublicOrderStage, [string, string]> = {
    WAITING_CONFIRMATION: ["Esperando confirmación", "El local recibió tu pedido y debe confirmarlo."],
    WAITING_PAYMENT_CONFIRMATION: ["Verificando el pago", "El local está verificando la transferencia antes de confirmar el pedido."],
    PAYMENT_ISSUE: ["No pudimos verificar el pago", "Revisá la información del pago o contactá al local."],
    CONFIRMED: ["Pago y pedido confirmados", "Tu pedido fue confirmado."],
    PREPARING: ["En preparación", "Estamos preparando tu pedido."],
    READY: ["Listo para la entrega", fulfillment === "PICKUP" ? "¡Tu pedido está listo para retirar!" : "Tu pedido está listo para la entrega."],
    COMPLETED: ["Pedido entregado", "Gracias por elegir Taco Loco."],
    CANCELLED: ["Pedido cancelado", "Este pedido fue cancelado."],
    EXPIRED: ["Pedido cerrado", "Este pedido se cerró sin ser confirmado."],
    REFUND_PENDING: ["Devolución pendiente", "La devolución se gestionará manualmente."],
    REFUNDED: ["Devolución registrada", "La devolución fue registrada."],
  };
  return copy[stage];
}

export function toPublicTrackingStage(order: Pick<PublicOrderRecord, "fulfillment" | "status" | "verificationStatus" | "paymentStatus" | "refundStatus">): PublicOrderStage {
  if (order.refundStatus === "REFUNDED") return "REFUNDED";
  if (order.refundStatus === "REQUIRED") return "REFUND_PENDING";
  if (order.verificationStatus === "EXPIRED") return "EXPIRED";
  if (order.status === "CANCELLED") return "CANCELLED";
  if (order.paymentStatus === "REJECTED" && order.verificationStatus === "PENDING") return "PAYMENT_ISSUE";
  if (order.fulfillment === "DELIVERY" && order.verificationStatus === "PENDING") return "WAITING_PAYMENT_CONFIRMATION";
  if (order.fulfillment === "PICKUP" && order.verificationStatus === "PENDING") return "WAITING_CONFIRMATION";
  if (order.status === "CONFIRMED") return "CONFIRMED";
  if (order.status === "IN_PREPARATION") return "PREPARING";
  if (order.status === "READY") return "READY";
  if (order.status === "DELIVERED") return "COMPLETED";
  return order.fulfillment === "DELIVERY" ? "WAITING_PAYMENT_CONFIRMATION" : "WAITING_CONFIRMATION";
}

function historyEntry(event: PublicOrderRecord["events"][number], fulfillment: "PICKUP" | "DELIVERY"): PublicTrackingEvent | null {
  const kind = event.kind ?? "STATUS_TRANSITION";
  if (kind === "NO_SHOW_RECORDED") return null;
  let stage: PublicOrderStage | null = null;
  let label = "";
  if (kind === "ORDER_CREATED") { stage = fulfillment === "DELIVERY" ? "WAITING_PAYMENT_CONFIRMATION" : "WAITING_CONFIRMATION"; label = "Pedido enviado"; }
  else if (kind === "PAYMENT_REPORTED") { stage = "WAITING_PAYMENT_CONFIRMATION"; label = "Pago informado"; }
  else if (kind === "PAYMENT_REJECTED") { stage = "PAYMENT_ISSUE"; label = "No pudimos verificar el pago"; }
  else if (kind === "PAYMENT_AND_ORDER_CONFIRMED") { stage = "CONFIRMED"; label = "Pago y pedido confirmados"; }
  else if (kind === "PENDING_EXPIRED") { stage = "EXPIRED"; label = "Este pedido se cerró sin ser confirmado"; }
  else if (kind === "REFUND_REQUIRED") { stage = "REFUND_PENDING"; label = "Devolución pendiente"; }
  else if (kind === "REFUNDED") { stage = "REFUNDED"; label = "Devolución registrada"; }
  else if (event.toStatus === "CONFIRMED") { stage = "CONFIRMED"; label = "Pedido confirmado"; }
  else if (event.toStatus === "IN_PREPARATION") { stage = "PREPARING"; label = "En preparación"; }
  else if (event.toStatus === "READY") { stage = "READY"; label = fulfillment === "PICKUP" ? "Listo para retirar" : "Listo para la entrega"; }
  else if (event.toStatus === "DELIVERED") { stage = "COMPLETED"; label = "Entregado"; }
  else if (event.toStatus === "CANCELLED") { stage = "CANCELLED"; label = "Pedido cancelado"; }
  return stage ? { stage, label, at: iso(event.createdAt) } : null;
}

export function toPublicOrderHistory(order: Pick<PublicOrderRecord, "fulfillment" | "events">) {
  const history: PublicTrackingEvent[] = [];
  for (const event of order.events.slice().sort((a, b) => sequenceAsBigInt(a.sequence) < sequenceAsBigInt(b.sequence) ? -1 : sequenceAsBigInt(a.sequence) > sequenceAsBigInt(b.sequence) ? 1 : 0)) {
    const entry = historyEntry(event, order.fulfillment === "DINE_IN" ? "PICKUP" : order.fulfillment);
    if (!entry) continue;
    const previous = history.at(-1);
    if (previous?.stage === entry.stage && previous.label === entry.label) continue;
    history.push(entry);
  }
  return history;
}

export function toPublicOrderTracking(order: PublicOrderRecord): PublicOrderTracking {
  const fulfillment = order.fulfillment === "DINE_IN" ? "PICKUP" : order.fulfillment;
  const currentStage = toPublicTrackingStage(order);
  const [title, message] = stageTitle(currentStage, fulfillment);
  const history = toPublicOrderHistory({ fulfillment, events: order.events });
  const version = order.events.length ? order.events.reduce<bigint>((max, event) => { const sequence = sequenceAsBigInt(event.sequence); return sequence > max ? sequence : max; }, BigInt(0)).toString() : "0";
  return {
    orderCode: formatOrderNumber(order.orderNumber), fulfillment, currentStage, title, message,
    totalAmount: order.totalAmount, deliveryFeeAmount: order.deliveryFeeAmount,
    createdAt: iso(order.createdAt), updatedAt: iso(order.updatedAt), history,
    lines: order.lines.map((line) => ({ name: line.productName, quantity: line.quantity, modifiers: Array.isArray(line.modifiersSnapshot) ? line.modifiersSnapshot.filter((item): item is { group: string; option: string } => Boolean(item) && typeof item === "object" && "group" in item && "option" in item).map((item) => ({ group: item.group, option: item.option })) : [] })),
    version,
  };
}
