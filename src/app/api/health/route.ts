import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export const runtime = "nodejs";

export async function GET() {
  try { await env.DB.prepare("SELECT 1").first(); return NextResponse.json({ status: "ok" }); }
  catch { return NextResponse.json({ status: "error" }, { status: 503 }); }
}
