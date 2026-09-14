ALTER TABLE "Order" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE "Order" ADD COLUMN "verificationResolvedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Order" ADD COLUMN "paymentReportedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "paymentConfirmedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "refundStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Order" ADD COLUMN "refundRequiredAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "refundedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "noShowAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryReference" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryFeeAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "transferHolderName" TEXT;

ALTER TABLE "MenuSettings" ADD COLUMN "deliveryEnabled" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuSettings" ADD COLUMN "deliveryFeeAmount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Order_verificationStatus_createdAt_idx" ON "Order"("verificationStatus", "createdAt");
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE INDEX "Order_fulfillment_status_createdAt_idx" ON "Order"("fulfillment", "status", "createdAt");
