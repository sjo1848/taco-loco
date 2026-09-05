import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { catalogService, } from "@/modules/catalog/service";
import { productRepository } from "@/modules/catalog/repository";
import { requireAdmin } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try { await requireAdmin(); const product = await productRepository.findById((await context.params).id); if (!product) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 }); return NextResponse.json(product); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 }); }
}

export async function PATCH(request: Request, context: Context) {
  try { await requireAdmin(); return NextResponse.json(await catalogService.updateProduct((await context.params).id, await request.json())); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 }); }
}
