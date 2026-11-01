import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { isGuestOrderClaimable, isTrackingTokenShape } from "@/modules/orders/claim-policy";

const headers = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
const genericUnavailable = () => NextResponse.json({ code: "ORDER_CLAIM_UNAVAILABLE" }, { status: 409, headers });

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!request.headers.get("origin") || !isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  const token = (await context.params).token;
  if (!isTrackingTokenShape(token)) return NextResponse.json({ code: "ORDER_CLAIM_UNAVAILABLE" }, { status: 404, headers });
  let customer;
  try { customer = await requireCustomer(); } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers });
    throw error;
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ code: "CONFIRMATION_REQUIRED" }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || (body as { confirm?: unknown }).confirm !== true) return NextResponse.json({ code: "CONFIRMATION_REQUIRED" }, { status: 400, headers });
  const order = await db.order.findUnique({ where: { publicTrackingToken: token }, select: { id: true, customerId: true, createdAt: true } });
  if (!order) return NextResponse.json({ code: "ORDER_CLAIM_UNAVAILABLE" }, { status: 404, headers });
  if (order.customerId === customer.id) return NextResponse.json({ claimed: true, reused: true }, { headers });
  if (order.customerId) return genericUnavailable();
  if (!isGuestOrderClaimable(order.createdAt)) return NextResponse.json({ code: "ORDER_CLAIM_UNAVAILABLE" }, { status: 404, headers });
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.order.updateMany({ where: { id: order.id, publicTrackingToken: token, customerId: null, createdAt: { gte: cutoff } }, data: { customerId: customer.id } });
  if (result.count === 1) return NextResponse.json({ claimed: true, reused: false }, { headers });
  const winner = await db.order.findUnique({ where: { id: order.id }, select: { customerId: true } });
  if (winner?.customerId === customer.id) return NextResponse.json({ claimed: true, reused: true }, { headers });
  return genericUnavailable();
}
