"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FlaskConical, LayoutDashboard, Plus, Repeat, RotateCcw, Settings, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PaletteButton } from "./command-palette";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/new", label: "New deal", icon: Plus },
  { href: "/app/payouts", label: "Payouts", icon: Wallet },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/subscriptions", label: "Subscriptions", icon: Repeat },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/app" ? path === "/app" || path.startsWith("/app/deals") : path.startsWith(href));
}

export function DemoBanner({ simulated }: { simulated: boolean }) {
  return (
    <div className="relative z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-caption text-[#F2F2EE] dark:bg-surface-raised">
      <FlaskConical className="size-3.5 text-emerald" aria-hidden />
      <span>
        <span className="font-semibold">Demo mode:</span> sandbox payments only
        {simulated && <span className="hidden text-[#9AA1AD] sm:inline"> · PayPal simulated until keys are added</span>}
      </span>
      <Link href="/demo" prefetch={false} className="ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-emerald hover:bg-white/10">
        <RotateCcw className="size-3" aria-hidden /> Reset demo
      </Link>
    </div>
  );
}

export function Sidebar({ name, niche, banner }: { name: string; niche: string | null; banner?: boolean }) {
  const isActive = useActive();
  return (
    <aside className={cn("sticky top-0 hidden w-64 shrink-0 flex-col border-r border-line/70 bg-surface/60 px-4 py-5 backdrop-blur-xl md:flex", banner ? "h-[calc(100dvh-2.25rem)]" : "h-dvh")}>
      <Link href="/" className="px-2"><Logo /></Link>
      <PaletteButton className="mt-6" />
      <nav className="mt-4 space-y-1" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.875rem] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-surface shadow-soft-sm ring-1 ring-line dark:bg-surface-raised"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className={cn("relative size-4", active && "text-emerald-ink")} aria-hidden />
              <span className="relative">{label}</span>
              {href === "/app/new" && (
                <kbd className="relative ml-auto rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">N</kbd>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-4">
        <div className="rounded-2xl bg-canvas p-3 ring-1 ring-line/70 dark:bg-surface-sunken">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald to-emerald-deep font-heading font-bold text-ink">
              {name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-caption text-muted-foreground">{niche ?? "Creator"}</p>
            </div>
          </div>
        </div>
        <ThemeToggle className="flex w-full [&_button]:flex-1 [&_button]:justify-center [&_button]:px-1.5" />
      </div>
    </aside>
  );
}

/** Phone navigation: a floating bottom bar with a raised "New deal" button. */
export function BottomNav() {
  const isActive = useActive();
  const items = [NAV[0], NAV[2], NAV[1], NAV[3]];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-2xl bg-surface/85 px-2 shadow-soft-lg ring-1 ring-line backdrop-blur-xl md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        if (href === "/app/new")
          return (
            <Link key={href} href={href} aria-label="New deal" className="-mt-8 grid size-14 place-items-center rounded-2xl bg-emerald text-ink shadow-[0_10px_30px_-6px_rgb(18_184_134/0.6)] transition-transform active:scale-95">
              <Plus className="size-6" aria-hidden />
            </Link>
          );
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("relative flex w-16 flex-col items-center gap-1 py-1 text-[0.65rem] font-medium", active ? "text-emerald-ink" : "text-muted-foreground")}>
            {active && <motion.span layoutId="bnav-dot" className="absolute -top-1 h-1 w-6 rounded-full bg-emerald" />}
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-canvas/80 px-4 backdrop-blur-xl md:hidden">
      <Link href="/"><Logo /></Link>
      <ThemeToggle />
    </header>
  );
}
