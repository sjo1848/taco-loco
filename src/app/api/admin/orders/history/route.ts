import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor, parseAdminHistoryFilters } from "@/modules/orders/admin-query";
import { z } from "zod";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const filters = parseAdminHistoryFilters(params);
    const page = await orderRepository.listHistory({ ...filters, cursor: decodeAdminCursor(params.get("cursor")) });
    return NextResponse.json({ orders: page.orders, hasMore: page.hasMore, nextCursor: encodeAdminCursor(page.nextCursor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AdminQueryError || error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_FILTER_OR_CURSOR" }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
