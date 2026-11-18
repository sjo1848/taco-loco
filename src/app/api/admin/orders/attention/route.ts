import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor } from "@/modules/orders/admin-query";
import { createAdminQueryDiagnostic } from "@/modules/orders/admin-query-diagnostics";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const diagnostic = createAdminQueryDiagnostic(request, "attention", process.env.ADMIN_QUERY_DIAGNOSTICS === "true");
  const run = <T>(stage: string, operation: () => T | Promise<T>) => diagnostic ? diagnostic.run(stage, operation) : operation();
  const respond = (response: NextResponse) => { if (diagnostic) { response.headers.set("x-tl-admin-query-id", diagnostic.id); diagnostic.finish(response.status); } return response; };
  try {
    await run("auth.require_admin", () => diagnostic ? requireAdmin(diagnostic) : requireAdmin());
    const params = await run("request.params", () => new URL(request.url).searchParams);
    const kind = params.get("kind") ?? "all";
    if (!(["all", "verification", "unconfirmed", "incidents"] as const).includes(kind as "all" | "verification" | "unconfirmed" | "incidents")) return respond(NextResponse.json({ code: "INVALID_FILTER" }, { status: 400 }));
    const normalizedKind = kind as "all" | "verification" | "unconfirmed" | "incidents";
    if (params.get("countsOnly") === "1") {
      const counts = await run("repository.attention_counts", () => diagnostic ? orderRepository.attentionCounts(normalizedKind, new Date(), diagnostic) : orderRepository.attentionCounts(normalizedKind));
      return respond(await run("response.build", () => NextResponse.json({ counts }, { headers: { "Cache-Control": "private, no-store" } })));
    }
    const bucket = params.get("bucket") ?? "today";
    if (bucket !== "today" && bucket !== "previous") return respond(NextResponse.json({ code: "INVALID_BUCKET" }, { status: 400 }));
    const cursor = await run("cursor.decode", () => decodeAdminCursor(params.get("cursor")));
    const page = await run("repository.list_attention", () => diagnostic ? orderRepository.listAttention(normalizedKind, bucket, cursor, 30, new Date(), diagnostic) : orderRepository.listAttention(normalizedKind, bucket, cursor));
    const counts = bucket === "today" ? await run("repository.attention_counts", () => diagnostic ? orderRepository.attentionCounts(normalizedKind, new Date(), diagnostic) : orderRepository.attentionCounts(normalizedKind)) : undefined;
    const payload = await run("result.transform", () => ({ orders: page.orders, ...(counts ? { counts } : {}), bucket, nextCursor: encodeAdminCursor(page.nextCursor) }));
    return respond(await run("response.build", () => NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } })));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return respond(NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }));
    if (error instanceof AdminQueryError) return respond(NextResponse.json({ code: error.message }, { status: 400 }));
    return respond(NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
