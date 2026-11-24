import { AppError } from "@/lib/errors";
import { db, queryD1Raw } from "@/lib/db";
import { isD1Runtime } from "@/lib/runtime";
import { businessDayStart } from "@/modules/orders/business-day";
import type { OrderStatus } from "@/modules/orders/model";

export type OrderListFilter = { status?: OrderStatus; query?: string };
export type CustomerOrderView = "all" | "active" | "history";
export type CustomerOrderCursor = { createdAt: string; id: string };
export type AdminOrderCursor = { createdAt: Date; id: string };
type AdminQueue = "start" | "preparing" | "ready";
type AttentionKind = "all" | "verification" | "unconfirmed" | "incidents";
type AttentionBucket = "today" | "previous";

function cursorWhere(cursor: AdminOrderCursor | null, direction: "asc" | "desc") {
  if (!cursor) return {};
  const comparison = direction === "asc" ? "gt" : "lt";
  return { AND: [{ OR: [{ createdAt: { [comparison]: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { [comparison]: cursor.id } }] }] };
}

function adminSearch(query?: string) {
  const normalized = query?.trim() ?? "";
  if (!normalized) return {};
  const orderNumber = parseOrderNumber(normalized);
  // Prisma's SQLite/D1 connector rejects `mode: "insensitive"` (it is a
  // PostgreSQL-only filter). SQLite LIKE is case-insensitive for ASCII by
  // default, so omit the mode on D1 while preserving PostgreSQL behavior.
  const textMatch = (value: string) => ({ contains: value, ...(!isD1Runtime ? { mode: "insensitive" as const } : {}) });
  return { OR: [{ customerName: textMatch(normalized) }, { customerPhone: textMatch(normalized) }, ...(orderNumber ? [{ orderNumber }] : [])] };
}

function attentionWhere(kind: AttentionKind) {
  return kind === "verification" ? { verificationStatus: "PENDING" as const }
    : kind === "unconfirmed" ? { status: "RECEIVED" as const }
    : kind === "incidents" ? { OR: [{ refundStatus: "REQUIRED" as const }, { paymentStatus: "REJECTED" as const }] }
    : { OR: [{ verificationStatus: "PENDING" as const }, { status: "RECEIVED" as const }, { refundStatus: "REQUIRED" as const }, { paymentStatus: "REJECTED" as const }] };
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

type AggregateCount = number | bigint | null;
type OperationalCountRow = { start: AggregateCount; preparing: AggregateCount; ready: AggregateCount; verification: AggregateCount; unconfirmed: AggregateCount; incidents: AggregateCount; attention: AggregateCount };
type AttentionCountRow = { all: AggregateCount; verification: AggregateCount; unconfirmed: AggregateCount; incidents: AggregateCount; today: AggregateCount; previous: AggregateCount };
function asCount(value: AggregateCount) {
  const count = Number(value ?? 0);
  if (!Number.isSafeInteger(count)) throw new AppError("COUNT_OVERFLOW", "El conteo excede el rango seguro.", 500);
  return count;
}

function operationalCountsD1() {
  return queryD1Raw<OperationalCountRow[]>`
    SELECT
      COALESCE(SUM(CASE WHEN "status" = 'CONFIRMED' AND "verificationStatus" = 'VERIFIED' AND "paymentStatus" IN ('NOT_REQUIRED', 'CONFIRMED') THEN 1 ELSE 0 END), 0) AS "start",
      COALESCE(SUM(CASE WHEN "status" = 'IN_PREPARATION' AND "verificationStatus" = 'VERIFIED' AND "paymentStatus" IN ('NOT_REQUIRED', 'CONFIRMED') THEN 1 ELSE 0 END), 0) AS "preparing",
      COALESCE(SUM(CASE WHEN "status" = 'READY' AND "verificationStatus" = 'VERIFIED' AND "paymentStatus" IN ('NOT_REQUIRED', 'CONFIRMED') THEN 1 ELSE 0 END), 0) AS "ready",
      COALESCE(SUM(CASE WHEN "verificationStatus" = 'PENDING' THEN 1 ELSE 0 END), 0) AS "verification",
      COALESCE(SUM(CASE WHEN "status" = 'RECEIVED' THEN 1 ELSE 0 END), 0) AS "unconfirmed",
      COALESCE(SUM(CASE WHEN "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED' THEN 1 ELSE 0 END), 0) AS "incidents",
      COALESCE(SUM(CASE WHEN "verificationStatus" = 'PENDING' OR "status" = 'RECEIVED' OR "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED' THEN 1 ELSE 0 END), 0) AS "attention"
    FROM "Order"
  `;
}

function attentionCountsD1(kind: AttentionKind, start: Date, nextStart: Date) {
  // kind is a validated enum value and is bound as data by Prisma. The CASE
  // preserves the existing union semantics without interpolating SQL text.
  return queryD1Raw<AttentionCountRow[]>`
    SELECT
      COALESCE(SUM(CASE WHEN "verificationStatus" = 'PENDING' OR "status" = 'RECEIVED' OR "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED' THEN 1 ELSE 0 END), 0) AS "all",
      COALESCE(SUM(CASE WHEN "verificationStatus" = 'PENDING' THEN 1 ELSE 0 END), 0) AS "verification",
      COALESCE(SUM(CASE WHEN "status" = 'RECEIVED' THEN 1 ELSE 0 END), 0) AS "unconfirmed",
      COALESCE(SUM(CASE WHEN "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED' THEN 1 ELSE 0 END), 0) AS "incidents",
      COALESCE(SUM(CASE WHEN "createdAt" >= ${start} AND "createdAt" < ${nextStart} AND
        CASE ${kind}
          WHEN 'verification' THEN "verificationStatus" = 'PENDING'
          WHEN 'unconfirmed' THEN "status" = 'RECEIVED'
          WHEN 'incidents' THEN "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED'
          ELSE "verificationStatus" = 'PENDING' OR "status" = 'RECEIVED' OR "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED'
        END THEN 1 ELSE 0 END), 0) AS "today",
      COALESCE(SUM(CASE WHEN "createdAt" < ${start} AND
        CASE ${kind}
          WHEN 'verification' THEN "verificationStatus" = 'PENDING'
          WHEN 'unconfirmed' THEN "status" = 'RECEIVED'
          WHEN 'incidents' THEN "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED'
          ELSE "verificationStatus" = 'PENDING' OR "status" = 'RECEIVED' OR "refundStatus" = 'REQUIRED' OR "paymentStatus" = 'REJECTED'
        END THEN 1 ELSE 0 END), 0) AS "previous"
    FROM "Order"
  `;
}

// Match toPublicTrackingStage precedence, including cancelled orders awaiting a refund.
const activeCustomerOrder = {
  OR: [
    { refundStatus: "REQUIRED" as const },
    { refundStatus: { not: "REFUNDED" as const }, verificationStatus: { not: "EXPIRED" as const }, status: { notIn: ["DELIVERED" as const, "CANCELLED" as const] } },
  ],
};
export const orderRepository = {
  async listForCustomer(customerId: string, cursor: CustomerOrderCursor | null, take = 10, view: CustomerOrderView = "all") {
    const rows = await db.order.findMany({
      where: {
        customerId,
        ...(view === "all" ? {} : { AND: [view === "active" ? activeCustomerOrder : { NOT: activeCustomerOrder }] }),
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

  async findCustomerTrackingOrder(customerId: string, id: string) {
    return db.order.findFirst({ where: { id, customerId }, include: { lines: true, events: { orderBy: { sequence: "asc" } } } });
  },

  async findCustomerPaymentToken(customerId: string, id: string) {
    const order = await db.order.findFirst({ where: { id, customerId }, select: { publicTrackingToken: true } });
    return order?.publicTrackingToken ?? null;
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
        ...(query ? { OR: [{ customerName: { contains: query, ...(!isD1Runtime ? { mode: "insensitive" as const } : {}) } }, { customerPhone: { contains: query, ...(!isD1Runtime ? { mode: "insensitive" as const } : {}) } }, ...(orderNumber ? [{ orderNumber }] : [])] } : {}),
      },
      include: { lines: true, createdBy: { select: { email: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
  },
  async operationalCounts() {
    if (isD1Runtime) {
      const [row] = await operationalCountsD1();
      return {
        start: asCount(row?.start ?? 0), preparing: asCount(row?.preparing ?? 0), ready: asCount(row?.ready ?? 0),
        verification: asCount(row?.verification ?? 0), unconfirmed: asCount(row?.unconfirmed ?? 0),
        incidents: asCount(row?.incidents ?? 0), attention: asCount(row?.attention ?? 0),
      };
    }
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
  async listAttention(kind: AttentionKind, bucket: AttentionBucket, cursor: AdminOrderCursor | null, take = 30, now = new Date()) {
    const start = businessDayStart(now);
    const nextStart = new Date(start.getTime() + 86_400_000);
    const bucketWhere = bucket === "today" ? { createdAt: { gte: start, lt: nextStart } } : { createdAt: { lt: start } };
    const rows = await db.order.findMany({ where: { ...attentionWhere(kind), ...bucketWhere, ...cursorWhere(cursor, "desc") }, select: attentionOrderSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1 });
    const hasMore = rows.length > take;
    const orders = hasMore ? rows.slice(0, take) : rows;
    const last = orders.at(-1);
    return { orders, hasMore, nextCursor: hasMore && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null };
  },
  async attentionCounts(kind: AttentionKind = "all", now = new Date()) {
    const start = businessDayStart(now);
    const nextStart = new Date(start.getTime() + 86_400_000);
    if (isD1Runtime) {
      const [row] = await attentionCountsD1(kind, start, nextStart);
      return {
        all: asCount(row?.all ?? 0), verification: asCount(row?.verification ?? 0),
        unconfirmed: asCount(row?.unconfirmed ?? 0), incidents: asCount(row?.incidents ?? 0),
        buckets: { today: asCount(row?.today ?? 0), previous: asCount(row?.previous ?? 0) },
      };
    }
    const [all, verification, unconfirmed, incidents] = await Promise.all([
      db.order.count({ where: { OR: [{ verificationStatus: "PENDING" }, { status: "RECEIVED" }, { refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }),
      db.order.count({ where: { verificationStatus: "PENDING" } }),
      db.order.count({ where: { status: "RECEIVED" } }),
      db.order.count({ where: { OR: [{ refundStatus: "REQUIRED" }, { paymentStatus: "REJECTED" }] } }),
    ]);
    const condition = attentionWhere(kind);
    const [today, previous] = await Promise.all([
      db.order.count({ where: { ...condition, createdAt: { gte: start, lt: nextStart } } }),
      db.order.count({ where: { ...condition, createdAt: { lt: start } } }),
    ]);
    return { all, verification, unconfirmed, incidents, buckets: { today, previous } };
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
  async findForLiveEvent(id: string) {
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        fulfillment: true,
        verificationStatus: true,
        paymentStatus: true,
        refundStatus: true,
        source: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        createdAt: true,
        lines: true,
      },
    });
    if (!order) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    return order;
  },
};
