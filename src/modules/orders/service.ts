import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import { assertValidTransition, orderFulfillmentSchema, orderStatusSchema, type OrderStatus } from "@/modules/orders/model";
import { z } from "zod";
import { publishOrderEvent } from "@/modules/orders/live-events";
import { isD1Runtime } from "@/lib/runtime";

export const transitionOrderInputSchema = z.object({
  orderId: z.uuid(),
  toStatus: orderStatusSchema,
  reason: z.string().trim().max(500).nullable().optional(),
  confirmPayment: z.boolean().optional().default(false),
}).superRefine((input, context) => {
  if (input.toStatus === "CANCELLED" && !input.reason) context.addIssue({ code: "custom", path: ["reason"], message: "El motivo de cancelación es obligatorio." });
});

export type TransitionOrderInput = z.infer<typeof transitionOrderInputSchema>;
export const orderWorkflowActionSchema = z.object({ orderId: z.uuid(), action: z.enum(["EXPIRE_PENDING", "MARK_NO_SHOW", "REQUIRE_REFUND", "MARK_REFUNDED"]) });
export type OrderWorkflowActionInput = z.infer<typeof orderWorkflowActionSchema>;

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
  fulfillment: orderFulfillmentSchema.extract(["PICKUP", "DELIVERY"]).default("PICKUP"),
  deliveryAddress: z.string().trim().max(500).nullable().optional(),
  deliveryReference: z.string().trim().max(200).nullable().optional(),
  transferHolderName: z.string().trim().max(160).nullable().optional(),
  lines: z.array(publicOrderIntentLineSchema).min(1).max(100),
}).superRefine((input, context) => {
  if (input.fulfillment !== "DELIVERY") return;
  if (!input.deliveryAddress) context.addIssue({ code: "custom", path: ["deliveryAddress"], message: "La dirección de delivery es obligatoria." });
  if (!input.transferHolderName) context.addIssue({ code: "custom", path: ["transferHolderName"], message: "El titular de la transferencia es obligatorio." });
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

type OrderWorkflow = {
  verificationStatus: "PENDING" | "VERIFIED";
  paymentStatus: "NOT_REQUIRED" | "PENDING";
  deliveryAddress: string | null;
  deliveryReference: string | null;
  deliveryFeeAmount: number;
  transferHolderName: string | null;
};

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

export async function createManualOrder(input: unknown, actorId: string | null, clientReference: string | null = null, reason = "Pedido registrado manualmente", source: "WHATSAPP" | "PUBLIC_MENU" = "WHATSAPP", workflow: OrderWorkflow = { verificationStatus: "VERIFIED", paymentStatus: "NOT_REQUIRED", deliveryAddress: null, deliveryReference: null, deliveryFeeAmount: 0, transferHolderName: null }) {
  const parsed = createManualOrderInputSchema.parse(input);
  const productIds = [...new Set(parsed.lines.map((line) => line.productId))];
  const products = await db.product.findMany({ where: { id: { in: productIds }, archivedAt: null, published: true, available: true }, include: { modifierGroups: { include: { modifierGroup: { include: { options: true } } } } } }) as ManualProduct[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const resolvedLines = parsed.lines.map((line) => {
    const product = productsById.get(line.productId);
    if (!product) throw new AppError("PRODUCT_NOT_AVAILABLE", "Uno de los productos ya no está disponible.", 400);
    return { productId: product.id, productName: product.name, unitPriceAmount: product.priceAmount, quantity: line.quantity, modifiersSnapshot: resolveModifiers(product, line.modifiers), note: line.note ?? null };
  });
  const subtotalAmount = resolvedLines.reduce((total, line) => total + line.unitPriceAmount * line.quantity, 0);
  const totalAmount = subtotalAmount + parsed.adjustmentAmount;
  if (totalAmount < 0) throw new AppError("INVALID_ORDER_TOTAL", "El total del pedido no puede ser negativo.", 400);
  if (isD1Runtime) {
    const { createD1Order } = await import("@/modules/orders/d1-atomic.worker");
    const id = crypto.randomUUID();
    await createD1Order({ id, source, fulfillment: parsed.fulfillment, verificationStatus: workflow.verificationStatus, paymentStatus: workflow.paymentStatus, deliveryAddress: workflow.deliveryAddress, deliveryReference: workflow.deliveryReference, deliveryFeeAmount: workflow.deliveryFeeAmount, transferHolderName: workflow.transferHolderName, customerName: parsed.customerName ?? null, customerPhone: parsed.customerPhone ?? null, tableLabel: parsed.tableLabel ?? null, notes: parsed.notes ?? null, subtotalAmount, adjustmentAmount: parsed.adjustmentAmount, totalAmount, clientReference, createdById: actorId, reason, lines: resolvedLines.map((line) => ({ ...line, id: crypto.randomUUID() })) });
    const order = await db.order.findUniqueOrThrow({ where: { id }, include: { lines: true } });
    const event = await db.orderEvent.findFirstOrThrow({ where: { orderId: id }, orderBy: { sequence: "desc" } });
    return { order, event };
  }
  return db.$transaction(async (tx: { product: typeof db.product; order: typeof db.order; orderEvent: typeof db.orderEvent; $executeRaw: typeof db.$executeRaw }) => {
    const order = await tx.order.create({
      data: {
        source,
        fulfillment: parsed.fulfillment,
        verificationStatus: workflow.verificationStatus,
        paymentStatus: workflow.paymentStatus,
        deliveryAddress: workflow.deliveryAddress,
        deliveryReference: workflow.deliveryReference,
        deliveryFeeAmount: workflow.deliveryFeeAmount,
        transferHolderName: workflow.transferHolderName,
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
  const settings = await db.menuSettings.findFirstOrThrow();
  if (parsed.fulfillment === "DELIVERY" && !settings.deliveryEnabled) throw new AppError("DELIVERY_UNAVAILABLE", "El delivery no está disponible en este momento.", 400);
  const deliveryFeeAmount = parsed.fulfillment === "DELIVERY" ? settings.deliveryFeeAmount : 0;
  try {
    return await createManualOrder({ fulfillment: parsed.fulfillment, customerName: null, customerPhone: null, tableLabel: null, notes: "Intención registrada desde el menú. Confirmar recepción por WhatsApp.", adjustmentAmount: deliveryFeeAmount, lines: parsed.lines }, null, parsed.clientReference, "Intención preparada desde el menú público", "PUBLIC_MENU", { verificationStatus: "PENDING", paymentStatus: parsed.fulfillment === "DELIVERY" ? "PENDING" : "NOT_REQUIRED", deliveryAddress: parsed.deliveryAddress ?? null, deliveryReference: parsed.deliveryReference ?? null, deliveryFeeAmount, transferHolderName: parsed.transferHolderName ?? null });
  } catch (error) {
    const isClientReferenceConflict = error && typeof error === "object" && (("code" in error && error.code === "P2002") || ("message" in error && typeof error.message === "string" && error.message.includes("Order.clientReference")));
    if (isClientReferenceConflict) {
      const concurrent = await db.order.findUniqueOrThrow({ where: { clientReference: parsed.clientReference }, include: { lines: true } });
      return { order: concurrent, event: null, reused: true };
    }
    throw error;
  }
}

export async function transitionOrder(input: unknown, actorId: string) {
  const parsed = transitionOrderInputSchema.parse(input);
  const current = await db.order.findUnique({ where: { id: parsed.orderId } });
    if (!current) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);

    try {
      assertValidTransition(current.status, parsed.toStatus);
  } catch {
      throw new AppError("INVALID_ORDER_TRANSITION", "El pedido no puede pasar a ese estado.", 409);
    }

  const confirming = parsed.toStatus === "CONFIRMED";
  const isDelivery = current.fulfillment === "DELIVERY";
  if (confirming && isDelivery && current.paymentStatus !== "CONFIRMED" && !parsed.confirmPayment) throw new AppError("PAYMENT_REQUIRED", "Confirmá el pago antes de confirmar este delivery.", 409);
  const transitionNow = new Date();
  const verificationStatus = confirming ? "VERIFIED" : null;
  const verificationResolvedAt = confirming ? transitionNow.toISOString() : null;
  const paymentStatus = confirming && isDelivery && parsed.confirmPayment ? "CONFIRMED" : null;
  const paymentConfirmedAt = paymentStatus ? transitionNow.toISOString() : null;

  if (isD1Runtime) {
    const { transitionD1Order } = await import("@/modules/orders/d1-atomic.worker");
    const data = transitionOrderData(parsed.toStatus, parsed.reason);
    try {
      await transitionD1Order({ orderId: parsed.orderId, fromStatus: current.status, toStatus: parsed.toStatus, reason: parsed.reason ?? null, actorId, cancellationReason: data.cancellationReason ?? null, confirmedAt: data.confirmedAt?.toISOString() ?? null, closedAt: data.closedAt?.toISOString() ?? null, verificationStatus, verificationResolvedAt, paymentStatus, paymentConfirmedAt });
    } catch (error) {
      if (error instanceof Error && (["D1_ORDER_CHANGED", "D1_BATCH_FAILED"].includes(error.message) || /OrderEvent\.sequence|SQLITE_BUSY|database is locked/i.test(error.message))) throw new AppError("ORDER_CHANGED", "El pedido cambió mientras lo actualizabas. Recargá e intentá de nuevo.", 409);
      throw error;
    }
    const order = await db.order.findUniqueOrThrow({ where: { id: parsed.orderId }, include: { lines: true, events: { orderBy: { createdAt: "asc" } } } });
    const event = await db.orderEvent.findFirstOrThrow({ where: { orderId: parsed.orderId }, orderBy: { sequence: "desc" } });
    return { order, event };
  }
  return db.$transaction(async (tx: { order: typeof db.order; orderEvent: typeof db.orderEvent; $executeRaw: typeof db.$executeRaw }) => {
    const txCurrent = await tx.order.findUnique({ where: { id: parsed.orderId } });
    if (!txCurrent) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
    const result = await tx.order.updateMany({
      where: { id: parsed.orderId, status: txCurrent.status },
      data: { ...transitionOrderData(parsed.toStatus, parsed.reason), verificationStatus: verificationStatus ?? undefined, verificationResolvedAt: verificationResolvedAt ?? undefined, paymentStatus: paymentStatus ?? undefined, paymentConfirmedAt: paymentConfirmedAt ?? undefined, updatedById: actorId },
    });
    if (result.count !== 1) throw new AppError("ORDER_CHANGED", "El pedido cambió mientras lo actualizabas. Recargá e intentá de nuevo.", 409);

    const event = await tx.orderEvent.create({ data: { orderId: parsed.orderId, fromStatus: txCurrent.status, toStatus: parsed.toStatus, reason: parsed.reason ?? null, actorId } });
    await publishOrderEvent(tx, event);
    const order = await tx.order.findUniqueOrThrow({ where: { id: parsed.orderId }, include: { lines: true, events: { orderBy: { createdAt: "asc" } } } });
    return { order, event };
  });
}

export async function applyOrderWorkflowAction(input: unknown, actorId: string) {
  const parsed = orderWorkflowActionSchema.parse(input);
  const current = await db.order.findUnique({ where: { id: parsed.orderId } });
  if (!current) throw new AppError("ORDER_NOT_FOUND", "Pedido no encontrado.", 404);
  if (parsed.action === "EXPIRE_PENDING" && current.verificationStatus !== "PENDING") throw new AppError("ORDER_NOT_PENDING", "El pedido ya no está pendiente.", 409);
  if (parsed.action === "MARK_NO_SHOW" && (current.fulfillment !== "PICKUP" || !["READY", "DELIVERED"].includes(current.status) || current.noShowAt)) throw new AppError("NO_SHOW_NOT_AVAILABLE", "Este pedido no admite no-show.", 409);
  if (parsed.action === "REQUIRE_REFUND" && (current.fulfillment !== "DELIVERY" || current.paymentStatus !== "CONFIRMED" || current.status !== "CANCELLED" || current.refundStatus !== "NOT_REQUIRED")) throw new AppError("REFUND_NOT_AVAILABLE", "Este pedido no admite solicitar devolución.", 409);
  if (parsed.action === "MARK_REFUNDED" && current.refundStatus !== "REQUIRED") throw new AppError("REFUND_NOT_REQUIRED", "No hay una devolución pendiente.", 409);
  const reason = parsed.action === "EXPIRE_PENDING" ? "Cierre de jornada: intención pendiente" : parsed.action === "MARK_NO_SHOW" ? "No-show registrado" : parsed.action === "REQUIRE_REFUND" ? "Devolución manual requerida" : "Devolución manual realizada";
  const refundStatus = parsed.action === "REQUIRE_REFUND" ? "REQUIRED" : parsed.action === "MARK_REFUNDED" ? "REFUNDED" : undefined;
  if (isD1Runtime) {
    const { applyD1WorkflowAction } = await import("@/modules/orders/d1-atomic.worker");
    await applyD1WorkflowAction({ orderId: parsed.orderId, action: parsed.action, actorId, fromStatus: current.status, refundStatus, reason });
  } else {
    await db.$transaction(async (tx: { order: typeof db.order; orderEvent: typeof db.orderEvent }) => {
      const now = new Date();
      const data = parsed.action === "EXPIRE_PENDING" ? { status: "CANCELLED" as const, verificationStatus: "EXPIRED" as const, verificationResolvedAt: now, closedAt: now } : parsed.action === "MARK_NO_SHOW" ? { noShowAt: now } : { refundStatus, refundRequiredAt: parsed.action === "REQUIRE_REFUND" ? now : undefined, refundedAt: parsed.action === "MARK_REFUNDED" ? now : undefined };
      await tx.order.update({ where: { id: parsed.orderId }, data: { ...data, updatedById: actorId } });
      await tx.orderEvent.create({ data: { orderId: parsed.orderId, fromStatus: current.status, toStatus: parsed.action === "EXPIRE_PENDING" ? "CANCELLED" : current.status, actorId, reason } });
    });
  }
  return db.order.findUniqueOrThrow({ where: { id: parsed.orderId }, include: { lines: true, events: { orderBy: { createdAt: "asc" } } } });
}
