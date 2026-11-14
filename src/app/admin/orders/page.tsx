import { redirect } from "next/navigation";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { getCurrentAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { encodeAdminCursor } from "@/modules/orders/admin-query";

export const dynamic = "force-dynamic";
type OrderListItem = { id: string; orderNumber: number; status: "RECEIVED" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "DELIVERED" | "CANCELLED"; fulfillment: "PICKUP" | "DINE_IN" | "DELIVERY"; verificationStatus: string; paymentStatus: string; refundStatus?: string; customerName: string | null; totalAmount: number; createdAt: Date; notes?: string | null; lines: Array<{quantity:number;productName:string;modifiersSnapshot:unknown;note:string|null}> };

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ cola?: string }> }) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login?returnTo=%2Fadmin%2Forders");
  const requested = (await searchParams)?.cola;
  const queue = requested === "preparando" ? "preparing" : requested === "listos" ? "ready" : "start";
  const [page, counts] = await Promise.all([orderRepository.listOperational(queue, null), orderRepository.operationalCounts()]);
  const serializable = (page.orders as unknown as OrderListItem[]).map((order: OrderListItem) => ({ ...order, createdAt: order.createdAt.toISOString() }));
  return <OrdersBoard initialOrders={serializable} initialCursor={encodeAdminCursor(page.nextCursor)} initialCounts={counts} initialQueue={queue} />;
}
