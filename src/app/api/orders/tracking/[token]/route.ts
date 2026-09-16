import { NextResponse } from "next/server";
import { orderRepository } from "@/modules/orders/repository";
import { isPublicTrackingToken } from "@/modules/orders/tracking-token";
import { toPublicOrderTracking } from "@/modules/orders/public-tracking";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" };
const notFound = () => new NextResponse(null, { status: 404, headers });

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const token = (await context.params).token;
  if (!isPublicTrackingToken(token)) return notFound();
  const order = await orderRepository.findByTrackingToken(token);
  if (!order) return notFound();
  const afterValue = new URL(request.url).searchParams.get("after");
  const after = afterValue && /^\d+$/.test(afterValue) ? BigInt(afterValue) : null;
  if (after !== null && !(await orderRepository.hasEventAfter(order.id, after))) return new NextResponse(null, { status: 204, headers });
  return NextResponse.json(toPublicOrderTracking(order), { headers });
}
