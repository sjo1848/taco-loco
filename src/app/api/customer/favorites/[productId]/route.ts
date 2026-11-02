import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { setCustomerFavorite } from "@/modules/customer/preferences";

const headers = { "cache-control": "no-store" };
export async function PUT(request: Request, context: { params: Promise<{ productId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try { const body = await request.json() as { favorite?: unknown }; if (typeof body.favorite !== "boolean") return NextResponse.json({ code: "INVALID_FAVORITE" }, { status: 400, headers }); const result = await setCustomerFavorite((await requireCustomer()).id, (await context.params).productId, body.favorite); return NextResponse.json(result, { headers }); }
  catch (error) { if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers }); if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers }); return NextResponse.json({ code: "FAVORITE_FAILED" }, { status: 400, headers }); }
}
