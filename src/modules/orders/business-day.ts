export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_STANDARD_OFFSET = "-03:00";

export function businessDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function businessDayStart(now = new Date()) {
  return new Date(`${businessDateKey(now)}T00:00:00${ARGENTINA_STANDARD_OFFSET}`);
}

export function millisecondsUntilNextBusinessMidnight(now = new Date()) {
  return Math.max(1000, businessDayStart(now).getTime() + 86_400_000 - now.getTime() + 100);
}
