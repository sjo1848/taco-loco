import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTracking } from "@/components/public/OrderTracking";
import { toPublicOrderTracking } from "@/modules/orders/public-tracking";
import { orderRepository } from "@/modules/orders/repository";
import { isPublicTrackingToken } from "@/modules/orders/tracking-token";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estado de tu pedido · Taco Loco", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  if (!isPublicTrackingToken(token)) notFound();
  const order = await orderRepository.findByTrackingToken(token);
  if (!order) notFound();
  return <OrderTracking initial={toPublicOrderTracking(order)} />;
}
