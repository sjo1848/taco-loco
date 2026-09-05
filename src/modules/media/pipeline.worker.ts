import { env } from "cloudflare:workers";
import { AppError } from "@/lib/errors";
import { detectAllowedImageMime, isWithinPixelLimit } from "@/modules/media/image-policy";
import { putMedia } from "./storage.worker";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

function streamFrom(bytes: Uint8Array): ReadableStream<Uint8Array> {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer]).stream();
}

export async function processProductImage(file: File) {
  const input = new Uint8Array(await file.arrayBuffer());
  if (input.length === 0 || input.length > MAX_BYTES) {
    throw new AppError("MEDIA_INVALID", "La imagen debe pesar menos de 5 MB.", 400);
  }
  if (!detectAllowedImageMime(input)) {
    throw new AppError("MEDIA_INVALID", "Formato de imagen no permitido.", 400);
  }
  try {
    const info = await env.IMAGES.info(streamFrom(input));
    if (!isWithinPixelLimit(info.width, info.height, MAX_PIXELS)) {
      throw new AppError("MEDIA_INVALID", "La imagen supera el límite de resolución permitido.", 400);
    }
    const output = await env.IMAGES.input(streamFrom(input))
      .transform({ width: 2400, height: 2400, fit: "scale-down" })
      .output({ format: "image/webp", quality: 82, anim: false });
    const response = output.response();
    if (!response.ok) throw new Error(`Images binding returned ${response.status}`);
    return { body: new Uint8Array(await response.arrayBuffer()), contentType: "image/webp" as const };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("MEDIA_INVALID", "No se pudo procesar la imagen.", 400);
  }
}

export async function uploadProductImage(productId: string, file: File) {
  const processed = await processProductImage(file);
  const key = `products/${productId}/${crypto.randomUUID()}.webp`;
  await putMedia(key, processed.body, processed.contentType);
  return key;
}
