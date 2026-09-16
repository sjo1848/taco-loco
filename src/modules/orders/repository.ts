import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/modules/orders/model";

export type OrderListFilter = { status?: OrderStatus; query?: string };

function parseOrderNumber(query: string) {
  const value = query.replace(/^tl-/i, "").trim();
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export const orderRepository = {
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
  async findById(id: string) {
    const order = await db.order.findUnique({
      where: { id },
      include: { lines: true, createdBy: { select: { email: true } }, updatedBy: { select: { email: true } }, events: { include: { actor: { select: { email: true } } }, orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    return order;
  },
};
