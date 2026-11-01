import { toCustomerOrderSummary, type CustomerOrderSummary } from "@/modules/orders/public-tracking";
import { orderRepository, type CustomerOrderCursor } from "@/modules/orders/repository";

export const CUSTOMER_ORDER_PAGE_SIZE = 10;

export function parseCustomerOrderCursor(value: string | null): CustomerOrderCursor | null {
  if (!value) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const parsed = JSON.parse(decoded) as { createdAt?: unknown; id?: unknown };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.id)) return null;
    const date = new Date(parsed.createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date.toISOString(), id: parsed.id };
  } catch {
    return null;
  }
}

export function encodeCustomerOrderCursor(cursor: CustomerOrderCursor) {
  return btoa(JSON.stringify(cursor)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function listCustomerOrders(customerId: string, cursor: CustomerOrderCursor | null): Promise<{ orders: CustomerOrderSummary[]; nextCursor: string | null }> {
  const result = await orderRepository.listForCustomer(customerId, cursor, CUSTOMER_ORDER_PAGE_SIZE);
  return { orders: result.orders.map(toCustomerOrderSummary), nextCursor: result.nextCursor ? encodeCustomerOrderCursor(result.nextCursor) : null };
}
