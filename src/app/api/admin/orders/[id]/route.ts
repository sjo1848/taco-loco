import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { orderRepository } from "@/modules/orders/repository";
import { transitionOrder } from "@/modules/orders/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    await requireAdmin();
    const order = await orderRepository.findById((await context.params).id);
    return new NextResponse(JSON.stringify(order, (_key, value) => typeof value === "bigint" ? value.toString() : value), { headers: { "content-type": "application/json" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const result = await transitionOrder({ ...(await request.json()), orderId: (await context.params).id }, admin.id);
    return new NextResponse(JSON.stringify(result, (_key, value) => typeof value === "bigint" ? value.toString() : value), { headers: { "content-type": "application/json" } });
  } catch (error) {
    console.error("[admin.orders.transition] request failed", error instanceof Error ? error.message : error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ code: "INVALID_INPUT", message: "Revisá el estado o el motivo." }, { status: 400 });
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
