"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, BellRing, CheckCircle2, FileCheck2, Mail, Send, ShieldAlert, Sparkles, Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

export function Greeting({ name, summary }: { name: string; summary: string }) {
  const [part, setPart] = useState("Hello");
  const [date, setDate] = useState(" ");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setPart(h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDate(now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
  }, []);
  return (
    <div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-caption font-medium text-muted-foreground">
        {date}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mt-1 font-heading text-[1.875rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-h1"
      >
        {part}, {name} <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 16, -8, 14, 0] }} transition={{ delay: 0.6, duration: 1.2 }}>👋</motion.span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 text-muted-foreground">
        {summary}
      </motion.p>
    </div>
  );
}

export type AttentionItem = {
  id: string;
  tone: "coral" | "amber" | "emerald";
  kind: "overdue" | "expiring" | "approve";
  title: string;
  detail: string;
  cta: string;
  href: string;
};

const ATTN_ICON = { overdue: AlertTriangle, expiring: ShieldAlert, approve: FileCheck2 };
const ATTN_TONE = {
  coral: "bg-coral-soft text-coral-ink",
  amber: "bg-amber-soft text-amber-ink",
  emerald: "bg-emerald-soft text-emerald-ink",
};

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            {items.length > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-coral opacity-60" />}
            <span className={cn("relative inline-flex size-2.5 rounded-full", items.length ? "bg-coral" : "bg-emerald")} />
          </span>
          <h2 className="font-heading text-h3 font-bold">Needs your attention</h2>
        </div>
        <span className="tabular rounded-full bg-surface-sunken px-2.5 py-0.5 text-caption font-semibold">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <EmptyState art="shield" title="All guarded" description="Nothing needs you right now. Go make something great." />
      ) : (
        <ul className="grid gap-3 p-5 sm:p-6 lg:grid-cols-3">
          {items.map((it, i) => {
            const Icon = ATTN_ICON[it.kind];
            return (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease }}
              >
                <Link
                  href={it.href}
                  className="group flex h-full flex-col rounded-2xl bg-canvas p-4 ring-1 ring-line/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-soft dark:bg-surface-sunken dark:hover:bg-surface-raised"
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", ATTN_TONE[it.tone])}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{it.title}</p>
                      <p className="mt-0.5 text-caption text-muted-foreground">{it.detail}</p>
                    </div>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 self-start text-caption font-semibold text-emerald-ink">
                    {it.cta}
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export type FeedItem = { id: string; kind: string; message: string; createdAt: string; dealId: string | null };

const FEED_ICON: Record<string, { icon: typeof Mail; tone: string }> = {
  email: { icon: Mail, tone: "bg-surface-sunken text-foreground/70" },
  extracted: { icon: Sparkles, tone: "bg-emerald-soft text-emerald-ink" },
  approved: { icon: FileCheck2, tone: "bg-emerald-soft text-emerald-ink" },
  invoice_sent: { icon: Send, tone: "bg-amber-soft text-amber-ink" },
  reminder: { icon: BellRing, tone: "bg-amber-soft text-amber-ink" },
  paid: { icon: CheckCircle2, tone: "bg-emerald-soft text-emerald-ink" },
  payout: { icon: Wallet, tone: "bg-emerald-soft text-emerald-ink" },
  rights: { icon: ShieldAlert, tone: "bg-coral-soft text-coral-ink" },
  renewal: { icon: Sparkles, tone: "bg-emerald-soft text-emerald-ink" },
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
        <h2 className="flex items-center gap-2 font-heading text-h3 font-bold">
          <Sparkles className="size-4 text-emerald-ink" aria-hidden /> Agent activity
        </h2>
        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald" />
          </span>
          Live
        </span>
      </div>
      <ol className="relative flex-1 space-y-1 p-3 sm:p-4">
        {items.map((a, i) => {
          const meta = FEED_ICON[a.kind] ?? FEED_ICON.email;
          const Icon = meta.icon;
          const inner = (
            <>
              <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-lg", meta.tone)}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[0.85rem] leading-snug">{a.message}</p>
                <p className="mt-0.5 text-micro tracking-normal text-muted-foreground">{timeAgo(a.createdAt)}</p>
              </div>
            </>
          );
          return (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.4, ease }}
              className="relative"
            >
              {i < items.length - 1 && <span aria-hidden className="absolute top-10 bottom-[-6px] left-[1.5rem] w-px bg-line" />}
              {a.dealId ? (
                <Link href={`/app/deals/${a.dealId}`} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface-sunken">{inner}</Link>
              ) : (
                <div className="flex gap-3 p-2">{inner}</div>
              )}
            </motion.li>
          );
        })}
      </ol>
    </Card>
  );
}

export function NewDealCta() {
  return (
    <Link href="/app/new" className={cn(buttonVariants({ size: "lg" }), "group shadow-[0_8px_24px_-8px_rgb(18_184_134/0.6)]")}>
      <Sparkles className="transition-transform duration-300 group-hover:rotate-12" aria-hidden /> New deal from email
    </Link>
  );
}
