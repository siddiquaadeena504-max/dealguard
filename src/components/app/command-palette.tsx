"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Handshake, LayoutDashboard, Moon, Plus, RotateCcw, Search, Settings, Sun, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type PaletteDeal = { id: string; brand: string; title: string };

export function CommandPalette({ deals }: { deals: PaletteDeal[] }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (!typing && !open && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") {
        router.push("/app/new");
      } else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("dg:palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("dg:palette", onOpen);
    };
  }, [open, router]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const item = "flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[0.875rem] data-[selected=true]:bg-surface-sunken data-[selected=true]:text-foreground text-foreground/85";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-surface-raised shadow-soft-lg ring-1 ring-line"
          >
            <Command label="Command palette" loop>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="size-4 text-muted-foreground" aria-hidden />
                <Command.Input autoFocus placeholder="Search deals or jump to…" className="h-14 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted-foreground" />
                <kbd className="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">ESC</kbd>
              </div>
              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-caption text-muted-foreground">Nothing matches. Try a brand name.</Command.Empty>
                <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase">
                  <Command.Item className={item} onSelect={() => run(() => router.push("/app/new"))}><Plus className="size-4 text-emerald-ink" /> New deal from email <kbd className="ml-auto font-mono text-[0.65rem] text-muted-foreground">N</kbd></Command.Item>
                  <Command.Item className={item} onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
                    {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />} Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
                  </Command.Item>
                  <Command.Item className={item} onSelect={() => run(() => (window.location.href = "/demo"))}><RotateCcw className="size-4" /> Reset demo</Command.Item>
                </Command.Group>
                <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase">
                  {[["/app", "Dashboard", LayoutDashboard], ["/app/payouts", "Payouts", Wallet], ["/app/settings", "Settings", Settings]].map(([href, label, Icon]) => {
                    const I = Icon as typeof Wallet;
                    return <Command.Item key={href as string} className={item} onSelect={() => run(() => router.push(href as string))}><I className="size-4" /> {label as string}</Command.Item>;
                  })}
                </Command.Group>
                {deals.length > 0 && (
                  <Command.Group heading="Deals" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase">
                    {deals.map((d) => (
                      <Command.Item key={d.id} value={`${d.brand} ${d.title}`} className={item} onSelect={() => run(() => router.push(`/app/deals/${d.id}`))}>
                        <Handshake className="size-4" /> <span className="font-medium">{d.brand}</span> <span className="truncate text-muted-foreground">{d.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PaletteButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("dg:palette"))}
      className={cn("flex h-10 w-full items-center gap-2 rounded-xl bg-surface-sunken px-3 text-caption text-muted-foreground transition-colors hover:text-foreground", className)}
    >
      <Search className="size-4" aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[0.65rem] dark:bg-surface-raised">Ctrl K</kbd>
    </button>
  );
}
