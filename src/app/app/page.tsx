import type { Metadata } from "next";
import { AlertTriangle, CircleDollarSign, Send, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp, CountUpMoney } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { DealsGrid, type GridDeal } from "@/components/app/deals-grid";
import { ActivityFeed, AttentionPanel, Greeting, NewDealCta, type AttentionItem } from "@/components/app/dashboard-widgets";
import { dealState, isRightsExpiring, rightsDaysLeft, totals } from "@/lib/deals";
import { daysUntil, money } from "@/lib/format";
import { listActivity, listDeals, requireWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const ws = await requireWorkspace();
  const deals = listDeals(ws.id);
  const t = totals(deals, ws.currency);

  const attention: AttentionItem[] = [];
  for (const d of deals) {
    const s = dealState(d);
    if (s === "overdue") {
      const late = -(daysUntil(d.dueDate) ?? 0);
      attention.push({
        id: d.id + "o", tone: "coral", kind: "overdue", href: `/app/deals/${d.id}`,
        title: `${d.brand} is ${late} day${late === 1 ? "" : "s"} late`,
        detail: `${money(d.fee, d.currency)} · ${d.invoiceNumber}`, cta: "Draft a reminder",
      });
    }
    if (s === "awaiting_approval") {
      attention.push({
        id: d.id + "a", tone: "emerald", kind: "approve", href: `/app/new?deal=${d.id}`,
        title: `Approve the ${d.brand} invoice`,
        detail: `${money(d.fee, d.currency)} · extracted from email`, cta: "Review & approve",
      });
    }
    if (isRightsExpiring(d)) {
      const n = rightsDaysLeft(d)!;
      attention.push({
        id: d.id + "r", tone: "amber", kind: "expiring", href: `/app/deals/${d.id}`,
        title: `${d.brand} rights end in ${n} day${n === 1 ? "" : "s"}`,
        detail: "Content is still live. Pitch a paid renewal.", cta: "Draft renewal pitch",
      });
    }
  }
  attention.sort((a, b) => ["overdue", "approve", "expiring"].indexOf(a.kind) - ["overdue", "approve", "expiring"].indexOf(b.kind));

  const grid: GridDeal[] = deals.map((d) => ({
    id: d.id, brand: d.brand, title: d.title, fee: d.fee, currency: d.currency, state: dealState(d),
    dueDate: d.dueDate, rightsLeft: rightsDaysLeft(d), invoiceNumber: d.invoiceNumber,
  }));

  const summary = t.overdueCount
    ? `${t.overdueCount} brand${t.overdueCount > 1 ? "s are" : " is"} late on payment. Everything else is on track.`
    : "Everything is on track. Nice.";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Greeting name={ws.name} summary={summary} />
        <NewDealCta />
      </div>

      <AttentionPanel items={attention} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Invoiced" icon={Send} glow value={<CountUpMoney amount={t.invoiced} currency={ws.currency} />} hint={`${t.invoicedCount} invoices`} />
        <StatCard label="Paid" icon={CircleDollarSign} tone="emerald" glow value={<CountUpMoney amount={t.paid} currency={ws.currency} />} hint={`${t.paidCount} brands paid`} />
        <StatCard label="Overdue" icon={AlertTriangle} tone="coral" value={<CountUpMoney amount={t.overdue} currency={ws.currency} />} hint={t.overdueCount ? `${t.overdueCount} late invoice${t.overdueCount > 1 ? "s" : ""}` : "None. Lovely."} />
        <StatCard label="Rights expiring" icon={ShieldAlert} tone="amber" value={<CountUp value={t.expiring} />} hint="Within 7 days" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
            <h2 className="font-heading text-h3 font-bold">Your deals</h2>
            <span className="hidden text-caption text-muted-foreground sm:inline">Totals shown in {ws.currency} (≈ for other currencies)</span>
          </div>
          <DealsGrid deals={grid} />
        </Card>
        <ActivityFeed items={listActivity(ws.id, 9).map((a) => ({ id: a.id, kind: a.kind, message: a.message, createdAt: a.createdAt, dealId: a.dealId }))} />
      </div>
    </div>
  );
}
