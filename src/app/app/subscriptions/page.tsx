"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Plus, Repeat, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, fieldClassName } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { toast } from "@/components/ui/toaster";
import { daysUntil, fmtDate, isoDay, money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Sub = { id: string; name: string; category: string; price: number; currency: string; cycle: "monthly" | "yearly"; renews: string };

const KEY = "dg_subscriptions_v1";
const seed = (): Sub[] => [
  { id: "1", name: "ChatGPT Plus", category: "AI writing", price: 20, currency: "USD", cycle: "monthly", renews: isoDay(4) },
  { id: "2", name: "Midjourney", category: "AI images", price: 30, currency: "USD", cycle: "monthly", renews: isoDay(11) },
  { id: "3", name: "ElevenLabs", category: "AI voice", price: 22, currency: "USD", cycle: "monthly", renews: isoDay(2) },
  { id: "4", name: "CapCut Pro", category: "Video editing", price: 8, currency: "USD", cycle: "monthly", renews: isoDay(19) },
  { id: "5", name: "Canva Pro", category: "Design", price: 120, currency: "USD", cycle: "yearly", renews: isoDay(64) },
];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [form, setForm] = useState({ name: "", category: "", price: "", cycle: "monthly" as Sub["cycle"], renews: isoDay(30) });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      setSubs(saved ? (JSON.parse(saved) as Sub[]) : seed());
    } catch {
      setSubs(seed());
    }
  }, []);
  useEffect(() => {
    if (!subs) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(subs));
    } catch {}
  }, [subs]);

  const list = useMemo(() => [...(subs ?? [])].sort((a, b) => a.renews.localeCompare(b.renews)), [subs]);
  const monthly = list.reduce((s, x) => s + (x.cycle === "monthly" ? x.price : x.price / 12), 0);
  const soon = list.filter((x) => (daysUntil(x.renews) ?? 99) <= 7).length;

  function add(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || !(price > 0)) return void toast.error("Add a name and a price.");
    setSubs([...(subs ?? []), { id: crypto.randomUUID(), name: form.name.trim(), category: form.category.trim() || "Tool", price, currency: "USD", cycle: form.cycle, renews: form.renews }]);
    setForm({ name: "", category: "", price: "", cycle: "monthly", renews: isoDay(30) });
    toast.success("Subscription added. We'll flag it before it renews.");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-caption font-medium text-emerald-ink">Subscriptions</p>
        <h1 className="mt-1 font-heading text-[1.75rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-h1">Your creator stack</h1>
        <p className="mt-2 text-muted-foreground">Track the AI and editing tools you pay for, and see what renews next.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Monthly spend" icon={Wallet} tone="emerald" glow value={<span className="tabular">{money(Math.round(monthly * 100) / 100, "USD")}</span>} hint={`${money(Math.round(monthly * 12), "USD")} a year`} />
        <StatCard label="Active tools" icon={Repeat} value={<span className="tabular">{list.length}</span>} hint="In your stack" />
        <StatCard label="Renewing in 7 days" icon={CalendarClock} tone="amber" value={<span className="tabular">{soon}</span>} hint="Cancel what you don't use" className="col-span-2 lg:col-span-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader><CardTitle>Renewals</CardTitle></CardHeader>
          {subs && list.length === 0 ? (
            <EmptyState art="calendar" title="No subscriptions yet" description="Add the tools you pay for to see your monthly spend." />
          ) : (
            <ul className="mt-4 divide-y divide-line/60">
              <AnimatePresence initial={false}>
                {list.map((s) => {
                  const n = daysUntil(s.renews) ?? 0;
                  return (
                    <motion.li key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald to-emerald-deep font-heading leading-none font-bold text-ink">{s.name.slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.name}</p>
                        <p className="truncate text-caption text-muted-foreground">{s.category} · renews {fmtDate(s.renews)}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular font-semibold">{money(s.price, s.currency)}<span className="text-caption font-normal text-muted-foreground">/{s.cycle === "monthly" ? "mo" : "yr"}</span></p>
                        <p className={cn("text-caption", n <= 7 ? "font-semibold text-amber-ink" : "text-muted-foreground")}>{n <= 0 ? "renews today" : `in ${n} day${n === 1 ? "" : "s"}`}</p>
                      </div>
                      <button aria-label={`Remove ${s.name}`} onClick={() => setSubs((subs ?? []).filter((x) => x.id !== s.id))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-sunken hover:text-coral-ink">
                        <Trash2 className="size-4" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Add a subscription</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-3">
              <Input aria-label="Tool name" placeholder="Tool name (e.g. Runway)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input aria-label="Category" placeholder="Category (e.g. AI video)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input aria-label="Price in USD" type="number" min={0} step="0.01" placeholder="Price (USD)" className="tabular" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <select aria-label="Billing cycle" className={cn(fieldClassName, "h-11")} value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as Sub["cycle"] })}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <Input aria-label="Next renewal date" type="date" value={form.renews} onChange={(e) => setForm({ ...form, renews: e.target.value })} />
              <Button type="submit" className="w-full"><Plus /> Add subscription</Button>
              <p className="text-caption text-muted-foreground">Saved in this browser.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
