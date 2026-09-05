"use client";
import { useState } from "react";

type ScheduleEntry = { day: number; enabled: boolean; open: string; close: string };
type Settings = { businessName: string; whatsappPhone: string; whatsappMessage: string; currency: string; acceptingOrders: boolean; statusMessage: string | null; weeklySchedule: ScheduleEntry[] };
const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      setMessage(response.ok ? "Configuración guardada." : "No se pudo guardar la configuración.");
    } catch { setMessage("No se pudo conectar con el servidor."); } finally { setPending(false); }
  }
  function updateSchedule(day: number, patch: Partial<ScheduleEntry>) { setForm({ ...form, weeklySchedule: form.weeklySchedule.map((entry) => entry.day === day ? { ...entry, ...patch } : entry) }); }
  return <form className="admin-form admin-form--wide" onSubmit={save}>
    <label>Nombre del negocio<input value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} required /></label>
    <label>WhatsApp<input value={form.whatsappPhone} onChange={(event) => setForm({ ...form, whatsappPhone: event.target.value })} required /></label>
    <label>Mensaje base<textarea rows={4} value={form.whatsappMessage} onChange={(event) => setForm({ ...form, whatsappMessage: event.target.value })} required /></label>
    <fieldset className="admin-schedule"><legend>Estado operativo</legend><label className="admin-checkbox"><input type="checkbox" checked={form.acceptingOrders} onChange={(event) => setForm({ ...form, acceptingOrders: event.target.checked })} /> Tomar pedidos ahora</label><label>Mensaje visible al cliente<input value={form.statusMessage ?? ""} onChange={(event) => setForm({ ...form, statusMessage: event.target.value || null })} placeholder="Opcional" /></label></fieldset>
    <fieldset className="admin-schedule"><legend>Horarios semanales</legend><p className="admin-help">Si no activás ningún día, el estado se controla manualmente.</p>{form.weeklySchedule.map((entry) => <div className="admin-schedule__row" key={entry.day}><label className="admin-checkbox"><input type="checkbox" checked={entry.enabled} onChange={(event) => updateSchedule(entry.day, { enabled: event.target.checked })} /> {dayNames[entry.day]}</label><input aria-label={`Apertura ${dayNames[entry.day]}`} type="time" value={entry.open} onChange={(event) => updateSchedule(entry.day, { open: event.target.value })} disabled={!entry.enabled} /><input aria-label={`Cierre ${dayNames[entry.day]}`} type="time" value={entry.close} onChange={(event) => updateSchedule(entry.day, { close: event.target.value })} disabled={!entry.enabled} /></div>)}</fieldset>
    {message && <p role="status" className="admin-feedback">{message}</p>}<button className="admin-button admin-button--primary" disabled={pending}>{pending ? "Guardando…" : "Guardar configuración"}</button>
  </form>;
}
