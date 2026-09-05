import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMediaEnv } from "@/lib/env";

let client: S3Client | undefined;

function storageMode() {
  return process.env.MEDIA_STORAGE ?? (process.env.NODE_ENV === "production" ? "r2" : "local");
}

function localMediaRoot() {
  return path.join(process.cwd(), ".local-media");
}

function localMediaPath(key: string) {
  const root = localMediaRoot();
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid media key");
  return resolved;
}

function getClient() {
  if (!client) {
    const env = getMediaEnv();
    client = new S3Client({ region: "auto", endpoint: env.R2_ENDPOINT, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
  }
  return { client, env: getMediaEnv() };
}

export async function putMedia(key: string, body: Buffer, contentType: string) {
  if (storageMode() === "local") {
    const target = localMediaPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return key;
  }
  const { client: s3, env } = getClient();
  await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return key;
}

export async function deleteMedia(key: string) {
  if (storageMode() === "local") return;
  const { client: s3, env } = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export async function getMedia(key: string) {
  if (storageMode() === "local") {
    const body = await readFile(/* turbopackIgnore: true */ localMediaPath(key));
    return { body, contentType: "image/webp" };
  }
  const { client: s3, env } = getClient();
  const response = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  if (!response.Body) throw new Error("Media not found");
  return { body: Buffer.from(await response.Body.transformToByteArray()), contentType: response.ContentType ?? "image/webp" };
}
