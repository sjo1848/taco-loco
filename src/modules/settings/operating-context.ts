import { weeklyScheduleSchema } from "@/modules/catalog/schemas";

export type WeeklyScheduleEntry = { day: number; enabled: boolean; open: string; close: string };
export type OperatingContext = { acceptingOrders: boolean; isOpen: boolean; status: "OPEN" | "PAUSED" | "CLOSED"; label: string; detail: string; weeklySchedule: WeeklyScheduleEntry[] };

export const defaultWeeklySchedule: WeeklyScheduleEntry[] = Array.from({ length: 7 }, (_, day) => ({ day, enabled: false, open: "18:00", close: "23:30" }));

export function normalizeWeeklySchedule(value: unknown): WeeklyScheduleEntry[] {
  const parsed = weeklyScheduleSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultWeeklySchedule;
}

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return { day: day < 0 ? 0 : day, time: `${parts.find((part) => part.type === "hour")?.value ?? "00"}:${parts.find((part) => part.type === "minute")?.value ?? "00"}` };
}

export function getOperatingContext(settings: { acceptingOrders: boolean; statusMessage: string | null; weeklySchedule: unknown }, now = new Date()): OperatingContext {
  const weeklySchedule = normalizeWeeklySchedule(settings.weeklySchedule);
  const hasAutomaticSchedule = weeklySchedule.some((entry) => entry.enabled);
  const local = localDateParts(now);
  const today = weeklySchedule.find((entry) => entry.day === local.day);
  const withinSchedule = Boolean(today?.enabled && local.time >= today.open && local.time <= today.close);
  const isOpen = settings.acceptingOrders && (!hasAutomaticSchedule || withinSchedule);
  const status = !settings.acceptingOrders ? "PAUSED" : isOpen ? "OPEN" : "CLOSED";
  const label = status === "OPEN" ? "Estamos tomando pedidos" : status === "PAUSED" ? "Pedidos pausados" : "Fuera de horario";
  const detail = settings.statusMessage || (status === "OPEN" ? "Podés armar tu pedido y enviarlo por WhatsApp." : status === "PAUSED" ? "Podés consultar el menú y escribirnos para confirmar disponibilidad." : "Podés consultar el menú. Revisá nuestros horarios para volver a pedir.");
  return { acceptingOrders: settings.acceptingOrders, isOpen, status, label, detail, weeklySchedule };
}
