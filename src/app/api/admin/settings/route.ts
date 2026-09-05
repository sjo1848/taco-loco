import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { settingsService } from "@/modules/settings/service";
import { requireAdmin } from "@/modules/auth/session";

export async function GET() { try { await requireAdmin(); return NextResponse.json(await settingsService.get()); } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 }); } }
export async function PATCH(request: Request) { try { await requireAdmin(); return NextResponse.json(await settingsService.update(await request.json())); } catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 }); } }
