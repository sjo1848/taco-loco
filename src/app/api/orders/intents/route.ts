import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { isSameOrigin } from "@/lib/request-security";
import { publicOrderIntentRateLimit } from "@/modules/orders/public-rate-limit";
import { createPublicOrderIntent } from "@/modules/orders/service";

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limit = publicOrderIntentRateLimit(key);
    if (!limit.allowed) return NextResponse.json({ code: "RATE_LIMITED", message: "Demasiados intentos. Volvé a intentar más tarde." }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
    const result = await createPublicOrderIntent(await request.json());
    return NextResponse.json({ order: { id: result.order.id, orderNumber: result.order.orderNumber, totalAmount: result.order.totalAmount }, reused: result.reused }, { status: result.reused ? 200 : 201 });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT", message: "No pudimos preparar el pedido." }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR", message: "No pudimos preparar el pedido." }, { status: 500 });
  }
}
