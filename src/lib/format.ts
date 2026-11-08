const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "en-AE",
};

/** Formats money in the currency's own convention: ₹1,50,000 · $1,800.00 · €950.00 */
export function money(amount: number | null | undefined, currency = "USD", opts: { compact?: boolean } = {}) {
  if (amount == null || !isFinite(amount)) return "—";
  const code = (currency || "USD").toUpperCase();
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[code] ?? "en-US", {
      style: "currency",
      currency: code,
      notation: opts.compact ? "compact" : "standard",
      minimumFractionDigits: opts.compact || whole ? 0 : 2,
      maximumFractionDigits: opts.compact ? 1 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${code}`;
  }
}

export function fmtDate(d: string | Date | null | undefined, style: "short" | "long" = "short") {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(style === "long" ? { year: "numeric" } : {}),
  });
}

/** Today (or today + n days) as YYYY-MM-DD in local time. */
export function isoDay(offsetDays = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}

export function daysUntil(d: string | null | undefined, now = new Date()) {
  if (!d) return null;
  const target = new Date(d.slice(0, 10) + "T00:00:00").getTime();
  const today = new Date(isoDay(0, now) + "T00:00:00").getTime();
  return Math.round((target - today) / 864e5);
}

export function relativeDays(d: string | null | undefined) {
  const n = daysUntil(d);
  if (n == null) return "";
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days < 30 ? `${days}d ago` : fmtDate(iso);
}
