ALTER TABLE "MenuSettings" ADD COLUMN "acceptingOrders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MenuSettings" ADD COLUMN "statusMessage" TEXT;
ALTER TABLE "MenuSettings" ADD COLUMN "weeklySchedule" JSONB;
