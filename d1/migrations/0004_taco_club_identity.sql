CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT,
  "displayName" TEXT,
  "avatarUrl" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "lastLoginAt" DATETIME
);

CREATE TABLE "CustomerIdentity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSubject" TEXT NOT NULL,
  "emailAtLogin" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "customerId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" DATETIME,
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CustomerIdentity_provider_providerSubject_key" ON "CustomerIdentity"("provider", "providerSubject");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "CustomerIdentity_customerId_idx" ON "CustomerIdentity"("customerId");
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
