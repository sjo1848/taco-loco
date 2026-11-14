import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/modules/orders/model";

export type OrderListFilter = { status?: OrderStatus; query?: string };
export type CustomerOrderCursor = { createdAt: string; id: string };
export type AdminOrderCursor = { createdAt: Date; id: string };
type AdminQueue = "start" | "preparing" | "ready";

function cursorWhere(cursor: AdminOrderCursor | null, direction: "asc" | "desc") {
  if (!cursor) return {};
  const comparison = direction === "asc" ? "gt" : "lt";
  return { AND: [{ OR: [{ createdAt: { [comparison]: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { [comparison]: cursor.id } }] }] };
}

function adminSearch(query?: string) {
  const normalized = query?.trim() ?? "";
  if (!normalized) return {};
  const orderNumber = parseOrderNumber(normalized);
  return { OR: [{ customerName: { contains: normalized, mode: "insensitive" as const } }, { customerPhone: { contains: normalized } }, ...(orderNumber ? [{ orderNumber }] : [])] };
}

const operationalOrderSelect = {
  id: true, orderNumber: true, status: true, fulfillment: true, verificationStatus: true,
  paymentStatus: true, refundStatus: true, customerName: true, totalAmount: true, createdAt: true, notes: true,
  lines: { select: { quantity: true, productName: true, modifiersSnapshot: true, note: true } },
} as const;
const attentionOrderSelect = {
  id: true, orderNumber: true, status: true, fulfillment: true, verificationStatus: true,
  paymentStatus: true, refundStatus: true, customerName: true, totalAmount: true, createdAt: true,
} as const;
const historyOrderSelect = {
  id: true, orderNumber: true, status: true, fulfillment: true, customerName: true,
  totalAmount: true, createdAt: true, refundStatus: true,
} as const;

function parseOrderNumber(query: string) {
  const value = query.replace(/^tl-/i, "").trim();
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export const orderRepository = {
  async listForCustomer(customerId: string, cursor: CustomerOrderCursor | null, take = 10) {
    const rows = await db.order.findMany({
      where: {
        customerId,
        ...(cursor ? { OR: [{ createdAt: { lt: new Date(cursor.createdAt) } }, { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } }] } : {}),
      },
      include: { lines: true, events: { orderBy: { sequence: "asc" } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const orders = hasMore ? rows.slice(0, take) : rows;
    const last = orders.at(-1);
    return { orders, nextCursor: hasMore && last ? { createdAt: new Date(last.createdAt).toISOString(), id: last.id } : null };
  },

  async latestEventSequence() {
    const event = await db.orderEvent.findFirst({ orderBy: { sequence: "desc" }, select: { sequence: true } });
    return event?.sequence ?? BigInt(0);
  },

  async eventsAfter(sequence: bigint, take = 100) {
    return db.orderEvent.findMany({ where: { sequence: { gt: sequence } }, orderBy: { sequence: "asc" }, take, select: { sequence: true, orderId: true } });
  },

  async latestEventSequenceForOrder(orderId: string) {
    const event = await db.orderEvent.findFirst({ where: { orderId }, orderBy: { sequence: "desc" }, select: { sequence: true } });
    return event?.sequence ?? BigInt(0);
  },

  async hasEventAfter(orderId: string, sequence: bigint) {
    return Boolean(await db.orderEvent.findFirst({ where: { orderId, sequence: { gt: sequence } }, select: { id: true } }));
  },

  async findByTrackingToken(token: string) {
    return db.order.findUnique({ where: { publicTrackingToken: token }, include: { lines: true, events: { orderBy: { sequence: "asc" } } } });
  },

  async list(filter: OrderListFilter = {}) {
    const query = filter.query?.trim() ?? "";
    const orderNumber = query ? parseOrderNumber(query) : null;
    return db.order.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(query ? { OR: [{ customerName: { contains: query, mode: "insensitive" } }, { customerPhone: { contains: query, mode: "insensitive" } }, ...(orderNumber ? [{ orderNumber }] : [])] } : {}),
      },
      include: { lines: true, createdBy: { select: { email: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
  },
  async operationalCounts() {
    const [start, preparing, ready, verification, unconfirmed, incidents] = await Promise.all([
      db.order.count({ where: { status: "CONFIRMED", verificationStatus: "VERIFIED", paymentStatus: { in: ["NOT_REQUIRED", "CONFIRMED"] } } }),
      db.order.count({ where: { status: "IN_PREPARATION", verificationStatus: "VERIFIED", paymentStatus: { in: ["NOT_REQUIRED", "CONFIRMED"] } } }),
      db.order.count({ where: { status: "READY", verificationStatus: "VERIFIED", paymentStatus: { in: ["NOT_REQUIRED", "CONFIRMED"] } } }),
      db.order.count({ where: { verificationStatus: "PENDING" } }),
      db.order.count({ where: { status: "RECEIVED" } }),
      db.order.count({ where: { OR: [{ refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }),
    ]);
    return { start, preparing, ready, verification, unconfirmed, incidents, attention: await db.order.count({ where: { OR: [{ verificationStatus: "PENDING" }, { status: "RECEIVED" }, { refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }) };
  },
  async listOperational(queue: AdminQueue, cursor: AdminOrderCursor | null, take = 30) {
    const state = queue === "start" ? { status: "CONFIRMED" as const } : queue === "preparing" ? { status: "IN_PREPARATION" as const } : { status: "READY" as const };
    const where = { ...state, verificationStatus: "VERIFIED" as const, paymentStatus: { in: ["NOT_REQUIRED", "CONFIRMED"] as const }, ...cursorWhere(cursor, "asc") };
    const rows = await db.order.findMany({ where, select: operationalOrderSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: take + 1 });
    const hasMore = rows.length > take;
    const orders = hasMore ? rows.slice(0, take) : rows;
    const last = orders.at(-1);
    return { orders, hasMore, nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null };
  },
  async listAttention(kind: "all" | "verification" | "unconfirmed" | "incidents", cursor: AdminOrderCursor | null, take = 30) {
    const condition = kind === "verification" ? { verificationStatus: "PENDING" as const }
      : kind === "unconfirmed" ? { status: "RECEIVED" as const }
      : kind === "incidents" ? { OR: [{ refundStatus: "REQUIRED" as const }, { paymentStatus: "REJECTED" as const }] }
      : { OR: [{ verificationStatus: "PENDING" as const }, { status: "RECEIVED" as const }, { refundStatus: "REQUIRED" as const }, { paymentStatus: "REJECTED" as const }] };
    const rows = await db.order.findMany({ where: { ...condition, ...cursorWhere(cursor, "asc") }, select: attentionOrderSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: take + 1 });
    const hasMore = rows.length > take;
    const orders = hasMore ? rows.slice(0, take) : rows;
    const last = orders.at(-1);
    return { orders, hasMore, nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null };
  },
  async attentionCounts() {
    const [all, verification, unconfirmed, incidents] = await Promise.all([
      db.order.count({ where: { OR: [{ verificationStatus: "PENDING" }, { status: "RECEIVED" }, { refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }),
      db.order.count({ where: { verificationStatus: "PENDING" } }),
      db.order.count({ where: { status: "RECEIVED" } }),
      db.order.count({ where: { OR: [{ refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }),
    ]);
    return { all, verification, unconfirmed, incidents };
  },
  async listHistory(input: { cursor: AdminOrderCursor | null; take?: number; from?: Date; to?: Date; status?: OrderStatus; fulfillment?: "PICKUP" | "DINE_IN" | "DELIVERY"; query?: string }) {
    const rows = await db.order.findMany({
      where: {
        ...(input.from || input.to ? { createdAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } } : {}),
        ...(input.status ? { status: input.status } : {}), ...(input.fulfillment ? { fulfillment: input.fulfillment } : {}),
        ...adminSearch(input.query), ...cursorWhere(input.cursor, "desc"),
      },
      select: historyOrderSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: (input.take ?? 30) + 1,
    });
    const take = input.take ?? 30;
    const hasMore = rows.length > take;
    const orders = hasMore ? rows.slice(0, take) : rows;
    const last = orders.at(-1);
    return { orders, hasMore, nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null };
  },
  async findById(id: string) {
    const order = await db.order.findUnique({
      where: { id },
      include: { lines: true, createdBy: { select: { email: true } }, updatedBy: { select: { email: true } }, events: { include: { actor: { select: { email: true } } }, orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    return order;
  },
};
