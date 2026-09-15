ALTER TYPE "OrderFulfillment" ADD VALUE IF NOT EXISTS 'DELIVERY';

CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED');
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REPORTED', 'CONFIRMED', 'REJECTED');
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'REFUNDED');

ALTER TABLE "Order"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN "verificationResolvedAt" TIMESTAMP(3),
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "paymentReportedAt" TIMESTAMP(3),
  ADD COLUMN "paymentConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "refundRequiredAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "noShowAt" TIMESTAMP(3),
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "deliveryReference" TEXT,
  ADD COLUMN "deliveryFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "transferHolderName" TEXT;

ALTER TABLE "MenuSettings"
  ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deliveryFeeAmount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Order_verificationStatus_createdAt_idx" ON "Order"("verificationStatus", "createdAt");
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE INDEX "Order_fulfillment_status_createdAt_idx" ON "Order"("fulfillment", "status", "createdAt");
