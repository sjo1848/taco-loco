import { NextResponse } from "next/server";
import { logout } from "@/modules/auth/service";
import { isSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  await logout();
  return NextResponse.json({ ok: true });
}
