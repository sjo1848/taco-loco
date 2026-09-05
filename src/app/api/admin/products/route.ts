import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { catalogService } from "@/modules/catalog/service";
import { productRepository } from "@/modules/catalog/repository";
import { requireAdmin } from "@/modules/auth/session";

export async function GET() {
  try { await requireAdmin(); return NextResponse.json(await productRepository.list()); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try { await requireAdmin(); return NextResponse.json(await catalogService.createProduct(await request.json()), { status: 201 }); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 }); }
}
