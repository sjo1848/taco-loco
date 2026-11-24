import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/request-security";
import { requireCustomer } from "@/modules/auth/customer-session";
import { publicCustomer, updateCustomerDisplayName } from "@/modules/auth/customer-service";

const headers = { "cache-control": "no-store" };
const inputSchema = z.object({ displayName: z.string() }).strict();

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403, headers });
  try {
    const customer = await requireCustomer();
    const viewer = request.headers.get("x-customer-viewer");
    if (viewer !== null && viewer !== customer.id) return NextResponse.json({ code: "CUSTOMER_SESSION_CHANGED" }, { status: 409, headers });
    const input = inputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ code: "INVALID_INPUT" }, { status: 400, headers });
    const displayName = input.data.displayName.trim();
    const length = Array.from(displayName).length;
    if (length < 1 || length > 160) return NextResponse.json({ code: "INVALID_DISPLAY_NAME" }, { status: 400, headers });
    const updated = await updateCustomerDisplayName(customer.id, displayName);
    return NextResponse.json({ customer: publicCustomer(updated) }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers });
    return NextResponse.json({ code: "PROFILE_UPDATE_FAILED" }, { status: 500, headers });
  }
}
