ALTER TABLE "Order" ADD COLUMN "publicTrackingToken" TEXT;
ALTER TABLE "OrderEvent" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'STATUS_TRANSITION';
CREATE UNIQUE INDEX "Order_publicTrackingToken_key" ON "Order"("publicTrackingToken");
