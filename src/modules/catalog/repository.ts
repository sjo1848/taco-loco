import { db } from "@/lib/db";
import type { CategoryInput, ProductInput } from "@/modules/catalog/schemas";

export const categoryRepository = {
  list: () => db.category.findMany({ where: { archivedAt: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  listAll: () => db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  findById: (id: string) => db.category.findUnique({ where: { id } }),
  create: (input: CategoryInput) => db.category.create({ data: input }),
  update: (id: string, input: Partial<CategoryInput>) => db.category.update({ where: { id }, data: input }),
  archive: (id: string) => db.category.update({ where: { id }, data: { archivedAt: new Date(), active: false } }),
  restore: (id: string) => db.category.update({ where: { id }, data: { archivedAt: null, active: true } }),
};

export const productRepository = {
  list: () => db.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { category: true } }),
  findById: (id: string) => db.product.findUnique({ where: { id }, include: { category: true, modifierGroups: true } }),
  create: (input: ProductInput) => db.product.create({ data: input }),
  update: (id: string, input: Partial<ProductInput>) => db.product.update({ where: { id }, data: input }),
  updateAvailability: (id: string, available: boolean) => db.product.update({ where: { id }, data: { available } }),
  archive: (id: string) => db.product.update({ where: { id }, data: { archivedAt: new Date(), published: false } }),
  restore: (id: string) => db.product.update({ where: { id }, data: { archivedAt: null } }),
};
