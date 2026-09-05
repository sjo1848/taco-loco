import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import { assertValidTransition, orderFulfillmentSchema, orderStatusSchema, type OrderStatus } from "@/modules/orders/model";
import { z } from "zod";
import { publishOrderEvent } from "@/modules/orders/live-events";

export const transitionOrderInputSchema = z.object({
  orderId: z.uuid(),
  toStatus: orderStatusSchema,
  reason: z.string().trim().max(500).nullable().optional(),
}).superRefine((input, context) => {
  if (input.toStatus === "CANCELLED" && !input.reason) context.addIssue({ code: "custom", path: ["reason"], message: "El motivo de cancelación es obligatorio." });
});

export type TransitionOrderInput = z.infer<typeof transitionOrderInputSchema>;

const databaseUuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "UUID inválido");
const manualModifierSchema = z.object({ group: z.string().trim().min(1).max(120), option: z.string().trim().min(1).max(120) });
const manualOrderLineSchema = z.object({
  productId: databaseUuidSchema,
  quantity: z.number().int().min(1).max(20),
  modifiers: z.array(manualModifierSchema).max(20).default([]),
  note: z.string().trim().max(500).nullable().optional(),
});

const publicOrderIntentLineSchema = manualOrderLineSchema.omit({ note: true });
export const createPublicOrderIntentInputSchema = z.object({
  clientReference: z.string().trim().min(16).max(100),
  lines: z.array(publicOrderIntentLineSchema).min(1).max(100),
});

export const createManualOrderInputSchema = z.object({
  fulfillment: orderFulfillmentSchema.default("PICKUP"),
  customerName: z.string().trim().max(160).nullable().optional(),
  customerPhone: z.string().trim().max(32).nullable().optional(),
  tableLabel: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  adjustmentAmount: z.number().int().min(-100000000).max(100000000).default(0),
  lines: z.array(manualOrderLineSchema).min(1).max(100),
});

export type CreateManualOrderInput = z.infer<typeof createManualOrderInputSchema>;

export function transitionOrderData(toStatus: OrderStatus, reason: string | null | undefined, now = new Date()) {
  return {
    status: toStatus,
    confirmedAt: toStatus === "CONFIRMED" ? now : undefined,
    closedAt: ["DELIVERED", "CANCELLED"].includes(toStatus) ? now : undefined,
    cancellationReason: toStatus === "CANCELLED" ? reason : undefined,
  };
}

type ManualProduct = { id: string; name: string; priceAmount: number; modifierGroups: Array<{ required: boolean; minSelections: number | null; maxSelections: number | null; modifierGroup: { name: string; options: Array<{ name: string; active: boolean }> } }> };

function resolveModifiers(product: ManualProduct, modifiers: CreateManualOrderInput["lines"][number]["modifiers"]) {
  const groups = new Map(product.modifierGroups.map((relation) => [relation.modifierGroup.name, relation]));
  const grouped = new Map<string, string[]>();
  for (const modifier of modifiers) {
    const relation = groups.get(modifier.group);
    if (!relation) throw new AppError("INVALID_MODIFIER", `El modificador ${modifier.group} no está disponible para este producto.`, 400);
    const option = relation.modifierGroup.options.find((item) => item.active && item.name === modifier.option);
    if (!option) throw new AppError("INVALID_MODIFIER", `La opción ${modifier.option} no está disponible para ${modifier.group}.`, 400);
    grouped.set(modifier.group, [...(grouped.get(modifier.group) ?? []), option.name]);
  }
  for (const relation of product.modifierGroups) {
    const count = grouped.get(relation.modifierGroup.name)?.length ?? 0;
    if (relation.required && count < (relation.minSelections ?? 1)) throw new AppError("MISSING_MODIFIER", `Falta completar ${relation.modifierGroup.name}.`, 400);
    if (relation.maxSelections !== null && count > relation.maxSelections) throw new AppError("TOO_MANY_MODIFIERS", `Se seleccionaron demasiadas opciones en ${relation.modifierGroup.name}.`, 400);
  }
  return modifiers.map((modifier) => ({ group: modifier.group, option: grouped.get(modifier.group)?.shift() ?? modifier.option }));
}

export async function createManualOrder(input: unknown, actorId: string | null, clientReference: string | null = null, reason = "Pedido registrado manualmente", source: "WHATSAPP" | "PUBLIC_MENU" = "WHATSAPP") {
  const parsed = createManualOrderInputSchema.parse(input);
  return db.$transaction(async (tx: { product: typeof db.product; order: typeof db.order; orderEvent: typeof db.orderEvent; $executeRaw: typeof db.$executeRaw }) => {
    const productIds = [...new Set(parsed.lines.map((line) => line.productId))];
    const products = await tx.product.findMany({ where: { id: { in: productIds }, archivedAt: null, published: true, available: true }, include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } } }) as ManualProduct[];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const resolvedLines = parsed.lines.map((line) => {
      const product = productsById.get(line.productId);
      if (!product) throw new AppError("PRODUCT_NOT_AVAILABLE", "Uno de los productos ya no está disponible.", 400);
      return { productId: product.id, productName: product.name, unitPriceAmount: product.priceAmount, quantity: line.quantity, modifiersSnapshot: resolveModifiers(product, line.modifiers), note: line.note ?? null };
    });
    const subtotalAmount = resolvedLines.reduce((total, line) => total + line.unitPriceAmount * line.quantity, 0);
    const totalAmount = subtotalAmount + parsed.adjustmentAmount;
    if (totalAmount < 0) throw new AppError("INVALID_ORDER_TOTAL", "El total del pedido no puede ser negativo.", 400);
    const order = await tx.order.create({
      data: {
        source,
        fulfillment: parsed.fulfillment,
        customerName: parsed.customerName ?? null,
        customerPhone: parsed.customerPhone ?? null,
        tableLabel: parsed.tableLabel ?? null,
        notes: parsed.notes ?? null,
        subtotalAmount,
        adjustmentAmount: parsed.adjustmentAmount,
        totalAmount,
        clientReference,
        createdById: actorId,
        lines: { create: resolvedLines },
      },
      include: { lines: true },
    });
    const event = await tx.orderEvent.create({ data: { orderId: order.id, toStatus: "RECEIVED", actorId, reason } });
    await publishOrderEvent(tx, event);
    return { order, event };
  });
}

export async function createPublicOrderIntent(input: unknown) {
  const parsed = createPublicOrderIntentInputSchema.parse(input);
  const existing = await db.order.findUnique({ where: { clientReference: parsed.clientReference }, include: { lines: true } });
  if (existing) return { order: existing, event: null, reused: true };
  try {
    return await createManualOrder({ fulfillment: "PICKUP", customerName: null, customerPhone: null, tableLabel: null, notes: "Intención registrada desde el menú. Confirmar recepción por WhatsApp.", adjustmentAmount: 0, lines: parsed.lines }, null, parsed.clientReference, "Intención preparada desde el menú público", "PUBLIC_MENU");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const concurrent = await db.order.findUniqueOrThrow({ where: { clientReference: parsed.clientReference }, include: { lines: true } });
      return { order: concurrent, event: null, reused: true };
    }
    throw error;
  }
}

export async function transitionOrder(input: unknown, actorId: string) {
  const parsed = transitionOrderInputSchema.parse(input);
  return db.$transaction(async (tx: { order: typeof db.order; orderEvent: typeof db.orderEvent; $executeRaw: typeof db.$executeRaw }) => {
    const current = await tx.order.findUnique({ where: { id: parsed.orderId } });
    if (!current) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);

    try {
      assertValidTransition(current.status, parsed.toStatus);
    } catch {
      throw new AppError("INVALID_ORDER_TRANSITION", "El pedido no puede pasar a ese estado.", 409);
    }

    const result = await tx.order.updateMany({
      where: { id: parsed.orderId, status: current.status },
      data: { ...transitionOrderData(parsed.toStatus, parsed.reason), updatedById: actorId },
    });
    if (result.count !== 1) throw new AppError("ORDER_CHANGED", "El pedido cambió mientras lo actualizabas. Recargá e intentá de nuevo.", 409);

    const event = await tx.orderEvent.create({ data: { orderId: parsed.orderId, fromStatus: current.status, toStatus: parsed.toStatus, reason: parsed.reason ?? null, actorId } });
    await publishOrderEvent(tx, event);
    const order = await tx.order.findUniqueOrThrow({ where: { id: parsed.orderId }, include: { lines: true, events: { orderBy: { createdAt: "asc" } } } });
    return { order, event };
  });
}
