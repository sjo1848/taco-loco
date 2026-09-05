import { NextResponse } from "next/server";
import { catalogService } from "@/modules/catalog/service";
import { requireAdmin } from "@/modules/auth/session";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try { await requireAdmin(); return NextResponse.json(await catalogService.updateCategory((await context.params).id, await request.json())); }
  catch (error) { if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }); return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 }); }
}
