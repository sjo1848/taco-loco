import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { requireCustomer } from "@/modules/auth/customer-session";
import { prepareCustomerOrderRepeat } from "@/modules/orders/service";

const headers = { "cache-control": "no-store" };
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const customer = await requireCustomer();
    return NextResponse.json({ proposal: await prepareCustomerOrderRepeat(customer.id, (await context.params).token) }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers });
    return NextResponse.json({ code: "REPEAT_ORDER_FAILED" }, { status: 409, headers });
  }
}
