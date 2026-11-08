import { NextResponse } from "next/server";
import { getOperatingContext } from "@/modules/settings/operating-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let operatingContext;
    if ("WebSocketPair" in globalThis) {
      const { getWorkerOperatingContext } = await import("@/modules/catalog/read-model.worker");
      operatingContext = await getWorkerOperatingContext();
    } else {
      const { db } = await import("@/lib/db");
      const settings = await db.menuSettings.findFirstOrThrow();
      operatingContext = getOperatingContext(settings);
    }
    return NextResponse.json({ operatingContext }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ code: "STATUS_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
