"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Archive, CalendarDays, FileText, Handshake, Inbox, LayoutDashboard, LogOut, Menu,
  Moon, Settings, ShieldCheck, Sun, X,
} from "lucide-react";
import { cn } from "cn";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review Queue", icon: Inbox, badge: true },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  pending,
  userLabel,
  signOut,
}: {
  pending: number;
  userLabel: string;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" /> DealGuard
        </Link>
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="relative p-2">
          <Menu className="size-5" />
          {pending > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />}
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
            <ShieldCheck className="size-5 text-primary" /> DealGuard
          </Link>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 md:hidden">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                isActive(href) ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {badge && pending > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                  {pending}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t p-2">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60"
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
            <span className="dark:hidden">Dark mode</span>
            <span className="hidden dark:inline">Light mode</span>
          </button>
          <form action={signOut}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60">
              <LogOut className="size-4" />
              <span className="flex-1 truncate text-left">Sign out ({userLabel})</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
