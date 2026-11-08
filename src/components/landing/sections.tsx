"use client";

import { useReduce } from "@/components/motion/use-reduce";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight, BellRing, CheckCircle2, ClipboardPaste, FileCheck2, HandCoins, MousePointerClick, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Logo, ShieldMark } from "@/components/brand/logo";
import { Aurora, Magnetic, Marquee, Reveal, SpotlightCard, WordsReveal, EASE_OUT } from "@/components/motion/primitives";
import { buttonVariants } from "@/components/ui/button";
import { CountdownRing } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { HeroPreview } from "./hero-preview";

export function DemoButton({ size = "lg", className, label = "Try the live demo" }: { size?: "md" | "lg"; className?: string; label?: string }) {
  return (
    <Magnetic>
      <Link
        href="/demo"
        className={cn(
          buttonVariants({ size }),
          "group/cta overflow-hidden shadow-[0_8px_30px_-6px_rgb(18_184_134/0.55)] hover:shadow-[0_10px_40px_-4px_rgb(18_184_134/0.7)]",
          className
        )}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full" />
        {label}
        <ArrowRight className="transition-transform duration-200 group-hover/cta:translate-x-1" />
      </Link>
    </Magnetic>
  );
}

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
    >
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 transition-all duration-300 sm:px-4",
          scrolled ? "bg-surface/75 shadow-soft ring-1 ring-line backdrop-blur-xl" : "bg-transparent"
        )}
      >
        <Link href="/" aria-label="DealGuard home"><Logo animate /></Link>
        <div className="hidden items-center gap-1 md:flex">
          {[["How it works", "#how"], ["Features", "#features"], ["PayPal", "#paypal"]].map(([l, h]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-2 text-caption font-medium text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/demo" className={cn(buttonVariants({ size: "sm" }), "h-9")}>
            Try demo
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const reduce = useReduce();

  return (
    <section ref={ref} className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <Aurora />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        <motion.div style={reduce ? undefined : { y, opacity }}>
          <motion.a
            href="#paypal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="group inline-flex items-center gap-2 rounded-full bg-surface/80 py-1 pr-3 pl-1 text-caption font-medium shadow-soft-sm ring-1 ring-line backdrop-blur"
          >
            <span className="rounded-full bg-emerald px-2 py-0.5 text-micro font-bold tracking-normal text-ink">NEW</span>
            An AI agent for creator brand deals
            <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </motion.a>

          <h1 className="mt-6 font-heading text-[2.75rem] leading-[1.02] font-extrabold tracking-[-0.04em] sm:text-[4rem] lg:text-[4.5rem]">
            <WordsReveal text="Every deal," delay={0.1} />
            <br />
            <span className="relative inline-block">
              <WordsReveal text="guarded." delay={0.3} wordClassName="bg-gradient-to-r from-emerald via-[#3fd9a8] to-emerald-deep bg-clip-text text-transparent" />
              <motion.svg
                viewBox="0 0 300 20"
                className="absolute -bottom-2 left-0 w-full text-emerald"
                aria-hidden
                initial="hidden"
                animate="show"
              >
                <motion.path
                  d="M4 14 C 80 4, 180 4, 296 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.55 }}
                  transition={{ delay: 0.9, duration: 0.8, ease: EASE_OUT }}
                />
              </motion.svg>
            </span>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: EASE_OUT }}
            className="mt-6 max-w-lg text-[1.125rem] leading-relaxed text-muted-foreground"
          >
            Get paid for every post, without the awkward follow-ups. Paste a brand email. DealGuard pulls out the deal,
            sends the PayPal invoice, chases late payers and guards your usage rights.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: EASE_OUT }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <DemoButton />
            <a href="#how" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
              See how it works
            </a>
          </motion.div>

          <motion.ul
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-caption text-muted-foreground"
          >
            {["No credit card", "Sandbox payments only", "You approve every action"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald" aria-hidden /> {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <HeroPreview />
      </div>
    </section>
  );
}

const NICHES = ["Beauty", "Tech reviews", "Fitness", "Food", "Travel", "Gaming", "Finance", "Fashion", "Parenting", "Books", "Music", "Skincare"];

export function NicheStrip() {
  return (
    <section aria-label="Built for creators in every niche" className="border-y border-line/70 bg-surface/50 py-6">
      <p className="mb-4 text-center text-micro font-semibold text-muted-foreground uppercase">Built for creators with 10K–200K followers</p>
      <Marquee
        items={NICHES.map((n) => (
          <span key={n} className="flex items-center gap-3 font-heading text-h3 font-semibold whitespace-nowrap text-foreground/40">
            <ShieldMark className="size-4 text-emerald/60" /> {n}
          </span>
        ))}
      />
    </section>
  );
}

function ChaseIllustration() {
  const reduce = useReduce();
  const tones = [
    { t: "Friendly", c: "bg-emerald-soft text-emerald-ink" },
    { t: "Firm", c: "bg-amber-soft text-amber-ink" },
    { t: "Final", c: "bg-coral-soft text-coral-ink" },
  ];
  return (
    <div className="space-y-2">
      {tones.map((x, i) => (
        <motion.div
          key={x.t}
          initial={reduce ? false : { opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.18, duration: 0.5, ease: EASE_OUT }}
          className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-caption font-medium", x.c)}
          style={{ marginLeft: i * 18 }}
        >
          <BellRing className="size-3.5" aria-hidden /> {x.t} reminder
        </motion.div>
      ))}
    </div>
  );
}

function PaidIllustration() {
  const reduce = useReduce();
  return (
    <div className="flex items-end gap-2" aria-hidden>
      {[38, 52, 30, 64, 46, 78].map((h, i) => (
        <motion.div
          key={i}
          className={cn("w-7 rounded-t-lg", i === 5 ? "bg-emerald" : "bg-emerald/25")}
          initial={reduce ? false : { height: 0 }}
          whileInView={{ height: h }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.08, duration: 0.6, ease: EASE_OUT }}
        />
      ))}
      <motion.span
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 15 }}
        className="mb-16 -ml-6 rounded-full bg-ink px-2 py-0.5 text-micro font-bold tracking-normal text-emerald dark:bg-emerald dark:text-ink"
      >
        PAID
      </motion.span>
    </div>
  );
}

export function Benefits() {
  const items = [
    {
      icon: HandCoins,
      title: "Get paid faster",
      body: "A PayPal invoice with a line for every deliverable goes out the moment you approve. Brands pay with one click.",
      art: <PaidIllustration />,
    },
    {
      icon: BellRing,
      title: "Never chase again",
      body: "The chase agent drafts friendly, then firm, then final reminders, timed to how each brand actually pays.",
      art: <ChaseIllustration />,
    },
    {
      icon: ShieldCheck,
      title: "Protect your content",
      body: "Every usage right gets a countdown. Before it ends, DealGuard pitches a paid renewal for you.",
      art: (
        <div className="flex items-center gap-4">
          <CountdownRing daysLeft={54} totalDays={90} size={76} />
          <CountdownRing daysLeft={5} totalDays={60} size={76} />
        </div>
      ),
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-caption font-semibold text-emerald-ink">Why creators use DealGuard</p>
        <h2 className="mt-2 font-heading text-[2rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-[2.75rem]">
          The money side of creating, handled.
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body, art }, i) => (
          <Reveal key={title} delay={i * 0.1}>
            <SpotlightCard className="h-full p-7" whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <div className="flex h-36 items-center">{art}</div>
              <span className="mt-6 grid size-10 place-items-center rounded-xl bg-emerald-soft text-emerald-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-heading text-h3 font-bold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const steps = [
    { icon: ClipboardPaste, title: "Paste the brand email", body: "Or forward it. The AI pulls out brand, fee, deliverables, due date and usage rights, field by field." },
    { icon: MousePointerClick, title: "Approve the invoice", body: "Check the exact PayPal invoice before anything is sent. Nothing happens without your click." },
    { icon: FileCheck2, title: "DealGuard guards it", body: "It tracks payment, nudges late payers, splits payouts with collaborators and watches your rights." },
  ];
  return (
    <section id="how" className="relative scroll-mt-24 overflow-hidden bg-surface/60 py-24 dark:bg-surface-sunken/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="text-caption font-semibold text-emerald-ink">How it works</p>
          <h2 className="mt-2 font-heading text-[2rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-[2.75rem]">
            Three steps. Then it runs itself.
          </h2>
        </Reveal>
        <div ref={ref} className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* connecting line that draws as you scroll */}
          <div aria-hidden className="absolute top-6 right-[16%] left-[16%] hidden h-[2px] bg-line md:block">
            <motion.div className="h-full origin-left bg-emerald" style={{ scaleX: progress }} />
          </div>
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.15} className="relative text-center md:px-4">
              <div className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-emerald shadow-soft-lg dark:bg-emerald dark:text-ink">
                <Icon className="size-5" aria-hidden />
                <span className="tabular absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-surface text-micro font-bold tracking-normal text-foreground shadow-soft ring-1 ring-line">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-h3 font-bold">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs leading-relaxed text-muted-foreground">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PayPalStrip() {
  const apis = [
    { name: "Invoicing API v2", what: "Itemised invoices, sent and tracked" },
    { name: "Payouts API", what: "Split earnings with collaborators" },
    { name: "Webhooks", what: "Know the second a brand pays" },
  ];
  return (
    <section id="paypal" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
      <Reveal>
        <div className="grid items-center gap-8 rounded-3xl bg-card p-8 shadow-soft ring-1 ring-line/60 sm:p-10 md:grid-cols-[auto_1fr] dark:ring-line">
          <div>
            <p className="text-micro font-semibold text-muted-foreground uppercase">Powered by</p>
            <p className="mt-1 font-heading text-[2rem] font-extrabold tracking-[-0.03em]">PayPal</p>
            <p className="mt-1 text-caption text-muted-foreground">Real invoices. Real payouts. Sandbox in the demo.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {apis.map((a, i) => (
              <Reveal key={a.name} delay={0.1 + i * 0.1}>
                <div className="h-full rounded-2xl bg-canvas p-4 ring-1 ring-line/70 dark:bg-surface-sunken">
                  <CheckCircle2 className="size-4 text-emerald-ink" aria-hidden />
                  <p className="mt-2 font-semibold">{a.name}</p>
                  <p className="mt-0.5 text-caption text-muted-foreground">{a.what}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function FinalCta() {
  const reduce = useReduce();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#0E1116] px-6 py-16 text-center text-[#F2F2EE] sm:py-24">
        <div aria-hidden className="absolute inset-0">
          <motion.div
            className="absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent,rgb(18_184_134/0.35),transparent_40%)] blur-2xl"
            animate={reduce || !mounted ? undefined : { rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0E1116_75%)]" />
        </div>
        <div className="relative">
          <motion.div
            className="mx-auto w-fit"
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <ShieldMark className="size-16 text-emerald drop-shadow-[0_0_30px_rgb(18_184_134/0.6)]" animate />
          </motion.div>
          <h2 className="mx-auto mt-6 max-w-2xl font-heading text-[2.25rem] leading-tight font-extrabold tracking-[-0.03em] sm:text-[3rem]">
            Create. We&apos;ll handle the awkward part.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#9AA1AD]">
            Open a demo account with deals in every state. Takes 30 seconds, no sign-up.
          </p>
          <div className="mt-8 flex justify-center"><DemoButton /></div>
          <p className="mt-6 flex items-center justify-center gap-2 text-caption text-[#9AA1AD]">
            <Sparkles className="size-4 text-emerald" aria-hidden /> Demo mode uses PayPal sandbox. No real money moves.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-caption text-muted-foreground sm:flex-row sm:px-6">
        <Logo className="text-foreground" />
        <p className="flex items-center gap-1.5"><Users className="size-4" aria-hidden /> Made for creators · PayPal AI Hackathon 2026</p>
      </div>
    </footer>
  );
}
