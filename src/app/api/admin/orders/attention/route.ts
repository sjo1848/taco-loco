import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor } from "@/modules/orders/admin-query";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") ?? "all";
    if (!(["all", "verification", "unconfirmed", "incidents"] as const).includes(kind as "all" | "verification" | "unconfirmed" | "incidents")) return NextResponse.json({ code: "INVALID_FILTER" }, { status: 400 });
    const cursor = decodeAdminCursor(params.get("cursor"));
    const [page, counts] = await Promise.all([orderRepository.listAttention(kind as "all" | "verification" | "unconfirmed" | "incidents", cursor), orderRepository.attentionCounts()]);
    return NextResponse.json({ orders: page.orders, counts, nextCursor: encodeAdminCursor(page.nextCursor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AdminQueryError) return NextResponse.json({ code: error.message }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
