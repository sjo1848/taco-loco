import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { createCustomerAddress, listCustomerPreferences } from "@/modules/customer/preferences";

const headers = { "cache-control": "no-store" };
export async function GET() {
  try { return NextResponse.json(await listCustomerPreferences((await requireCustomer()).id), { headers }); }
  catch (error) { if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers }); throw error; }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try { return NextResponse.json({ address: await createCustomerAddress((await requireCustomer()).id, await request.json()) }, { status: 201, headers }); }
  catch (error) { if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers }); if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers }); return NextResponse.json({ code: "INVALID_ADDRESS" }, { status: 400, headers }); }
}
