import { redirect } from "next/navigation";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { getCurrentAdmin } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ cola?: string }> }) {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login?returnTo=%2Fadmin%2Forders");
  const requested = (await searchParams)?.cola;
  const queue = requested === "preparando" ? "preparing" : requested === "listos" ? "ready" : "start";
  // The client loads this snapshot from the authenticated operations API. Keep
  // D1 result sets out of the RSC render, then reconcile once SSE opens to
  // close the snapshot/stream race without computing the same counts twice.
  const emptyCounts = { start: 0, preparing: 0, ready: 0, verification: 0, unconfirmed: 0, incidents: 0, attention: 0 };
  return <OrdersBoard initialOrders={[]} initialCursor={null} initialCounts={emptyCounts} initialQueue={queue} />;
}
