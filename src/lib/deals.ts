import type { Deal } from "./db/schema";
import { daysUntil, isoDay } from "./format";

export type DealState = "awaiting_approval" | "sent" | "overdue" | "paid" | "cancelled";

/** Overdue is derived: a sent invoice past its due date. */
export function dealState(d: Pick<Deal, "status" | "dueDate">): DealState {
  if (d.status === "draft") return "awaiting_approval";
  if (d.status === "sent") return d.dueDate && (daysUntil(d.dueDate) ?? 0) < 0 ? "overdue" : "sent";
  return d.status;
}

export function rightsEnd(d: Pick<Deal, "usageDays" | "usageStart">) {
  if (!d.usageDays || !d.usageStart) return null;
  return isoDay(d.usageDays, new Date(d.usageStart + "T00:00:00"));
}

export function rightsDaysLeft(d: Pick<Deal, "usageDays" | "usageStart">) {
  const end = rightsEnd(d);
  return end ? daysUntil(end) : null;
}

export const isRightsExpiring = (d: Pick<Deal, "usageDays" | "usageStart">) => {
  const n = rightsDaysLeft(d);
  return n != null && n >= 0 && n <= 7;
};

// Demo-grade conversion so totals across currencies can share one headline number.
const TO_INR: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107 };
export const toCurrency = (amount: number, from: string, to: string) =>
  (amount * (TO_INR[from] ?? 1)) / (TO_INR[to] ?? 1);

export function totals(deals: Deal[], currency: string) {
  let invoiced = 0, paid = 0, overdue = 0, overdueCount = 0, invoicedCount = 0, paidCount = 0;
  let expiring = 0;
  for (const d of deals) {
    const s = dealState(d);
    const amt = d.fee ? toCurrency(d.fee, d.currency, currency) : 0;
    if (s === "sent" || s === "overdue" || s === "paid") { invoiced += amt; invoicedCount++; }
    if (s === "paid") { paid += amt; paidCount++; }
    if (s === "overdue") { overdue += amt; overdueCount++; }
    if (isRightsExpiring(d)) expiring++;
  }
  return { invoiced, paid, overdue, overdueCount, invoicedCount, paidCount, expiring };
}
