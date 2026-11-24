import { NextResponse } from "next/server";
import { requireCustomer } from "@/modules/auth/customer-session";
import { listCustomerOrders, parseCustomerOrderCursor } from "@/modules/orders/customer-orders";

export async function GET(request: Request) {
  try {
    const customer = await requireCustomer();
    const search = new URL(request.url).searchParams;
    const cursorValue = search.get("cursor");
    const view = search.get("view") ?? "all";
    if (view !== "all" && view !== "active" && view !== "history") return NextResponse.json({ code: "INVALID_VIEW" }, { status: 400, headers: { "cache-control": "no-store" } });
    if (cursorValue && !parseCustomerOrderCursor(cursorValue)) return NextResponse.json({ code: "INVALID_CURSOR" }, { status: 400, headers: { "cache-control": "no-store" } });
    const result = await listCustomerOrders(customer.id, parseCustomerOrderCursor(cursorValue), view);
    return NextResponse.json(view === "all" ? result : { ...result, viewerId: customer.id }, { headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_UNAUTHORIZED") return NextResponse.json({ code: "CUSTOMER_UNAUTHORIZED" }, { status: 401, headers: { "cache-control": "no-store" } });
    console.error("[customer.orders] request failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
