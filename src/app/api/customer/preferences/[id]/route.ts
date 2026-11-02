import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { deleteCustomerAddress, updateCustomerAddress } from "@/modules/customer/preferences";

const headers = { "cache-control": "no-store" };
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try { const customer = await requireCustomer(); return NextResponse.json({ address: await updateCustomerAddress(customer.id, (await context.params).id, await request.json()) }, { headers }); }
  catch (error) { if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers }); if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers }); return NextResponse.json({ code: "INVALID_ADDRESS" }, { status: 400, headers }); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try { const customer = await requireCustomer(); await deleteCustomerAddress(customer.id, (await context.params).id); return new NextResponse(null, { status: 204, headers }); }
  catch (error) { if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers }); if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers }); return NextResponse.json({ code: "ADDRESS_DELETE_FAILED" }, { status: 400, headers }); }
}
