import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { createManualOrder } from "@/modules/orders/service";
import { orderRepository } from "@/modules/orders/repository";
import { orderStatusSchema } from "@/modules/orders/model";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    return NextResponse.json(await orderRepository.list({ status: status ? orderStatusSchema.parse(status) : undefined, query: searchParams.get("q") ?? undefined }));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    return NextResponse.json(await createManualOrder(await request.json(), admin.id), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT", message: "Revisá los datos del pedido." }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
