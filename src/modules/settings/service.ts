import { menuSettingsInputSchema, type MenuSettingsInput } from "@/modules/catalog/schemas";
import { settingsRepository } from "@/modules/settings/repository";
import { normalizeWeeklySchedule } from "@/modules/settings/operating-context";

export const settingsService = {
  get: () => settingsRepository.get(),
  update(input: unknown) {
    const parsed = menuSettingsInputSchema.parse(input);
    return settingsRepository.upsert({ ...parsed, weeklySchedule: normalizeWeeklySchedule(parsed.weeklySchedule) });
  },
};

export function normalizeWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export type PublicSettings = Pick<MenuSettingsInput, "businessName" | "whatsappPhone" | "whatsappMessage" | "currency" | "acceptingOrders" | "statusMessage" | "weeklySchedule">;
