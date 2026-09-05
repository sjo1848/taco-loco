import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { login } from "@/modules/auth/service";
import { isSameOrigin } from "@/lib/request-security";

const inputSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
    const input = inputSchema.parse(await request.json());
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await login(input.email, input.password, forwarded);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ code: "INVALID_INPUT", message: "Datos de login inválidos." }, { status: 400 });
  }
}
