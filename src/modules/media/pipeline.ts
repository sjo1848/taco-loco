import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { putMedia } from "@/modules/media/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function processProductImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer());
  if (input.length === 0 || input.length > MAX_BYTES) throw new AppError("MEDIA_INVALID", "La imagen debe pesar menos de 5 MB.", 400);
  const detected = await fileTypeFromBuffer(input);
  if (!detected || !ALLOWED_TYPES.has(detected.mime)) throw new AppError("MEDIA_INVALID", "Formato de imagen no permitido.", 400);
  try {
    const output = await sharp(input, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    return { body: output, contentType: "image/webp" as const };
  } catch {
    throw new AppError("MEDIA_INVALID", "No se pudo procesar la imagen.", 400);
  }
}

export async function uploadProductImage(productId: string, file: File) {
  const processed = await processProductImage(file);
  const key = `products/${productId}/${randomUUID()}.webp`;
  await putMedia(key, processed.body, processed.contentType);
  return key;
}
