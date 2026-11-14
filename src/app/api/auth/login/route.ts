import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { login } from "@/modules/auth/service";
import { isSameOrigin } from "@/lib/request-security";
import { createAuthLoginDiagnostic, isStagingAuthDiagnosticsEnabled } from "@/modules/auth/login-diagnostics";

const inputSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const diagnosticsEnabled = isStagingAuthDiagnosticsEnabled(request, process.env.AUTH_LOGIN_DIAGNOSTICS === "true");
  const { id, diagnostic } = createAuthLoginDiagnostic(request, diagnosticsEnabled);
  try {
    const sameOrigin = diagnostic ? await diagnostic.run("request.origin_validation", () => isSameOrigin(request)) : isSameOrigin(request);
    if (!sameOrigin) {
      diagnostic?.mark("request.body_schema_validation", "skipped_csrf_rejected");
      const buildCsrfResponse = () => NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
      const response = diagnostic ? await diagnostic.run("http.error_response_build", buildCsrfResponse) : buildCsrfResponse();
      if (id) response.headers.set("x-tl-auth-diagnostic-id", id);
      diagnostic?.finish("rejected", response.status, "CSRF_REJECTED");
      return response;
    }
    const parseInput = async () => inputSchema.parse(await request.json());
    const input = diagnostic ? await diagnostic.run("request.body_schema_validation", parseInput) : await parseInput();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await login(input.email, input.password, forwarded, diagnostic);
    const response = diagnostic ? await diagnostic.run("http.response_build", () => NextResponse.json({ ok: true })) : NextResponse.json({ ok: true });
    if (id) response.headers.set("x-tl-auth-diagnostic-id", id);
    diagnostic?.finish("completed", response.status);
    return response;
  } catch (error) {
    const buildErrorResponse = () => error instanceof AppError
      ? NextResponse.json({ code: error.code, message: error.message }, { status: error.status })
      : NextResponse.json({ code: "INVALID_INPUT", message: "Datos de login inválidos." }, { status: 400 });
    const response = diagnostic ? await diagnostic.run("http.error_response_build", buildErrorResponse) : buildErrorResponse();
    if (id) response.headers.set("x-tl-auth-diagnostic-id", id);
    diagnostic?.finish(error instanceof AppError ? "rejected" : "error", response.status, error instanceof AppError ? error.code : error instanceof Error ? error.name : "NonErrorThrow");
    return response;
  }
}
