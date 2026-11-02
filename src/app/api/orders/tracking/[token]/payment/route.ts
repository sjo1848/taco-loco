import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { reportCustomerPayment } from "@/modules/orders/service";
import { isPublicTrackingToken } from "@/modules/orders/tracking-token";

const headers = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  const token = (await context.params).token;
  if (!isPublicTrackingToken(token)) return NextResponse.json({ code: "PAYMENT_REPORT_NOT_AVAILABLE" }, { status: 404, headers });
  try { const result = await reportCustomerPayment(token); return NextResponse.json({ reported: true, reused: result.reused }, { headers }); }
  catch (error) { if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers }); return NextResponse.json({ code: "PAYMENT_REPORT_FAILED" }, { status: 409, headers }); }
}
