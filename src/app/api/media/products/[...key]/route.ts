import { NextResponse } from "next/server";
import { getMedia } from "@/modules/media/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await params;
    const media = await getMedia(key.join("/"));
    return new NextResponse(media.body, { headers: { "content-type": media.contentType, "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
