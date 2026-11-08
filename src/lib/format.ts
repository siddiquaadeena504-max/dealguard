export function money(amount: number | null | undefined, currency?: string | null) {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency ?? ""}`.trim();
  }
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

/** Today's date as YYYY-MM-DD in local time. */
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

export function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  const target = new Date(d.slice(0, 10) + "T00:00:00").getTime();
  const now = new Date(today() + "T00:00:00").getTime();
  return Math.round((target - now) / 864e5);
}

export function countdown(d: string | null | undefined) {
  const n = daysUntil(d);
  if (n == null) return "";
  if (n === 0) return "today";
  if (n > 0) return `in ${n} day${n === 1 ? "" : "s"}`;
  return `${-n} day${n === -1 ? "" : "s"} ago`;
}

export const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ") : "");
