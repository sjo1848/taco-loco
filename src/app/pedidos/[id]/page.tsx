import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderTracking } from "@/components/public/OrderTracking";
import { getCurrentCustomer } from "@/modules/auth/customer-session";
import { isCustomerOrderId } from "@/modules/orders/customer-orders";
import { buildPublicOrderTracking } from "@/modules/orders/public-tracking";
import { orderRepository } from "@/modules/orders/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estado de tu pedido · Taco Loco", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };

export default async function CustomerTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/cuenta");
  const { id } = await params;
  if (!isCustomerOrderId(id)) notFound();
  const order = await orderRepository.findCustomerTrackingOrder(customer.id, id);
  if (!order) notFound();
  return <OrderTracking key={id} initial={await buildPublicOrderTracking(order, `customer:${customer.id}:${id}`)} privateOrderId={id} />;
}
