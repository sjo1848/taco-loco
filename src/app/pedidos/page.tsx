import { CustomerOrders } from "@/components/public/CustomerOrders";
import { PublicNavigation } from "@/components/public/PublicNavigation";

export const metadata = { title: "Mis pedidos · Taco Loco", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function OrdersPage() {
  return <main className="public-shell"><PublicNavigation /><CustomerOrders /></main>;
}
