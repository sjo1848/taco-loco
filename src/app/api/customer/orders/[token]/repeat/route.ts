import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { repeatCustomerOrder } from "@/modules/orders/service";

const headers = { "cache-control": "no-store" };
const input = z.object({ clientReference: z.string().trim().min(16).max(100) });
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try {
    const customer = await requireCustomer();
    const parsed = input.parse(await request.json());
    const result = await repeatCustomerOrder(customer.id, (await context.params).token, parsed.clientReference);
    const path = result.order.publicTrackingToken ? `/pedido/${result.order.publicTrackingToken}` : null;
    const url = path ? new URL(path, request.url).toString() : null;
    return NextResponse.json({ order: { orderNumber: result.order.orderNumber, totalAmount: result.order.totalAmount }, tracking: path ? { path, url } : null, reused: result.reused }, { status: result.reused ? 200 : 201, headers });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400, headers });
    return NextResponse.json({ code: "REPEAT_ORDER_FAILED" }, { status: 409, headers });
  }
}
