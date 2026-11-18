import { NextResponse } from "next/server";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { AdminQueryError, decodeAdminCursor, encodeAdminCursor } from "@/modules/orders/admin-query";
import { createAdminQueryDiagnostic } from "@/modules/orders/admin-query-diagnostics";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const diagnostic = createAdminQueryDiagnostic(request, "operations", process.env.ADMIN_QUERY_DIAGNOSTICS === "true");
  const run = <T>(stage: string, operation: () => T | Promise<T>) => diagnostic ? diagnostic.run(stage, operation) : operation();
  const respond = (response: NextResponse) => { if (diagnostic) { response.headers.set("x-tl-admin-query-id", diagnostic.id); diagnostic.finish(response.status); } return response; };
  try {
    await run("auth.require_admin", () => diagnostic ? requireAdmin(diagnostic) : requireAdmin());
    const params = await run("request.params", () => new URL(request.url).searchParams);
    const queue = params.get("queue") ?? "start";
    if (!(["start", "preparing", "ready"] as const).includes(queue as "start" | "preparing" | "ready")) return respond(NextResponse.json({ code: "INVALID_QUEUE" }, { status: 400 }));
    const counts = await run("repository.operational_counts", () => diagnostic ? orderRepository.operationalCounts(diagnostic) : orderRepository.operationalCounts());
    if (params.get("countsOnly") === "1") return respond(await run("response.build", () => NextResponse.json({ counts }, { headers: { "Cache-Control": "private, no-store" } })));
    const cursor = await run("cursor.decode", () => decodeAdminCursor(params.get("cursor")));
    const page = await run("repository.list_operational", () => diagnostic ? orderRepository.listOperational(queue as "start" | "preparing" | "ready", cursor, 30, diagnostic) : orderRepository.listOperational(queue as "start" | "preparing" | "ready", cursor));
    const payload = await run("result.transform", () => ({ orders: page.orders, counts, nextCursor: encodeAdminCursor(page.nextCursor) }));
    return respond(await run("response.build", () => NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } })));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return respond(NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }));
    if (error instanceof AdminQueryError) return respond(NextResponse.json({ code: error.message }, { status: 400 }));
    return respond(NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
