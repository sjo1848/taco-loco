import { redirect } from "next/navigation";
import { AttentionInbox } from "@/components/admin/AttentionInbox";
import { getCurrentAdmin } from "@/modules/auth/session";
export const dynamic="force-dynamic";
export default async function AttentionPage(){if(!await getCurrentAdmin())redirect("/admin/login?returnTo=%2Fadmin%2Forders%2Fattention");return <AttentionInbox/>}
