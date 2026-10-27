import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/request-security";
import { logoutCustomer } from "@/modules/auth/customer-service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  await logoutCustomer();
  return NextResponse.json({ ok: true });
}
