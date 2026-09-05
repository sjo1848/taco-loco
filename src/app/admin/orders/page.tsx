import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { getCurrentAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";

export const dynamic = "force-dynamic";
type OrderListItem = { id: string; orderNumber: number; status: "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED"; fulfillment: "PICKUP" | "DINE_IN"; source: "WHATSAPP" | "PUBLIC_MENU"; customerName: string | null; customerPhone: string | null; totalAmount: number; createdAt: Date; lines: unknown[] };

export default async function OrdersPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  const initialCursor = await orderRepository.latestEventSequence();
  const orders = await orderRepository.list();
  const serializable = (orders as unknown as OrderListItem[]).map((order: OrderListItem) => ({ ...order, createdAt: order.createdAt.toISOString() }));
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Taco Loco · Operación</p><h1>Pedidos</h1></div><div className="admin-header-actions"><Link className="admin-button admin-button--secondary" href="/admin">Productos</Link><Link className="admin-button admin-button--primary" href="/admin/orders/new">Nuevo pedido</Link><LogoutButton /></div></header><p className="admin-user">Sesión activa: {user.email}</p><OrdersBoard orders={serializable} initialCursor={initialCursor.toString()} /></main>;
}
