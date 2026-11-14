import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { createManualOrder } from "@/modules/orders/service";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor, parseAdminHistoryFilters } from "@/modules/orders/admin-query";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const filters = parseAdminHistoryFilters(searchParams);
    const page = await orderRepository.listHistory({ ...filters, cursor: decodeAdminCursor(searchParams.get("cursor")) });
    return NextResponse.json({ orders: page.orders, hasMore: page.hasMore, nextCursor: encodeAdminCursor(page.nextCursor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof z.ZodError || error instanceof AdminQueryError) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const key = request.headers.get("x-idempotency-key");
    if (key && !z.uuid().safeParse(key).success) return NextResponse.json({ code: "INVALID_IDEMPOTENCY_KEY" }, { status: 400 });
    const result = await createManualOrder(await request.json(), admin.id, key ?? null);
    return new NextResponse(JSON.stringify(result, (_key, value) => typeof value === "bigint" ? value.toString() : value), { status: 201, headers: { "content-type": "application/json" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT", message: "Revisá los datos del pedido." }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
