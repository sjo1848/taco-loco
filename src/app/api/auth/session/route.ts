import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/modules/auth/session";
import { createAdminQueryDiagnostic } from "@/modules/orders/admin-query-diagnostics";

export async function GET(request: Request) {
  const diagnostic = createAdminQueryDiagnostic(request, "session", process.env.ADMIN_QUERY_DIAGNOSTICS === "true");
  const run = <T>(stage: string, operation: () => T | Promise<T>) => diagnostic ? diagnostic.run(stage, operation) : operation();
  const user = await run("auth.get_current_admin", () => getCurrentAdmin(diagnostic));
  const response = await run("response.build", () => user
    ? NextResponse.json({ authenticated: true, user: { id: user.id, email: user.email } })
    : NextResponse.json({ authenticated: false }, { status: 401 }));
  if (diagnostic) {
    response.headers.set("x-tl-admin-query-id", diagnostic.id);
    diagnostic.finish(response.status);
  }
  return response;
}
