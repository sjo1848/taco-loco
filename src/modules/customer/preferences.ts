import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const customerAddressSchema = z.object({
  label: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(500),
  reference: z.string().trim().max(200).nullable().optional(),
});

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;

export async function listCustomerPreferences(customerId: string) {
  const [addresses, favorites] = await Promise.all([
    db.customerAddress.findMany({ where: { customerId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] }),
    db.customerFavorite.findMany({ where: { customerId }, include: { product: { include: { category: true } } }, orderBy: [{ createdAt: "desc" }, { productId: "asc" }] }),
  ]);
  return {
    addresses,
    favorites: favorites.map((favorite: { product: { id: string; name: string; description: string | null; priceAmount: number; available: boolean; published: boolean; archivedAt: Date | null; imageKey: string | null; category: { name: string } } }) => { const product = favorite.product; return { id: product.id, name: product.name, description: product.description, priceAmount: product.priceAmount, available: product.available, published: product.published, archived: Boolean(product.archivedAt), imageKey: product.imageKey, category: product.category.name }; }),
  };
}

export async function createCustomerAddress(customerId: string, input: unknown) {
  const data = customerAddressSchema.parse(input);
  return db.customerAddress.create({ data: { ...data, reference: data.reference ?? null, customerId } });
}

export async function updateCustomerAddress(customerId: string, id: string, input: unknown) {
  const data = customerAddressSchema.parse(input);
  const result = await db.customerAddress.updateMany({ where: { id, customerId }, data: { ...data, reference: data.reference ?? null } });
  if (result.count !== 1) throw new AppError("ADDRESS_NOT_FOUND", "Dirección no encontrada.", 404);
  return db.customerAddress.findUniqueOrThrow({ where: { id } });
}

export async function deleteCustomerAddress(customerId: string, id: string) {
  const result = await db.customerAddress.deleteMany({ where: { id, customerId } });
  if (result.count !== 1) throw new AppError("ADDRESS_NOT_FOUND", "Dirección no encontrada.", 404);
}

export async function setCustomerFavorite(customerId: string, productId: string, favorite: boolean) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AppError("PRODUCT_NOT_FOUND", "Producto no encontrado.", 404);
  if (favorite) await db.customerFavorite.upsert({ where: { customerId_productId: { customerId, productId } }, create: { customerId, productId }, update: {} });
  else await db.customerFavorite.deleteMany({ where: { customerId, productId } });
  return { favorite };
}
