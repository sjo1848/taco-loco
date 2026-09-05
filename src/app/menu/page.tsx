import { MenuExperience } from "@/components/public/MenuExperience";
import { getPublicMenu } from "@/modules/catalog/read-model";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menu = await getPublicMenu();
  return <MenuExperience menu={menu} />;
}
