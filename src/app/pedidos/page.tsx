import { CustomerOrders } from "@/components/public/CustomerOrders";
import { PublicShell } from "@/components/public/PublicShell";

export const metadata = { title: "Mis pedidos · Taco Loco", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function OrdersPage() {
  return <PublicShell><CustomerOrders /></PublicShell>;
}
