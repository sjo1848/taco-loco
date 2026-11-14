import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor } from "@/modules/orders/admin-query";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const queue = params.get("queue") ?? "start";
    if (!(["start", "preparing", "ready"] as const).includes(queue as "start" | "preparing" | "ready")) return NextResponse.json({ code: "INVALID_QUEUE" }, { status: 400 });
    const counts = await orderRepository.operationalCounts();
    if (params.get("countsOnly") === "1") return NextResponse.json({ counts }, { headers: { "Cache-Control": "private, no-store" } });
    const cursor = decodeAdminCursor(params.get("cursor"));
    const page = await orderRepository.listOperational(queue as "start" | "preparing" | "ready", cursor);
    return NextResponse.json({ orders: page.orders, counts, nextCursor: encodeAdminCursor(page.nextCursor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AdminQueryError) return NextResponse.json({ code: error.message }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
