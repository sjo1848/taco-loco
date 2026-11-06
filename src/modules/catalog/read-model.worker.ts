import { env } from "cloudflare:workers";
import { buildMenuReadModel, type MenuReadModel } from "./read-model";

type SettingsRow = {
  businessName: string; whatsappPhone: string; whatsappMessage: string; currency: string;
  acceptingOrders: number; statusMessage: string | null; weeklySchedule: string | null;
  deliveryEnabled: number; deliveryFeeAmount: number;
};

type CatalogRow = {
  categoryId: string; categoryName: string; categorySlug: string;
  productId: string; productName: string; description: string | null; priceAmount: number;
  available: number; featured: number; imageKey: string | null; imageAlt: string | null;
  groupId: string | null; groupName: string | null; required: number | null;
  minSelections: number | null; maxSelections: number | null; optionName: string | null;
};

// The public menu is read-only. A single flat D1 query avoids loading Prisma's
// WASM query compiler for every dynamic page render on the Worker CPU budget.
export async function getWorkerPublicMenu(): Promise<MenuReadModel> {
  const [settings, catalog] = await Promise.all([
    env.DB.prepare('SELECT "businessName", "whatsappPhone", "whatsappMessage", "currency", "acceptingOrders", "statusMessage", "weeklySchedule", "deliveryEnabled", "deliveryFeeAmount" FROM "MenuSettings" LIMIT 1').first<SettingsRow>(),
    env.DB.prepare(`SELECT c."id" AS categoryId, c."name" AS categoryName, c."slug" AS categorySlug,
      p."id" AS productId, p."name" AS productName, p."description", p."priceAmount",
      p."available", p."featured", p."imageKey", p."imageAlt",
      g."id" AS groupId, g."name" AS groupName, pm."required", pm."minSelections", pm."maxSelections",
      o."name" AS optionName
      FROM "Category" c
      JOIN "Product" p ON p."categoryId" = c."id" AND p."published" = 1 AND p."archivedAt" IS NULL
      LEFT JOIN "ProductModifierGroup" pm ON pm."productId" = p."id"
      LEFT JOIN "ModifierGroup" g ON g."id" = pm."modifierGroupId"
      LEFT JOIN "ModifierOption" o ON o."groupId" = g."id" AND o."active" = 1
      WHERE c."active" = 1 AND c."archivedAt" IS NULL
      ORDER BY c."sortOrder", c."name", p."sortOrder", p."name", g."sortOrder", o."sortOrder", o."name"`).all<CatalogRow>(),
  ]);
  if (!settings) throw new Error("MenuSettings is not configured");

  const categories = new Map<string, {
    id: string; name: string; slug: string;
    products: Array<{
      id: string; name: string; description: string | null; priceAmount: number;
      available: boolean; featured: boolean; imageKey: string | null; imageAlt: string | null;
      modifierGroups: Array<{
        required: boolean; minSelections: number | null; maxSelections: number | null;
        modifierGroup: { name: string; options: Array<{ name: string }> };
      }>;
    }>;
  }>();
  const products = new Map<string, (typeof categories extends Map<string, infer C> ? C : never)["products"][number]>();
  const groups = new Map<string, (typeof products extends Map<string, infer P> ? P : never)["modifierGroups"][number]>();
  for (const row of catalog.results) {
    let category = categories.get(row.categoryId);
    if (!category) {
      category = { id: row.categoryId, name: row.categoryName, slug: row.categorySlug, products: [] };
      categories.set(row.categoryId, category);
    }
    let product = products.get(row.productId);
    if (!product) {
      product = { id: row.productId, name: row.productName, description: row.description,
        priceAmount: row.priceAmount, available: Boolean(row.available), featured: Boolean(row.featured),
        imageKey: row.imageKey, imageAlt: row.imageAlt, modifierGroups: [] };
      products.set(row.productId, product);
      category.products.push(product);
    }
    if (row.groupId && row.groupName) {
      const key = `${row.productId}:${row.groupId}`;
      let group = groups.get(key);
      if (!group) {
        group = { required: Boolean(row.required), minSelections: row.minSelections, maxSelections: row.maxSelections,
          modifierGroup: { name: row.groupName, options: [] } };
        groups.set(key, group);
        product.modifierGroups.push(group);
      }
      if (row.optionName) group.modifierGroup.options.push({ name: row.optionName });
    }
  }
  return buildMenuReadModel({
    settings: { ...settings, acceptingOrders: Boolean(settings.acceptingOrders),
      deliveryEnabled: Boolean(settings.deliveryEnabled), weeklySchedule: typeof settings.weeklySchedule === "string" ? JSON.parse(settings.weeklySchedule) : settings.weeklySchedule },
    categories: [...categories.values()],
  });
}
