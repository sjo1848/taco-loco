import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/modules/auth/session";
import { settingsService } from "@/modules/settings/service";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { normalizeWeeklySchedule } from "@/modules/settings/operating-context";
export const dynamic = "force-dynamic";
export default async function SettingsPage() { if (!await getCurrentAdmin()) redirect("/admin/login"); const settings = await settingsService.get(); if (!settings) return <main className="admin-page"><h1>Configuración no disponible</h1></main>; return <main className="admin-page"><div className="admin-header"><div><p className="eyebrow">Administración</p><h1>WhatsApp y menú</h1></div></div><section className="admin-panel admin-panel--form"><SettingsForm initial={{ ...settings, statusMessage: settings.statusMessage ?? null, weeklySchedule: normalizeWeeklySchedule(settings.weeklySchedule) }} /></section></main>; }
