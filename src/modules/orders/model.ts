import { z } from "zod";

export const orderStatusSchema = z.enum(["RECEIVED", "CONFIRMED", "IN_PREPARATION", "READY", "DELIVERED", "CANCELLED"]);
export const orderFulfillmentSchema = z.enum(["PICKUP", "DINE_IN"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderFulfillment = z.infer<typeof orderFulfillmentSchema>;

const ORDER_STATUS = { RECEIVED: "RECEIVED", CONFIRMED: "CONFIRMED", IN_PREPARATION: "IN_PREPARATION", READY: "READY", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED" } as const;

export const orderLineInputSchema = z.object({
  productId: z.uuid().nullable().optional(),
  productName: z.string().trim().min(1).max(160),
  unitPriceAmount: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(20),
  modifiersSnapshot: z.array(z.object({ group: z.string().trim().min(1).max(120), option: z.string().trim().min(1).max(120) })).max(20).default([]),
  note: z.string().trim().max(500).nullable().optional(),
});

export const createOrderInputSchema = z.object({
  fulfillment: orderFulfillmentSchema.default("PICKUP"),
  customerName: z.string().trim().max(160).nullable().optional(),
  customerPhone: z.string().trim().max(32).nullable().optional(),
  tableLabel: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  adjustmentAmount: z.number().int().min(-100000000).max(100000000).default(0),
  lines: z.array(orderLineInputSchema).min(1).max(100),
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.RECEIVED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.IN_PREPARATION, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_PREPARATION]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export function availableTransitions(from: OrderStatus) {
  return [...transitions[from]];
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransition(from, to)) throw new Error(`INVALID_ORDER_TRANSITION:${from}:${to}`);
}

export function calculateOrderTotals(lines: Pick<CreateOrderInput["lines"][number], "unitPriceAmount" | "quantity">[], adjustmentAmount = 0) {
  const subtotalAmount = lines.reduce((sum, line) => sum + line.unitPriceAmount * line.quantity, 0);
  return { subtotalAmount, adjustmentAmount, totalAmount: subtotalAmount + adjustmentAmount };
}

export function formatOrderNumber(orderNumber: number) {
  return `TL-${String(orderNumber).padStart(4, "0")}`;
}
