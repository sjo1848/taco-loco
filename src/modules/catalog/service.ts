import { AppError } from "@/lib/errors";
import { categoryInputSchema, productInputSchema } from "@/modules/catalog/schemas";
import { categoryRepository, productRepository } from "@/modules/catalog/repository";

export const catalogService = {
  listCategories: () => categoryRepository.list(),
  createCategory(input: unknown) {
    return categoryRepository.create(categoryInputSchema.parse(input));
  },
  updateCategory(id: string, input: unknown) {
    if (!id) throw new AppError("INVALID_CATEGORY", "Categoría inválida", 400);
    return categoryRepository.update(id, categoryInputSchema.partial().parse(input));
  },
  archiveCategory(id: string) { return categoryRepository.archive(id); },
  restoreCategory(id: string) { return categoryRepository.restore(id); },
  listProducts: () => productRepository.list(),
  createProduct(input: unknown) {
    return productRepository.create(productInputSchema.parse(input));
  },
  updateProduct(id: string, input: unknown) {
    if (!id) throw new AppError("INVALID_PRODUCT", "Producto inválido", 400);
    return productRepository.update(id, productInputSchema.partial().parse(input));
  },
  updateAvailability(id: string, available: boolean) { return productRepository.updateAvailability(id, available); },
  archiveProduct(id: string) { return productRepository.archive(id); },
  restoreProduct(id: string) { return productRepository.restore(id); },
};
