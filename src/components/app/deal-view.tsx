"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BellRing, CheckCircle2, Copy, ExternalLink, FileCheck2, Mail, RefreshCw, Send, ShieldAlert, Sparkles, Trash2, UserPlus, Wallet, Zap,
} from "lucide-react";
import {
  addCollaboratorAction, deleteReminderAction, draftReminderAction, logRenewalSentAction, refreshInsightAction, refreshStatusAction,
  removeCollaboratorAction, renewalPitchAction, sendPayoutsAction, sendReminderAction, simulatePaymentAction,
} from "@/app/app/actions";
import { ShieldMark } from "@/components/brand/logo";
import { Confetti, ShieldPulse } from "@/components/motion/confetti";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountdownRing, SectionLabel } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toaster";
import type { Activity, Collaborator, Deal, Payout, Reminder } from "@/lib/db/schema";
import type { DealState } from "@/lib/deals";
import { daysUntil, fmtDate, money, relativeDays, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type DealPlus = Deal & { state: DealState; rightsEnd: string | null; rightsDaysLeft: number | null };
const ease = [0.16, 1, 0.3, 1] as const;
const STATUS = { awaiting_approval: "awaiting_approval", sent: "sent", overdue: "overdue", paid: "paid", cancelled: "failed" } as const;

export function DealView({
  paypalLive, deal, reminders, collaborators, payouts, events,
}: {
  paypalLive: boolean; deal: DealPlus; reminders: Reminder[]; collaborators: Collaborator[]; payouts: Payout[]; events: Activity[];
}) {
  const router = useRouter();
  const [celebrate, setCelebrate] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const simulated = !deal.invoiceId || deal.invoiceId.startsWith("SIM-") || deal.invoiceId.startsWith("DEMO-");
  const late = Math.max(0, -(daysUntil(deal.dueDate) ?? 0));

  function refresh() {
    startRefresh(async () => {
      const res = await refreshStatusAction(deal.id);
      if (!res.ok) return void toast.error("Couldn't check PayPal", { description: res.error });
      if (res.paid && deal.state !== "paid") {
        setCelebrate((c) => c + 1);
        toast.success(`${deal.brand} paid!`, { description: "Shield up. Payouts are ready for approval." });
      } else toast(res.paid ? "Already paid" : `Still ${res.status === "SIMULATED" ? "waiting" : res.status.toLowerCase()}`, { description: "We'll keep an eye on it." });
      router.refresh();
    });
  }
  function simulatePay() {
    startRefresh(async () => {
      const res = await simulatePaymentAction(deal.id);
      if (!res.ok) return void toast.error(res.error);
      setCelebrate((c) => c + 1);
      toast.success(`${deal.brand} paid!`, { description: "Shield up. Payouts are ready for approval." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All deals
      </Link>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <AnimatePresence>
          {celebrate > 0 && (
            <motion.div key={celebrate} className="pointer-events-none absolute inset-0 z-10 grid place-items-center" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.8, duration: 0.6 }}>
              <div className="relative grid size-24 place-items-center">
                <ShieldPulse />
                <Confetti count={40} spread={220} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald to-emerald-deep font-heading text-h3 leading-none font-bold text-ink">
              {deal.brand.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-h2 leading-tight font-extrabold tracking-[-0.02em]">{deal.brand}</h1>
                <motion.span key={deal.state} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                  <StatusPill status={STATUS[deal.state]} label={deal.state === "overdue" ? `Overdue · ${late}d` : undefined} />
                </motion.span>
              </div>
              <p className="mt-1 text-muted-foreground">{deal.title}</p>
              <p className="mt-1 text-caption text-muted-foreground">
                {deal.contactName} · {deal.contactEmail}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <p className={cn("tabular font-heading text-[2rem] leading-none font-bold", deal.state === "paid" && "shield-glow text-emerald-ink")}>{money(deal.fee, deal.currency)}</p>
            <div className="flex flex-wrap gap-2">
              {deal.state !== "paid" && (
                <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing}>
                  {!refreshing && <RefreshCw />} Refresh status
                </Button>
              )}
              {deal.state !== "paid" && simulated && (
                <Button size="sm" onClick={simulatePay} disabled={refreshing} title="Demo only: pretend the brand paid">
                  <Zap /> Simulate brand payment
                </Button>
              )}
              {deal.invoiceUrl && (
                <a href={deal.invoiceUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  View on PayPal <ExternalLink />
                </a>
              )}
            </div>
            <p className="text-micro tracking-normal text-muted-foreground">
              <span className="tabular">{deal.invoiceNumber}</span> · {simulated ? "simulated PayPal invoice" : paypalLive ? "PayPal sandbox" : "PayPal"}
            </p>
          </div>
        </div>
        <Timeline deal={deal} reminders={reminders} payouts={payouts} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {(deal.state === "sent" || deal.state === "overdue") && <ChaseAgent deal={deal} reminders={reminders} late={late} />}
          <InvoiceCard deal={deal} />
          <Collaborators deal={deal} collaborators={collaborators} payouts={payouts} />
        </div>
        <div className="min-w-0 space-y-6">
          <InsightCard deal={deal} />
          <RightsCard deal={deal} />
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {[...events].reverse().map((e) => (
                  <li key={e.id} className="flex gap-3 text-caption">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald" aria-hidden />
                    <span><span className="text-foreground">{e.message}</span> <span className="text-muted-foreground">· {timeAgo(e.createdAt)}</span></span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Timeline({ deal, reminders, payouts }: { deal: DealPlus; reminders: Reminder[]; payouts: Payout[] }) {
  const sentReminders = reminders.filter((r) => r.status === "sent");
  const payoutSent = payouts.find((p) => p.status === "sent");
  const steps = [
    { label: "Email received", icon: Mail, at: deal.createdAt, done: true },
    { label: "Invoice sent", icon: Send, at: deal.sentAt, done: !!deal.sentAt },
    { label: sentReminders.length ? `${sentReminders.length} reminder${sentReminders.length > 1 ? "s" : ""}` : "Reminder", icon: BellRing, at: sentReminders[0]?.sentAt ?? null, done: sentReminders.length > 0, optional: true },
    { label: "Paid", icon: CheckCircle2, at: deal.paidAt, done: deal.state === "paid" },
    { label: "Payout sent", icon: Wallet, at: payoutSent?.sentAt ?? null, done: !!payoutSent, optional: true },
  ];
  const lastDone = steps.reduce((acc, s, i) => (s.done ? i : acc), 0);
  return (
    <div className="border-t border-line/70 px-5 py-5 sm:px-6">
      <div className="relative">
        <div className="absolute top-5 right-[10%] left-[10%] h-[2px] rounded-full bg-line" aria-hidden>
          <motion.div className="h-full origin-left rounded-full bg-emerald" initial={{ scaleX: 0 }} animate={{ scaleX: lastDone / (steps.length - 1) }} transition={{ duration: 0.9, ease, delay: 0.2 }} />
        </div>
        <ol className="relative grid grid-cols-5 gap-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="flex flex-col items-center text-center">
                <span className={cn(
                  "grid size-10 place-items-center rounded-full ring-4 ring-card transition-colors",
                  s.done ? "bg-emerald text-ink" : s.optional ? "bg-surface-sunken text-muted-foreground/60" : "bg-surface-sunken text-muted-foreground"
                )}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className={cn("mt-2 text-micro font-semibold tracking-normal sm:text-caption", s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                <span className="hidden text-micro tracking-normal text-muted-foreground sm:block">{s.at ? fmtDate(s.at) : s.done ? "" : "—"}</span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function InvoiceCard({ deal }: { deal: DealPlus }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Invoice</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            Due {fmtDate(deal.dueDate, "long")} ({deal.state === "paid" ? `paid ${fmtDate(deal.paidAt)}` : relativeDays(deal.dueDate)}) · {deal.paymentTerms ?? "No terms"}
          </p>
        </div>
        <span className="tabular text-caption text-muted-foreground">{deal.invoiceNumber}</span>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line/60">
          {deal.deliverables.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3">
              <span className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-emerald-ink" aria-hidden />
                {d.description}
                {d.platform && <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 text-micro tracking-normal text-muted-foreground">{d.platform}</span>}
              </span>
              <span className="tabular">{money(d.amount, deal.currency)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between pt-3 font-semibold">
            <span>Total</span>
            <span className="tabular font-heading text-h3">{money(deal.fee, deal.currency)}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

const TONES = [
  { key: "friendly", label: "Friendly", hint: "Light nudge", cls: "data-[on=true]:bg-emerald-soft data-[on=true]:text-emerald-ink data-[on=true]:ring-emerald/30" },
  { key: "firm", label: "Firm", hint: "Asks for a date", cls: "data-[on=true]:bg-amber-soft data-[on=true]:text-amber-ink data-[on=true]:ring-amber/30" },
  { key: "final", label: "Final", hint: "Last notice", cls: "data-[on=true]:bg-coral-soft data-[on=true]:text-coral-ink data-[on=true]:ring-coral/30" },
] as const;

function ChaseAgent({ deal, reminders, late }: { deal: DealPlus; reminders: Reminder[]; late: number }) {
  const router = useRouter();
  const sentCount = reminders.filter((r) => r.status === "sent").length;
  const recommended = late > 14 || sentCount >= 2 ? "final" : late > 5 || sentCount === 1 ? "firm" : "friendly";
  const [tone, setTone] = useState<(typeof TONES)[number]["key"]>(recommended);
  const [busy, start] = useTransition();
  const drafts = reminders.filter((r) => r.status === "draft");
  const sent = reminders.filter((r) => r.status === "sent");

  return (
    <Card className={cn("overflow-hidden", deal.state === "overdue" && "ring-coral/30")}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><BellRing className="size-4 text-amber-ink" aria-hidden /> Chase agent</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">
            {deal.state === "overdue"
              ? `${late} day${late === 1 ? "" : "s"} late · ${sentCount} reminder${sentCount === 1 ? "" : "s"} sent. Suggested next: ${recommended}.`
              : `Due ${relativeDays(deal.dueDate)}. Draft a nudge now or let it ride.`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Reminder tone">
          {TONES.map((t) => (
            <button
              key={t.key}
              role="radio"
              aria-checked={tone === t.key}
              data-on={tone === t.key}
              onClick={() => setTone(t.key)}
              className={cn("relative rounded-xl bg-surface-sunken px-3 py-2.5 text-left ring-1 ring-transparent transition-all", t.cls)}
            >
              <span className="block text-caption font-semibold">{t.label}</span>
              <span className="block text-micro tracking-normal opacity-80">{t.hint}</span>
              {t.key === recommended && <span className="absolute top-1.5 right-2 text-[0.6rem] font-bold tracking-wide uppercase">AI pick</span>}
            </button>
          ))}
        </div>
        <Button
          variant="subtle"
          className="w-full"
          loading={busy}
          onClick={() =>
            start(async () => {
              const res = await draftReminderAction(deal.id, tone);
              if (!res.ok) return void toast.error("Couldn't draft that", { description: res.error });
              toast("Reminder drafted", { description: "Have a look before it goes out." });
              router.refresh();
            })
          }
        >
          {!busy && <Sparkles />} Draft {tone} reminder
        </Button>

        <AnimatePresence initial={false}>
          {drafts.map((r) => <ReminderDraft key={r.id} r={r} />)}
        </AnimatePresence>

        {sent.length > 0 && (
          <div>
            <SectionLabel className="mb-2">Sent</SectionLabel>
            <ul className="space-y-2">
              {sent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-3 py-2 text-caption">
                  <span className="truncate"><span className="font-semibold capitalize">{r.tone}</span> · {r.subject}</span>
                  <span className="shrink-0 text-muted-foreground">{r.sentAt ? timeAgo(r.sentAt) : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderDraft({ r }: { r: Reminder }) {
  const router = useRouter();
  const [subject, setSubject] = useState(r.subject);
  const [body, setBody] = useState(r.body);
  const [busy, start] = useTransition();
  return (
    <motion.div layout initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="space-y-3 rounded-2xl bg-canvas p-4 ring-1 ring-line dark:bg-surface-sunken">
        <div className="flex items-center justify-between">
          <span className="text-micro font-semibold text-muted-foreground uppercase">{r.tone} reminder · draft</span>
          <button onClick={() => start(async () => { await deleteReminderAction(r.id); router.refresh(); })} aria-label="Delete draft" className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-coral-ink">
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message" className="min-h-36 text-[0.875rem]" />
        <div className="flex justify-end">
          <Button
            loading={busy}
            onClick={() =>
              start(async () => {
                const res = await sendReminderAction(r.id, subject, body);
                if (!res.ok) return void toast.error("Reminder not sent", { description: res.error });
                toast.success("Nudge sent. We'll keep an eye on it.", { description: res.simulated ? "Simulated: PayPal sandbox didn't accept this one, so it was simulated." : "Sent through PayPal's reminder." });
                router.refresh();
              })
            }
          >
            {!busy && <Send />} Approve &amp; send
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({ deal }: { deal: DealPlus }) {
  const [insight, setInsight] = useState(deal.insight);
  const [busy, start] = useTransition();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}>
      <Card className="relative overflow-hidden bg-[#0E1116] text-[#F2F2EE] ring-0 dark:bg-surface-raised dark:ring-1 dark:ring-line">
        <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-emerald/25 blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-micro font-semibold text-emerald uppercase"><Sparkles className="size-3.5" aria-hidden /> Agent insight</p>
            <button
              aria-label="Refresh insight"
              onClick={() => start(async () => { const r = await refreshInsightAction(deal.id); if (r.ok) setInsight(r.insight); else toast.error(r.error); })}
              className="grid size-7 place-items-center rounded-lg text-[#9AA1AD] hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={insight ?? ""} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 font-heading text-[1.0625rem] leading-snug font-semibold">
              {insight ?? "No insight yet."}
            </motion.p>
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

function RightsCard({ deal }: { deal: DealPlus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState<{ subject: string; body: string } | null>(null);
  const [busy, start] = useTransition();

  if (!deal.usageDays) {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-2 font-heading font-bold"><ShieldMark className="size-5 text-emerald" /> Usage rights</p>
        <p className="mt-2 text-caption text-muted-foreground">No paid usage on this deal. Your content stays yours.</p>
      </Card>
    );
  }
  const n = deal.rightsDaysLeft;
  const notStarted = !deal.usageStart || (daysUntil(deal.usageStart) ?? 0) > 0;
  const expiring = n != null && n >= 0 && n <= 7;
  return (
    <Card className={cn("p-5", expiring && "ring-amber/40")}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-heading font-bold"><ShieldAlert className={cn("size-4", expiring ? "text-amber-ink" : "text-emerald-ink")} aria-hidden /> Usage rights</p>
        {expiring && <StatusPill status="expiring" size="sm" />}
        {n != null && n < 0 && <StatusPill status="expired" size="sm" />}
      </div>
      <div className="mt-4 flex items-center gap-5">
        <CountdownRing daysLeft={notStarted ? deal.usageDays : n ?? 0} totalDays={deal.usageDays} size={104} />
        <div className="text-caption">
          <p className="font-semibold">{deal.usageDays} days of paid usage</p>
          <p className="text-muted-foreground">{notStarted ? `Starts ${fmtDate(deal.usageStart ?? deal.dueDate, "long")}` : `Ends ${fmtDate(deal.rightsEnd, "long")}`}</p>
          <p className="mt-2 text-muted-foreground">We flag it 7 days before it ends.</p>
        </div>
      </div>
      {!notStarted && (
        <Button
          variant={expiring ? "primary" : "secondary"}
          className="mt-5 w-full"
          loading={busy}
          onClick={() =>
            start(async () => {
              const r = await renewalPitchAction(deal.id);
              if (!r.ok) return void toast.error(r.error);
              setPitch({ subject: r.subject, body: r.body });
              setOpen(true);
            })
          }
        >
          {!busy && <Sparkles />} Draft renewal pitch
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Renewal pitch" description={`To ${deal.contactName ?? deal.brand} · ${deal.contactEmail}`}>
        {pitch && (
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="rs">Subject</Label><Input id="rs" value={pitch.subject} onChange={(e) => setPitch({ ...pitch, subject: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="rb">Message</Label><Textarea id="rb" value={pitch.body} onChange={(e) => setPitch({ ...pitch, body: e.target.value })} className="min-h-56" /></div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(`${pitch.subject}\n\n${pitch.body}`); toast.success("Copied. Paste it into your email."); }}><Copy /> Copy</Button>
              <a
                className={buttonVariants({ variant: "secondary" })}
                href={`mailto:${deal.contactEmail}?subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}`}
              >
                <Mail /> Open in email
              </a>
              <Button onClick={() => start(async () => { await logRenewalSentAction(deal.id); setOpen(false); toast.success("Logged. We'll watch for their reply."); router.refresh(); })}>
                <CheckCircle2 /> Mark as sent
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

function Collaborators({ deal, collaborators, payouts }: { deal: DealPlus; collaborators: Collaborator[]; payouts: Payout[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "", sharePct: "10" });
  const [busy, start] = useTransition();
  const totalPct = collaborators.reduce((s, c) => s + c.sharePct, 0);
  const proposed = payouts.filter((p) => p.status === "proposed");
  const yours = deal.fee ? deal.fee * (1 - totalPct / 100) : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><Wallet className="size-4 text-emerald-ink" aria-hidden /> Collaborators &amp; splits</CardTitle>
          <p className="mt-1 text-caption text-muted-foreground">When {deal.brand} pays, their shares go out via PayPal Payouts, after you approve.</p>
        </div>
        {!adding && <Button variant="secondary" size="sm" onClick={() => setAdding(true)}><UserPlus /> Add</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* split bar */}
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
            <motion.div className="h-full bg-emerald" initial={{ width: 0 }} animate={{ width: `${100 - totalPct}%` }} transition={{ duration: 0.7, ease }} />
            {collaborators.map((c, i) => (
              <motion.div key={c.id} className={cn("h-full", ["bg-amber", "bg-sky-400", "bg-violet-400"][i % 3])} initial={{ width: 0 }} animate={{ width: `${c.sharePct}%` }} transition={{ duration: 0.7, ease, delay: 0.1 }} />
            ))}
          </div>
          <p className="mt-2 text-caption text-muted-foreground">
            You keep <span className="font-semibold text-foreground">{100 - totalPct}%</span> ({money(yours, deal.currency)})
          </p>
        </div>

        <ul className="space-y-2">
          {collaborators.map((c, i) => {
            const p = payouts.find((x) => x.collaboratorId === c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-xl bg-surface-sunken px-3 py-2.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", ["bg-amber", "bg-sky-400", "bg-violet-400"][i % 3])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold">{c.name} <span className="font-normal text-muted-foreground">· {c.role ?? "Collaborator"}</span></p>
                  <p className="truncate text-caption text-muted-foreground">{c.email}</p>
                </div>
                <span className="tabular text-caption font-semibold">{c.sharePct}%</span>
                {p ? (
                  <StatusPill status={p.status === "sent" ? "payout_sent" : "pending"} label={p.status === "sent" ? "Paid out" : "Ready"} size="sm" />
                ) : (
                  <button aria-label={`Remove ${c.name}`} onClick={() => start(async () => { await removeCollaboratorAction(c.id); router.refresh(); })} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:text-coral-ink">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
          {!collaborators.length && !adding && <p className="text-caption text-muted-foreground">No collaborators on this deal. Add an editor, designer or co-creator to split the fee.</p>}
        </ul>

        <AnimatePresence>
          {adding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="grid gap-3 overflow-hidden sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await addCollaboratorAction(deal.id, { ...form, sharePct: Number(form.sharePct) });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(`${form.name} added`);
                  setForm({ name: "", email: "", role: "", sharePct: "10" });
                  setAdding(false);
                  router.refresh();
                });
              }}
            >
              <Input placeholder="Name" aria-label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="PayPal email" aria-label="PayPal email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder="Role (e.g. Editor)" aria-label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <div className="flex gap-2">
                <Input aria-label="Share percent" type="number" min={1} max={90} className="tabular" value={form.sharePct} onChange={(e) => setForm({ ...form, sharePct: e.target.value })} />
                <span className="self-center text-muted-foreground">%</span>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="ghost" type="button" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" loading={busy}>Add collaborator</Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {proposed.length > 0 && deal.state === "paid" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-emerald-soft/70 p-4 ring-1 ring-emerald/20">
            <p className="text-caption font-semibold text-emerald-ink">Payouts ready for approval</p>
            <ul className="mt-2 space-y-1 text-caption">
              {proposed.map((p) => {
                const c = collaborators.find((x) => x.id === p.collaboratorId);
                return <li key={p.id} className="flex justify-between"><span>{c?.name}</span><span className="tabular font-semibold">{money(p.amount, p.currency)}</span></li>;
              })}
            </ul>
            <Button
              className="mt-3 w-full"
              loading={busy}
              onClick={() =>
                start(async () => {
                  const res = await sendPayoutsAction(deal.id);
                  if (!res.ok) return void toast.error("Payout not sent", { description: res.error });
                  toast.success(`Sent ${res.count} payout${res.count > 1 ? "s" : ""}`, { description: res.simulated ? "Simulated: Payouts isn't enabled on this PayPal sandbox account yet." : "Via PayPal Payouts." });
                  router.refresh();
                })
              }
            >
              {!busy && <Send />} Approve &amp; send payouts
            </Button>
          </motion.div>
        )}
        {deal.state !== "paid" && collaborators.length > 0 && (
          <p className="text-caption text-muted-foreground">Payouts unlock once {deal.brand} pays.</p>
        )}
      </CardContent>
    </Card>
  );
}
