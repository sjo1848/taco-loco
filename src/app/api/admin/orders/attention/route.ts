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
    const normalizedKind = kind as "all" | "verification" | "unconfirmed" | "incidents";
    if (params.get("countsOnly") === "1") {
      const counts = await orderRepository.attentionCounts(normalizedKind);
      return NextResponse.json({ counts }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const bucket = params.get("bucket") ?? "today";
    if (bucket !== "today" && bucket !== "previous") return NextResponse.json({ code: "INVALID_BUCKET" }, { status: 400 });
    const cursor = decodeAdminCursor(params.get("cursor"));
    const page = await orderRepository.listAttention(normalizedKind, bucket, cursor);
    const counts = bucket === "today" ? await orderRepository.attentionCounts(normalizedKind) : undefined;
    return NextResponse.json({ orders: page.orders, ...(counts ? { counts } : {}), bucket, nextCursor: encodeAdminCursor(page.nextCursor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AdminQueryError) return NextResponse.json({ code: error.message }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
