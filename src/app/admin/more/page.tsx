import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Settings, Tags } from "lucide-react";
import { getCurrentAdmin } from "@/modules/auth/session";
import { LogoutButton } from "@/components/admin/LogoutButton";
export const dynamic="force-dynamic";
export default async function MorePage(){if(!await getCurrentAdmin())redirect("/admin/login?returnTo=%2Fadmin%2Fmore");return <main className="admin-page admin-more"><section className="more-brand"><Image src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={64} height={64}/><div><p className="eyebrow">Administración</p><h1>Más</h1></div></section><nav className="more-links" aria-label="Más opciones"><Link href="/admin/categories"><span className="more-icon"><Tags size={20}/></span><strong>Categorías</strong><ChevronRight size={20}/></Link><Link href="/admin/settings"><span className="more-icon"><Settings size={20}/></span><strong>Configuración</strong><ChevronRight size={20}/></Link></nav><section className="more-logout"><h2>Sesión administrativa</h2><p>Cerrar sesión en este dispositivo.</p><LogoutButton/></section></main>}
