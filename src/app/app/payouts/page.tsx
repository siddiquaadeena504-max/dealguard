import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Users, Wallet } from "lucide-react";
import { collaborators, db, deals, payouts } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CountUpMoney } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status";
import { Reveal } from "@/components/motion/primitives";
import { toCurrency } from "@/lib/deals";
import { fmtDate, money } from "@/lib/format";
import { requireWorkspace } from "@/lib/workspace";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const ws = await requireWorkspace();
  const rows = db
    .select({ p: payouts, c: collaborators, d: deals })
    .from(payouts)
    .innerJoin(collaborators, eq(collaborators.id, payouts.collaboratorId))
    .innerJoin(deals, eq(deals.id, payouts.dealId))
    .where(eq(deals.workspaceId, ws.id))
    .orderBy(desc(payouts.createdAt))
    .all();
  const people = db
    .select({ c: collaborators, d: deals })
    .from(collaborators)
    .innerJoin(deals, eq(deals.id, collaborators.dealId))
    .where(eq(deals.workspaceId, ws.id))
    .all();

  const sum = (status: string) => rows.filter((r) => r.p.status === status).reduce((s, r) => s + toCurrency(r.p.amount, r.p.currency, ws.currency), 0);
  const byPerson = new Map<string, { name: string; email: string; role: string | null; deals: { id: string; brand: string; pct: number }[] }>();
  for (const { c, d } of people) {
    const k = c.email.toLowerCase();
    const e = byPerson.get(k) ?? { name: c.name, email: c.email, role: c.role, deals: [] };
    e.deals.push({ id: d.id, brand: d.brand, pct: c.sharePct });
    byPerson.set(k, e);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-caption font-medium text-emerald-ink">Payouts</p>
        <h1 className="mt-1 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-h1">Share the win</h1>
        <p className="mt-2 text-muted-foreground">Split brand payments with editors, designers and co-creators through PayPal Payouts.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Paid out" icon={Wallet} tone="emerald" glow value={<CountUpMoney amount={sum("sent")} currency={ws.currency} />} hint={`${rows.filter((r) => r.p.status === "sent").length} payouts`} />
        <StatCard label="Waiting for approval" icon={Wallet} tone="amber" value={<CountUpMoney amount={sum("proposed")} currency={ws.currency} />} hint="Approve on each deal" />
        <StatCard label="Collaborators" icon={Users} value={byPerson.size} hint="Across all deals" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Reveal className="min-w-0">
          <Card className="overflow-hidden">
            <CardHeader><CardTitle>Payout history</CardTitle></CardHeader>
            {rows.length === 0 ? (
              <EmptyState art="coins" title="No payouts yet" description="Add a collaborator to a deal. When the brand pays, their share is ready to send." />
            ) : (
              <ul className="mt-4 divide-y divide-line/60">
                {rows.map(({ p, c, d }) => (
                  <li key={p.id}>
                    <Link href={`/app/deals/${d.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-sunken">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber to-orange-500 font-heading leading-none font-bold text-ink">{c.name.slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name} <span className="font-normal text-muted-foreground">· {c.sharePct}% of {d.brand}</span></p>
                        <p className="truncate text-caption text-muted-foreground">
                          {p.status === "sent" ? `Sent ${fmtDate(p.sentAt)} · batch ` : "Proposed after payment · "}
                          <span className="tabular">{p.batchId ?? "awaiting approval"}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular font-semibold">{money(p.amount, p.currency)}</span>
                        <StatusPill status={p.status === "sent" ? "payout_sent" : "pending"} label={p.status === "sent" ? "Sent" : "Needs approval"} size="sm" />
                      </div>
                      <ArrowRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>
        <Reveal delay={0.1} className="min-w-0">
          <Card>
            <CardHeader><CardTitle>Your collaborators</CardTitle></CardHeader>
            <CardContent>
              {byPerson.size === 0 ? (
                <p className="text-caption text-muted-foreground">Nobody yet. Open any deal and add a collaborator with their % split.</p>
              ) : (
                <ul className="space-y-3">
                  {[...byPerson.values()].map((p) => (
                    <li key={p.email} className="rounded-2xl bg-surface-sunken p-3">
                      <p className="font-semibold">{p.name} <span className="font-normal text-muted-foreground">· {p.role ?? "Collaborator"}</span></p>
                      <p className="text-caption text-muted-foreground">{p.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.deals.map((d) => (
                          <Link key={d.id} href={`/app/deals/${d.id}`} className="rounded-lg bg-surface px-2 py-1 text-micro font-semibold tracking-normal hover:text-emerald-ink dark:bg-surface-raised">
                            {d.brand} · {d.pct}%
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
