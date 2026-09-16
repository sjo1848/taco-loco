import { NextResponse } from "next/server";
import { orderRepository } from "@/modules/orders/repository";
import { isPublicTrackingToken } from "@/modules/orders/tracking-token";
import { buildPublicOrderTracking, publicTrackingCursor } from "@/modules/orders/public-tracking";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" };
const notFound = () => new NextResponse(null, { status: 404, headers });
export function shouldCheckTrackingCursor(after: string | null) { return Boolean(after && /^[A-Za-z0-9_-]{43}$/.test(after)); }

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const token = (await context.params).token;
  if (!isPublicTrackingToken(token)) return notFound();
  const order = await orderRepository.findByTrackingToken(token);
  if (!order) return notFound();
  const after = new URL(request.url).searchParams.get("after");
  const latest = await orderRepository.latestEventSequenceForOrder(order.id);
  const currentCursor = await publicTrackingCursor(token, latest);
  if (shouldCheckTrackingCursor(after) && after === currentCursor) return new NextResponse(null, { status: 204, headers });
  return NextResponse.json(await buildPublicOrderTracking(order, token), { headers });
}
