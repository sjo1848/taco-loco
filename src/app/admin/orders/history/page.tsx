import { redirect } from "next/navigation";
import { OrderHistory } from "@/components/admin/OrderHistory";
import { getCurrentAdmin } from "@/modules/auth/session";
export const dynamic="force-dynamic";
export default async function HistoryPage({searchParams}:{searchParams?:Promise<{q?:string;from?:string;to?:string;period?:string;status?:string;fulfillment?:string}>}){if(!await getCurrentAdmin())redirect("/admin/login?returnTo=%2Fadmin%2Forders%2Fhistory");return <OrderHistory initialFilters={await searchParams??{}}/>}
