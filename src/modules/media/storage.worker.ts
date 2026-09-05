import { env } from "cloudflare:workers";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

export async function putMedia(key: string, body: Uint8Array, contentType: string) {
  await env.MEDIA_BUCKET.put(key, body, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
  return key;
}

export async function deleteMedia(key: string) {
  await env.MEDIA_BUCKET.delete(key);
}

export async function getMedia(key: string) {
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) throw new Error("Media not found");
  return {
    body: new Uint8Array(await object.arrayBuffer()),
    contentType: object.httpMetadata?.contentType ?? "image/webp",
  };
}
