import { db } from "@/lib/db";
import type { MenuSettingsInput } from "@/modules/catalog/schemas";

const settingsId = "00000000-0000-0000-0000-000000000001";

export const settingsRepository = {
  get: () => db.menuSettings.findUnique({ where: { id: settingsId } }),
  upsert: (input: MenuSettingsInput) => db.menuSettings.upsert({ where: { id: settingsId }, update: input, create: { id: settingsId, ...input } }),
};
