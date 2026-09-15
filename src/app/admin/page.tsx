import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  redirect("/admin/orders");
}
