"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() { const router = useRouter(); async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/admin/login"); router.refresh(); } return <button className="admin-button admin-button--secondary" onClick={logout}>Cerrar sesión</button>; }
