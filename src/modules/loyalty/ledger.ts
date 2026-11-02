import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type LoyaltyOrderState = { customerId: string | null; status: string; refundStatus: string; paymentStatus: string };
export function isEligibleCompletedOrder(order: LoyaltyOrderState, customerId: string) {
  return Boolean(order.customerId === customerId && order.status === "DELIVERED" && order.paymentStatus !== "REJECTED" && order.refundStatus === "NOT_REQUIRED");
}

export async function recordLoyaltyLedgerEntry(input: { customerId: string; orderId: string; units: number; idempotencyKey: string; kind: "AWARD" | "REVERSAL" }) {
  if (input.units === 0 || !Number.isSafeInteger(input.units)) throw new AppError("INVALID_LOYALTY_UNITS", "La cantidad de unidades no es válida.", 400);
  throw new AppError("LOYALTY_DISABLED", "Las recompensas todavía no están activadas.", 409);
}

export async function findLedgerByIdempotencyKey(idempotencyKey: string) {
  return db.loyaltyTransaction.findUnique({ where: { idempotencyKey } });
}
