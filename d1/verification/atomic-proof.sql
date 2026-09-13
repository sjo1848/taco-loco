-- Local-only proof fixture. Run after 0001_initial.sql with Wrangler --local.
INSERT INTO "AdminUser" ("id", "email", "passwordHash", "updatedAt") VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'd1-proof@example.test', 'fixture', '2026-09-13T00:00:00.000Z');
INSERT INTO "Category" ("id", "name", "slug", "updatedAt") VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Proof', 'proof', '2026-09-13T00:00:00.000Z');
INSERT INTO "Product" ("id", "categoryId", "name", "priceAmount", "updatedAt") VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Proof Taco', 1200, '2026-09-13T00:00:00.000Z');

-- The application allocator uses the same MAX+1 shape inside one D1 batch.
INSERT INTO "Order" ("id", "orderNumber", "status", "fulfillment", "source", "subtotalAmount", "adjustmentAmount", "totalAmount", "clientReference", "createdAt", "updatedAt") VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1, 'RECEIVED', 'PICKUP', 'PUBLIC_MENU', 1200, 0, 1200, 'd1-proof-client-reference-1', '2026-09-13T00:00:00.000Z', '2026-09-13T00:00:00.000Z');
INSERT INTO "OrderLine" ("id", "orderId", "productId", "productName", "unitPriceAmount", "quantity", "modifiersSnapshot", "createdAt") VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Proof Taco', 1200, 1, '[{"group":"Salsa","option":"Roja"}]', '2026-09-13T00:00:00.000Z');
INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "toStatus", "reason", "createdAt") VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', 1, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'RECEIVED', 'fixture', '2026-09-13T00:00:00.000Z');

-- Conditional update + event append is the D1-compatible transition unit.
UPDATE "Order" SET "status" = 'CONFIRMED', "confirmedAt" = '2026-09-13T00:01:00.000Z', "updatedAt" = '2026-09-13T00:01:00.000Z' WHERE "id" = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND "status" = 'RECEIVED';
INSERT INTO "OrderEvent" ("id", "sequence", "orderId", "fromStatus", "toStatus", "reason", "createdAt") SELECT '11111111-2222-4333-8444-555555555555', COALESCE(MAX("sequence"), 0) + 1, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'RECEIVED', 'CONFIRMED', 'fixture transition', '2026-09-13T00:01:00.000Z' FROM "OrderEvent" WHERE changes() = 1;

SELECT "orderNumber", "status", "clientReference" FROM "Order" WHERE "id" = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
SELECT "sequence", "fromStatus", "toStatus" FROM "OrderEvent" WHERE "orderId" = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' ORDER BY "sequence" ASC;
SELECT json_extract("modifiersSnapshot", '$[0].option') AS "modifierOption" FROM "OrderLine" WHERE "orderId" = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
