"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CircleDollarSign, Plus, Send, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { Logo, ShieldMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfidenceHint, CountdownRing, SectionLabel, Skeleton } from "@/components/ui/misc";
import { CountUp, CountUpMoney, Money } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { STATUS, StatusPill, type StatusKey } from "@/components/ui/status";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toaster";

const SWATCHES = [
  { name: "Ink", token: "--ink", hex: "#0E1116", use: "Text, dark surfaces" },
  { name: "Canvas", token: "--canvas", hex: "#F7F7F4", use: "Light background" },
  { name: "Surface", token: "--surface", hex: "#FFFFFF / #161A22", use: "Cards" },
  { name: "Guard Emerald", token: "--emerald", hex: "#12B886", use: "Primary, paid" },
  { name: "Deep Emerald", token: "--emerald-deep", hex: "#0B8F68", use: "Hover, pressed" },
  { name: "Signal Amber", token: "--amber", hex: "#F59E0B", use: "Sent, expiring" },
  { name: "Alert Coral", token: "--coral", hex: "#F0525B", use: "Overdue, errors" },
  { name: "Muted Slate", token: "--slate", hex: "#6B7280 / #9AA1AD", use: "Secondary text" },
];

const INK_TOKENS = [
  { name: "Emerald text", cls: "text-emerald-ink", light: "#0A7A57 · 4.97:1" },
  { name: "Amber text", cls: "text-amber-ink", light: "#A85C06 · 5.00:1" },
  { name: "Coral text", cls: "text-coral-ink", light: "#C42F38 · 5.51:1" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <SectionLabel className="mb-4">{title}</SectionLabel>
      {children}
    </section>
  );
}

export default function StylePage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-caption font-medium text-emerald-ink">Design system · v1</p>
          <h1 className="mt-2 text-h1 font-extrabold sm:text-display">Every deal, guarded.</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground">
            Get paid for every post, without the awkward follow-ups. Calm, trustworthy, quietly confident:
            a protective friend who handles the money so creators can create.
          </p>
        </div>

        <Section id="logo" title="Logo">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="grid h-40 place-items-center"><Logo className="text-h3" markClassName="size-9" /></Card>
            <Card className="grid h-40 place-items-center bg-[#0E1116] text-[#F2F2EE] ring-0 dark:bg-emerald dark:text-ink">
              <Logo className="text-h3" markClassName="size-9 text-current" />
            </Card>
            <Card className="flex h-40 items-center justify-center gap-6">
              <ShieldMark className="size-16 text-emerald" title="DealGuard mark" />
              <ShieldMark className="size-8 text-foreground" />
              <span className="grid size-8 place-items-center rounded-md bg-emerald">
                <ShieldMark className="size-6 text-ink" />
              </span>
            </Card>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">
            A geometric shield whose negative space forms a checkmark. Works in one colour; also used as the favicon.
          </p>
        </Section>

        <Section id="colour" title="Colour">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SWATCHES.map((s) => (
              <Card key={s.name} className="overflow-hidden">
                <div className="h-20 ring-1 ring-line/60 ring-inset" style={{ background: s.token === "--surface" ? `var(${s.token})` : s.hex.split(" ")[0] }} />
                <div className="p-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="tabular text-caption text-muted-foreground">{s.hex}</p>
                  <p className="mt-1 text-caption text-muted-foreground">{s.use}</p>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-4 p-5">
            <p className="text-caption text-muted-foreground">
              Text-safe shades (WCAG AA on light backgrounds; dark mode uses the brand colours directly):
            </p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
              {INK_TOKENS.map((t) => (
                <p key={t.name} className={`font-medium ${t.cls}`}>
                  {t.name} <span className="tabular text-caption text-muted-foreground">{t.light}</span>
                </p>
              ))}
            </div>
          </Card>
        </Section>

        <Section id="type" title="Typography">
          <Card className="divide-y divide-line/70">
            {[
              ["Display · Jakarta 800", "text-display font-extrabold", "Get paid faster"],
              ["H1 · Jakarta 800", "text-h1 font-extrabold", "Good morning, Aanya"],
              ["H2 · Jakarta 700", "text-h2 font-bold", "Needs your attention"],
              ["H3 · Jakarta 600", "text-h3 font-semibold", "GlowSkin winter launch"],
              ["Body · Inter 400", "text-body", "We'll nudge GlowSkin two days before the due date, so you don't have to."],
              ["Caption · Inter 500", "text-caption font-medium text-muted-foreground", "Invoice sent 3 days ago"],
            ].map(([name, cls, sample]) => (
              <div key={name} className="grid gap-1 px-6 py-5 sm:grid-cols-[200px_1fr] sm:items-baseline sm:gap-6">
                <p className="text-caption text-muted-foreground">{name}</p>
                <p className={`${cls} ${cls.includes("text-display") || cls.includes("h1") || cls.includes("h2") || cls.includes("h3") ? "font-heading" : ""} min-w-0 break-words`}>
                  {sample}
                </p>
              </div>
            ))}
            <div className="grid gap-1 px-6 py-5 sm:grid-cols-[200px_1fr] sm:items-baseline sm:gap-6">
              <p className="text-caption text-muted-foreground">Money · JetBrains Mono</p>
              <p className="flex flex-wrap gap-x-6 gap-y-1 text-h3">
                <Money amount={150000} currency="INR" />
                <Money amount={1800} currency="USD" />
                <Money amount={950.5} currency="EUR" />
                <span className="tabular text-caption text-muted-foreground self-center">INV-2026-0042</span>
              </p>
            </div>
          </Card>
        </Section>

        <Section id="buttons" title="Buttons">
          <Card className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button><Send /> Send invoice</Button>
              <Button variant="secondary"><Plus /> New deal</Button>
              <Button variant="subtle"><Sparkles /> Draft reminder</Button>
              <Button variant="ghost">Edit</Button>
              <Button variant="danger">Cancel invoice</Button>
              <Button variant="link">View on PayPal <ArrowRight /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Try the live demo <ArrowRight /></Button>
              <Button
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1600);
                }}
              >
                {loading ? "Sending…" : "Click for loading"}
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        <Section id="status" title="Status: colour + icon + label">
          <Card className="flex flex-wrap gap-2.5 p-6">
            {(Object.keys(STATUS) as StatusKey[]).map((k) => (
              <StatusPill key={k} status={k} />
            ))}
          </Card>
        </Section>

        <Section id="numbers" title="Key numbers (count-up + shield glow)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Invoiced" icon={Send} tone="neutral" glow
              value={<CountUpMoney amount={482500} currency="INR" />} hint="6 invoices this month" />
            <StatCard label="Paid" icon={CircleDollarSign} tone="emerald" glow
              value={<CountUpMoney amount={315000} currency="INR" />} hint="+₹45,000 this week" />
            <StatCard label="Overdue" icon={AlertTriangle} tone="coral"
              value={<CountUpMoney amount={72000} currency="INR" />} hint="2 brands, oldest 9 days" />
            <StatCard label="Rights expiring" icon={ShieldAlert} tone="amber"
              value={<CountUp value={3} />} hint="Within the next 7 days" />
          </div>
        </Section>

        <Section id="forms" title="Form fields with AI confidence">
          <Card>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brand">Brand</Label>
                  <ConfidenceHint value={0.95} />
                </div>
                <Input id="brand" defaultValue="GlowSkin" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fee">Fee</Label>
                  <ConfidenceHint value={0.7} />
                </div>
                <Input id="fee" defaultValue="₹1,50,000" className="tabular" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="due">Due date</Label>
                  <ConfidenceHint value={0.35} />
                </div>
                <Input id="due" defaultValue="Not stated in email" aria-invalid />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact email</Label>
                <Input id="contact" placeholder="priya@glowskin.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Brand email</Label>
                <Textarea id="email" placeholder="Paste the brand's email here…" />
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section id="cards" title="Cards, rings and feedback">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>GlowSkin · Winter launch</CardTitle>
                  <CardDescription>1 Instagram Reel, 3 Stories · Net 30</CardDescription>
                </div>
                <StatusPill status="sent" />
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-caption text-muted-foreground">Invoice total</p>
                  <Money amount={150000} currency="INR" className="text-h2 font-semibold" />
                </div>
                <p className="tabular text-caption text-muted-foreground">INV-2026-0042</p>
              </CardContent>
              <CardFooter className="justify-between">
                <p className="flex items-center gap-2 text-caption text-muted-foreground">
                  <Sparkles className="size-4 text-emerald-ink" aria-hidden />
                  GlowSkin usually pays 4 days late. Nudge on 3 Dec.
                </p>
                <Button size="sm" variant="secondary"
                  onClick={() => toast.success("Nudge sent. We'll keep an eye on it.")}>
                  Send nudge
                </Button>
              </CardFooter>
            </Card>
            <Card className="flex items-center justify-around gap-4 p-6">
              <CountdownRing daysLeft={54} totalDays={90} />
              <CountdownRing daysLeft={5} totalDays={60} />
              <CountdownRing daysLeft={0} totalDays={30} />
            </Card>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => toast.success("Invoice sent", { description: "GlowSkin will get it from PayPal in a moment." })}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error("PayPal didn't accept that", { description: "The contact email looks invalid. Fix it and try again." })}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => toast("Reminder drafted", { description: "Have a look before it goes out." })}>
              Info toast
            </Button>
          </div>
        </Section>

        <Section id="states" title="Loading and empty states">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-4 p-6">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-10 w-28 rounded-xl" />
                <Skeleton className="h-10 w-20 rounded-xl" />
              </div>
            </Card>
            <Card>
              <EmptyState art="inbox" title="No deals yet"
                description="Paste a brand email and we'll pull out the terms for you."
                action={<Button size="sm"><Plus /> Add your first deal</Button>} />
            </Card>
            <Card>
              <EmptyState art="shield" title="All guarded"
                description="Nothing needs you right now. Go make something great." />
            </Card>
          </div>
        </Section>

        <Section id="motion" title="Motion (150–250ms, respects reduced motion)">
          <Card className="flex flex-wrap items-center gap-6 p-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 rounded-xl bg-emerald-soft px-4 py-3 text-emerald-ink"
            >
              <Wallet className="size-4" aria-hidden /> Fields animate in one by one as they&apos;re extracted
            </motion.div>
          </Card>
        </Section>
      </main>
    </div>
  );
}
