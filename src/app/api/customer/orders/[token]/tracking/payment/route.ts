import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { getCurrentCustomer } from "@/modules/auth/customer-session";
import { isCustomerOrderId } from "@/modules/orders/customer-orders";
import { orderRepository } from "@/modules/orders/repository";
import { reportCustomerPayment } from "@/modules/orders/service";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!request.headers.get("origin") || !isSameOrigin(request)) return new NextResponse(null, { status: 403, headers });
  const customer = await getCurrentCustomer();
  if (!customer) return new NextResponse(null, { status: 401, headers });
  const { token: id } = await context.params;
  const token = isCustomerOrderId(id) ? await orderRepository.findCustomerPaymentToken(customer.id, id) : null;
  if (!token) return new NextResponse(null, { status: 404, headers });
  try {
    const result = await reportCustomerPayment(token);
    return NextResponse.json({ reported: true, reused: result.reused }, { headers });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return new NextResponse(null, { status, headers });
  }
}
