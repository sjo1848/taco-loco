ALTER TABLE "Order" ADD COLUMN "clientReference" TEXT;
ALTER TABLE "Order" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "OrderEvent" ALTER COLUMN "actorId" DROP NOT NULL;
CREATE UNIQUE INDEX "Order_clientReference_key" ON "Order"("clientReference");
