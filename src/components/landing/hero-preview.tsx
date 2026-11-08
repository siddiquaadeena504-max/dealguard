"use client";

import { useReduce } from "@/components/motion/use-reduce";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCircle2, FileText, Mail, Send, Sparkles } from "lucide-react";
import { ShieldMark } from "@/components/brand/logo";
import { Confetti, ShieldPulse } from "@/components/motion/confetti";
import { CountdownRing } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Email in", icon: Mail },
  { label: "AI extracts", icon: Sparkles },
  { label: "Invoice sent", icon: Send },
  { label: "Paid", icon: CheckCircle2 },
] as const;

const FIELDS = [
  { k: "Brand", v: "GlowSkin", c: 3 },
  { k: "Fee", v: "₹1,50,000", c: 3, mono: true },
  { k: "Deliverables", v: "1 Reel · 3 Stories", c: 3 },
  { k: "Due", v: "5 Dec · Net 30", c: 2 },
  { k: "Usage rights", v: "90 days, paid ads", c: 2 },
];

const EMAIL_LINES = [
  "Hi Aanya! Loved your winter skincare series.",
  "We'd like 1 Reel + 3 Stories for our launch,",
  "₹1,50,000, posting by 5 Dec. Payment net 30.",
  "Usage: 90 days on paid ads. Excited? 🌿",
];

const ease = [0.16, 1, 0.3, 1] as const;

function Bars({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("w-[3px] rounded-full", i <= level ? (level === 3 ? "bg-emerald" : "bg-amber") : "bg-foreground/15")} style={{ height: 3 + i * 3 }} />
      ))}
    </span>
  );
}

export function HeroPreview() {
  const reduce = useReduce();
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduce) {
      setStep(3); // reduced motion: show the finished state, no loop
      return;
    }
    const durations = [2200, 3200, 2400, 3400];
    const t = setTimeout(() => {
      setStep((s) => {
        if (s === 3) setCycle((c) => c + 1);
        return (s + 1) % 4;
      });
    }, durations[step]);
    return () => clearTimeout(t);
  }, [step, reduce]);

  return (
    <div className="relative">
      {/* Floating satellites (desktop only) */}
      <motion.div
        className="absolute -top-12 -left-14 z-20 hidden w-52 rounded-2xl bg-surface-raised p-3.5 shadow-soft-lg ring-1 ring-line lg:block"
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3">
          <CountdownRing daysLeft={5} totalDays={60} size={52} className="[&_.text-h3]:text-[0.9rem] [&_.text-micro]:hidden" />
          <div>
            <p className="text-caption font-semibold">Rights expiring</p>
            <p className="text-micro tracking-normal text-muted-foreground">Nykaa · renew for ₹40k?</p>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="absolute -right-10 -bottom-14 z-20 hidden w-60 rounded-2xl bg-surface-raised p-3.5 shadow-soft-lg ring-1 ring-line lg:block"
        animate={reduce ? undefined : { y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-soft text-emerald-ink"><Bell className="size-4" /></span>
          <div>
            <p className="text-caption font-semibold">Nudge sent</p>
            <p className="text-micro leading-snug tracking-normal text-muted-foreground">Friendly reminder to Boat Audio. We&apos;ll keep an eye on it.</p>
          </div>
        </div>
      </motion.div>

      {/* App window */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.4, ease }}
        style={{ transformPerspective: 1400 }}
        className="relative overflow-hidden rounded-3xl bg-surface/80 shadow-soft-lg ring-1 ring-line backdrop-blur-xl"
      >
        {/* window chrome + step tracker */}
        <div className="flex items-center gap-3 border-b border-line/80 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-coral/70" />
            <span className="size-2.5 rounded-full bg-amber/70" />
            <span className="size-2.5 rounded-full bg-emerald/70" />
          </div>
          <div className="mx-auto flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.label} className="flex items-center gap-1 sm:gap-2">
                  <motion.span
                    className={cn(
                      "relative flex h-7 items-center gap-1.5 rounded-full px-2 text-micro font-semibold tracking-normal transition-colors duration-300 sm:px-2.5",
                      active ? "text-ink" : done ? "text-emerald-ink" : "text-muted-foreground"
                    )}
                  >
                    {active && (
                      <motion.span layoutId="step-pill" className="absolute inset-0 rounded-full bg-emerald" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                    )}
                    <Icon className="relative size-3.5" aria-hidden />
                    <span className={cn("relative whitespace-nowrap", !active && "hidden xl:inline")}>{s.label}</span>
                  </motion.span>
                  {i < 3 && <span className={cn("h-px w-3 transition-colors duration-500 sm:w-5", done ? "bg-emerald" : "bg-line")} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1.05fr_1fr] sm:p-5">
          {/* Email */}
          <div className="relative overflow-hidden rounded-2xl bg-canvas p-4 ring-1 ring-line/70">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-pink-300 to-amber-200 text-caption font-bold text-ink">G</span>
              <div className="min-w-0">
                <p className="text-caption font-semibold">Priya · GlowSkin</p>
                <p className="truncate text-micro tracking-normal text-muted-foreground">Paid partnership: winter launch ✨</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[0.8rem] leading-relaxed text-foreground/80">
              {EMAIL_LINES.map((line, i) => (
                <motion.p
                  key={`${cycle}-${i}`}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.25, duration: 0.4, ease }}
                >
                  {line}
                </motion.p>
              ))}
            </div>
            {/* scanning beam */}
            <AnimatePresence>
              {step === 1 && (
                <motion.div
                  aria-hidden
                  className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-emerald/25 to-transparent"
                  initial={{ top: "-20%" }}
                  animate={{ top: ["-20%", "100%"] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, ease: "easeInOut", repeat: 1 }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Deal / invoice panel */}
          <div className="relative min-h-[244px] rounded-2xl bg-surface p-4 ring-1 ring-line/70 dark:bg-surface-raised">
            <AnimatePresence mode="wait">
              {step <= 1 ? (
                <motion.div key="extract" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <p className="flex items-center gap-1.5 text-micro font-semibold text-emerald-ink uppercase">
                    <Sparkles className="size-3" aria-hidden /> {step === 0 ? "Waiting for email" : "Extracting deal"}
                  </p>
                  <div className="mt-3 space-y-2">
                    {FIELDS.map((f, i) => (
                      <motion.div
                        key={`${cycle}-${f.k}`}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={step === 1 || reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.25, y: 0, scale: 1 }}
                        transition={{ delay: step === 1 ? 0.3 + i * 0.45 : 0, duration: 0.4, ease }}
                        className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 dark:bg-surface-sunken"
                      >
                        <span className="text-micro tracking-normal text-muted-foreground">{f.k}</span>
                        {step === 1 || reduce ? (
                          <span className="flex items-center gap-2">
                            <span className={cn("text-caption font-semibold", f.mono && "tabular")}>{f.v}</span>
                            <Bars level={f.c} />
                          </span>
                        ) : (
                          <span className="h-2.5 w-20 rounded-full bg-foreground/10" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="invoice"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="flex h-full flex-col"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="flex items-center gap-1.5 text-micro font-semibold text-muted-foreground uppercase">
                        <FileText className="size-3" aria-hidden /> Invoice
                      </p>
                      <p className="tabular mt-1 text-micro tracking-normal text-muted-foreground">INV-2026-0042</p>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.span key={step} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                        <StatusPill status={step === 3 ? "paid" : "sent"} size="sm" />
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="mt-4 space-y-2 text-caption">
                    <div className="flex justify-between"><span className="text-muted-foreground">1 Instagram Reel</span><span className="tabular">₹1,00,000</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">3 Instagram Stories</span><span className="tabular">₹50,000</span></div>
                    <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span className="tabular">₹1,50,000</span></div>
                  </div>
                  <div className="relative mt-auto grid place-items-center pt-6">
                    {step === 3 ? (
                      <div className="relative flex flex-col items-center">
                        <ShieldPulse key={`p${cycle}`} />
                        <Confetti key={`c${cycle}`} />
                        <motion.div initial={{ scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                          <ShieldMark className="size-12 text-emerald" />
                        </motion.div>
                        <p className="mt-2 text-caption font-semibold text-emerald-ink">Paid in 6 days. No chasing.</p>
                      </div>
                    ) : (
                      <div className="flex w-full items-center gap-2 rounded-xl bg-amber-soft px-3 py-2.5 text-caption text-amber-ink">
                        <motion.span animate={reduce ? undefined : { x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                          <Send className="size-3.5" aria-hidden />
                        </motion.span>
                        Sent via PayPal · watching for payment
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
