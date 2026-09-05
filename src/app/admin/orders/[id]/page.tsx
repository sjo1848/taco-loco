import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { OrderActions } from "@/components/admin/OrderActions";
import { OrderConfirmation } from "@/components/admin/OrderConfirmation";
import { getCurrentAdmin } from "@/modules/auth/session";
import { availableTransitions, formatOrderNumber } from "@/modules/orders/model";
import { orderRepository } from "@/modules/orders/repository";
import { settingsService } from "@/modules/settings/service";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = { RECEIVED: "Recibido", CONFIRMED: "Confirmado", IN_PREPARATION: "En preparación", READY: "Listo", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
function money(amount: number) { return `$${amount.toLocaleString("es-AR")}`; }
function modifiers(value: unknown) { if (!Array.isArray(value)) return ""; return value.map((item) => typeof item === "object" && item && "group" in item && "option" in item ? `${String(item.group)}: ${String(item.option)}` : "").filter(Boolean).join(" · "); }

type Context = { params: Promise<{ id: string }> };
type OrderLine = { id: string; quantity: number; productName: string; unitPriceAmount: number; modifiersSnapshot: unknown; note: string | null };
type OrderEvent = { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: Date; actor: { email: string } | null };
type OrderDetail = { id: string; orderNumber: number; status: "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED"; source: "WHATSAPP" | "PUBLIC_MENU"; customerName: string | null; customerPhone: string | null; fulfillment: "PICKUP" | "DINE_IN"; tableLabel: string | null; totalAmount: number; subtotalAmount: number; adjustmentAmount: number; notes: string | null; cancellationReason: string | null; createdAt: Date; createdBy: { email: string } | null; lines: OrderLine[]; events: OrderEvent[] };

export default async function OrderDetailPage(context: Context) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  let order: OrderDetail;
  try { order = await orderRepository.findById((await context.params).id) as unknown as OrderDetail; } catch (error) { if (error instanceof AppError && error.code === "ORDER_NOT_FOUND") notFound(); throw error; }
  const settings = await settingsService.get();
  const transitions = availableTransitions(order.status);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Pedido {formatOrderNumber(order.orderNumber)}</p><h1>{statusLabels[order.status]}</h1></div><div className="admin-header-actions"><Link className="admin-button admin-button--secondary" href="/admin/orders">Volver a pedidos</Link><LogoutButton /></div></header><p className="admin-user">Creado por {order.createdBy?.email ?? "Menú público"} · {order.createdAt.toLocaleString("es-AR")}</p><div className="order-detail"><section className="admin-panel"><div className="order-detail__meta"><div><span>Cliente</span><strong>{order.customerName || "Sin nombre"}</strong><small>{order.customerPhone || "Sin teléfono"}</small></div><div><span>Modalidad</span><strong>{order.fulfillment === "PICKUP" ? "Retiro" : "Consumo local"}</strong><small>{order.tableLabel ? `Mesa ${order.tableLabel}` : "Sin mesa"}</small></div><div><span>{order.status === "CONFIRMED" ? "Total confirmado" : "Total informativo"}</span><strong>{money(order.totalAmount)}</strong><small>Subtotal {money(order.subtotalAmount)}{order.adjustmentAmount ? ` · Ajuste ${money(order.adjustmentAmount)}` : ""}</small></div></div>{order.notes && <p className="order-notes">{order.notes}</p>}<div className="order-lines">{order.lines.map((line: OrderLine) => <article key={line.id}><div><strong>{line.quantity} × {line.productName}</strong>{modifiers(line.modifiersSnapshot) && <small>{modifiers(line.modifiersSnapshot)}</small>}{line.note && <small>Nota: {line.note}</small>}</div><strong>{money(line.unitPriceAmount * line.quantity)}</strong></article>)}</div>{order.cancellationReason && <p className="order-cancellation">Motivo de cancelación: {order.cancellationReason}</p>}</section><OrderActions orderId={order.id} transitions={transitions} />{order.status !== "RECEIVED" && order.status !== "CANCELLED" && <OrderConfirmation businessName={settings?.businessName ?? "Taco Loco"} orderNumber={order.orderNumber} totalAmount={order.totalAmount} customerName={order.customerName} customerPhone={order.customerPhone} fulfillment={order.fulfillment} />}<section className="admin-panel order-timeline"><h2>Historial</h2>{order.events.map((event: OrderEvent) => <article key={event.id}><div><strong>{event.fromStatus ? `${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]}` : statusLabels[event.toStatus]}</strong><small>{event.actor?.email ?? "Menú público"} · {event.createdAt.toLocaleString("es-AR")}</small></div>{event.reason && <p>{event.reason}</p>}</article>)}</section></div></main>;
}
