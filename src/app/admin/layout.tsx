import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { orderRepository } from "@/modules/orders/repository";
import { getCurrentAdmin } from "@/modules/auth/session";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentAdmin = await getCurrentAdmin();
  const initialEventCursor = currentAdmin ? await orderRepository.latestEventSequence() : BigInt(0);
  return <AdminShell initialEventCursor={initialEventCursor.toString()}>{children}</AdminShell>;
}
