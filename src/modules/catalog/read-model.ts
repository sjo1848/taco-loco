import { db } from "@/lib/db";
import { normalizeWhatsAppUrl, type PublicSettings } from "@/modules/settings/service";
import { getOperatingContext } from "@/modules/settings/operating-context";

export type MenuReadModel = {
  settings: PublicSettings & { whatsappUrl: string; operatingContext: ReturnType<typeof getOperatingContext> };
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    products: Array<{
      id: string;
      name: string;
      description: string | null;
      priceAmount: number;
      available: boolean;
      featured: boolean;
      imageKey: string | null;
      imageAlt: string | null;
      modifiers: Array<{ name: string; required: boolean; minSelections: number | null; maxSelections: number | null; options: string[] }>;
    }>;
  }>;
};

type ReadModelInput = {
  settings: { businessName: string; whatsappPhone: string; whatsappMessage: string; currency: string; acceptingOrders: boolean; statusMessage: string | null; weeklySchedule: unknown };
  categories: Array<{
    id: string; name: string; slug: string;
    products: Array<{
      id: string; name: string; description: string | null; priceAmount: number; available: boolean; featured: boolean; imageKey: string | null; imageAlt: string | null;
      modifierGroups: Array<{ required: boolean; minSelections: number | null; maxSelections: number | null; modifierGroup: { name: string; options: Array<{ name: string }> } }>;
    }>;
  }>;
};

export function buildMenuReadModel(input: ReadModelInput): MenuReadModel {
  return {
    settings: {
      businessName: input.settings.businessName,
      whatsappPhone: input.settings.whatsappPhone,
      whatsappMessage: input.settings.whatsappMessage,
      currency: "ARS",
      acceptingOrders: input.settings.acceptingOrders,
      statusMessage: input.settings.statusMessage,
      weeklySchedule: input.settings.weeklySchedule as PublicSettings["weeklySchedule"],
      whatsappUrl: normalizeWhatsAppUrl(input.settings.whatsappPhone, input.settings.whatsappMessage),
      operatingContext: getOperatingContext(input.settings),
    },
    categories: input.categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        priceAmount: product.priceAmount,
        available: product.available,
        featured: product.featured,
        imageKey: product.imageKey,
        imageAlt: product.imageAlt,
        modifiers: product.modifierGroups.map((association) => ({
          name: association.modifierGroup.name,
          required: association.required,
          minSelections: association.minSelections,
          maxSelections: association.maxSelections,
          options: association.modifierGroup.options.map((option) => option.name),
        })),
      })),
    })),
  };
}

export async function getPublicMenu(): Promise<MenuReadModel> {
  const [settings, categories] = await Promise.all([
    db.menuSettings.findFirst(),
    db.category.findMany({
      where: { active: true, archivedAt: null, products: { some: { published: true, archivedAt: null } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        products: {
          where: { published: true, archivedAt: null },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            modifierGroups: {
              include: { modifierGroup: { include: { options: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } } },
            },
          },
        },
      },
    }),
  ]);
  if (!settings) throw new Error("MenuSettings is not configured");
  return buildMenuReadModel({ settings, categories });
}
