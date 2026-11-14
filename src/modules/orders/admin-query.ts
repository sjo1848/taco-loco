import { z } from "zod";
import { orderFulfillmentSchema, orderStatusSchema } from "@/modules/orders/model";
import type { AdminOrderCursor } from "@/modules/orders/repository";

export class AdminQueryError extends Error {
  constructor(message: "INVALID_CURSOR" | "INVALID_DATE" | "INVALID_DATE_RANGE" | "INVALID_FILTER") {
    super(message);
    this.name = "AdminQueryError";
  }
}

export const adminCursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });
export function decodeAdminCursor(value: string | null): AdminOrderCursor | null {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = adminCursorSchema.parse(JSON.parse(atob(normalized + "=".repeat((4-normalized.length%4)%4))));
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch { throw new AdminQueryError("INVALID_CURSOR"); }
}
export function encodeAdminCursor(value: { createdAt: string; id: string } | null) {
  return value ? btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") : null;
}
export function businessDateBounds(from: string | null, to: string | null) {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const validDate=(value:string|null)=>{
    if (!value) return true;
    if (!date.safeParse(value).success) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from)||!validDate(to)) throw new AdminQueryError("INVALID_DATE");
  const start = from ? new Date(`${from}T00:00:00-03:00`) : undefined;
  const end = to ? new Date(`${to}T23:59:59.999-03:00`) : undefined;
  if (start && end && start > end) throw new AdminQueryError("INVALID_DATE_RANGE");
  return { from: start, to: end };
}
export function parseAdminHistoryFilters(params: URLSearchParams) {
  const { from, to } = businessDateBounds(params.get("from"), params.get("to"));
  const status = params.get("status");
  const fulfillment = params.get("fulfillment");
  return {
    from, to,
    status: status ? orderStatusSchema.parse(status) : undefined,
    fulfillment: fulfillment ? orderFulfillmentSchema.parse(fulfillment) : undefined,
    query: params.get("q")?.trim().slice(0, 120) || undefined,
  };
}
