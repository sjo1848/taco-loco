import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/request-security";

const SESSION_COOKIE = "taco_loco_session";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (request.nextUrl.pathname.startsWith("/api/admin/") && ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  }
  if (hasSessionCookie) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/admin/")) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
