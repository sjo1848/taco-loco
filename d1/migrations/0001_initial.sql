CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "lastLoginAt" DATETIME
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "active" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "ModifierGroup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceAmount" INTEGER NOT NULL,
  "imageKey" TEXT,
  "imageAlt" TEXT,
  "available" INTEGER NOT NULL DEFAULT 1,
  "published" INTEGER NOT NULL DEFAULT 1,
  "featured" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ModifierOption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProductModifierGroup" (
  "productId" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL,
  "required" INTEGER NOT NULL DEFAULT 0,
  "minSelections" INTEGER,
  "maxSelections" INTEGER,
  PRIMARY KEY ("productId", "modifierGroupId"),
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderNumber" INTEGER NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "fulfillment" TEXT NOT NULL DEFAULT 'PICKUP',
  "source" TEXT NOT NULL DEFAULT 'WHATSAPP',
  "customerName" TEXT,
  "customerPhone" TEXT,
  "tableLabel" TEXT,
  "notes" TEXT,
  "subtotalAmount" INTEGER NOT NULL,
  "adjustmentAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL,
  "cancellationReason" TEXT,
  "confirmedAt" DATETIME,
  "closedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "clientReference" TEXT UNIQUE,
  "createdById" TEXT,
  "updatedById" TEXT,
  FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "OrderLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "unitPriceAmount" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "modifiersSnapshot" JSONB,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sequence" INTEGER NOT NULL UNIQUE,
  "orderId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MenuSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "businessName" TEXT NOT NULL,
  "whatsappPhone" TEXT NOT NULL,
  "whatsappMessage" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "acceptingOrders" INTEGER NOT NULL DEFAULT 1,
  "statusMessage" TEXT,
  "weeklySchedule" JSONB,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Category_active_sortOrder_idx" ON "Category"("active", "sortOrder");
CREATE INDEX "Product_categoryId_published_sortOrder_idx" ON "Product"("categoryId", "published", "sortOrder");
CREATE INDEX "Product_featured_published_idx" ON "Product"("featured", "published");
CREATE INDEX "ModifierOption_groupId_active_sortOrder_idx" ON "ModifierOption"("groupId", "active", "sortOrder");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
