import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/modules/auth/customer-session";
import { isCustomerOrderId } from "@/modules/orders/customer-orders";
import { buildPublicOrderTracking } from "@/modules/orders/public-tracking";
import { orderRepository } from "@/modules/orders/repository";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" };

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return new NextResponse(null, { status: 401, headers });
  const { token: id } = await context.params;
  if (!isCustomerOrderId(id)) return new NextResponse(null, { status: 404, headers });
  const order = await orderRepository.findCustomerTrackingOrder(customer.id, id);
  if (!order) return new NextResponse(null, { status: 404, headers });
  const tracking = await buildPublicOrderTracking(order, `customer:${customer.id}:${id}`);
  if (new URL(request.url).searchParams.get("after") === tracking.version) return new NextResponse(null, { status: 204, headers });
  return NextResponse.json(tracking, { headers });
}
