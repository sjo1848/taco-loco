import { NextResponse } from "next/server";
import { z } from "zod";
import { productRepository } from "@/modules/catalog/repository";
import { requireAdmin } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try { await requireAdmin(); const body = z.object({ available: z.boolean() }).parse(await request.json()); return NextResponse.json(await productRepository.updateAvailability((await context.params).id, body.available)); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 }); }
}
