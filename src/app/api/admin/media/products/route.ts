import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/modules/auth/session";
import { uploadProductImage } from "@/modules/media/pipeline";

export const runtime = "nodejs";

const productIdSchema = z.string().regex(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, "Invalid product id");

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const productId = productIdSchema.parse(form.get("productId"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("MEDIA_INVALID", "Falta el archivo de imagen.", 400);
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError("NOT_FOUND", "Producto no encontrado.", 404);
    const imageKey = await uploadProductImage(productId, file);
    await db.product.update({ where: { id: productId }, data: { imageKey, imageAlt: product.imageAlt ?? product.name } });
    return NextResponse.json({ imageKey });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof AppError) return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ code: "MEDIA_INVALID", message: "No se pudo cargar la imagen." }, { status: 400 });
  }
}
