import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentAdmin } from "@/modules/auth/session";
import { redirect } from "next/navigation";
import Image from "next/image";
import styles from "./login.module.css";
export default async function AdminLoginPage() { if(await getCurrentAdmin())redirect("/admin/orders");return <main className={styles.page}><div className={styles.card}><Image src="/brand/logo-taco-loco.jpg" alt="Taco Loco" width={72} height={72}/><p className="eyebrow">Administración</p><h1>Ingresá para gestionar el local</h1><LoginForm /></div></main>; }
