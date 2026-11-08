import { AlertTriangle, CheckCircle2, CircleDashed, Clock, FileText, Send, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** Every status is shown with colour AND an icon AND a label, never colour alone. */
export const STATUS = {
  new: { label: "New", icon: Sparkles, tone: "neutral" },
  draft: { label: "Draft", icon: FileText, tone: "neutral" },
  awaiting_approval: { label: "Needs approval", icon: CircleDashed, tone: "amber" },
  sent: { label: "Sent", icon: Send, tone: "amber" },
  pending: { label: "Pending", icon: Clock, tone: "amber" },
  paid: { label: "Paid", icon: CheckCircle2, tone: "emerald" },
  overdue: { label: "Overdue", icon: AlertTriangle, tone: "coral" },
  expiring: { label: "Rights expiring", icon: ShieldAlert, tone: "amber" },
  expired: { label: "Rights expired", icon: ShieldAlert, tone: "coral" },
  payout_sent: { label: "Payout sent", icon: Wallet, tone: "emerald" },
  failed: { label: "Failed", icon: AlertTriangle, tone: "coral" },
} as const;

export type StatusKey = keyof typeof STATUS;

const TONE = {
  neutral: "bg-surface-sunken text-foreground/80 ring-line",
  emerald: "bg-emerald-soft text-emerald-ink ring-emerald/20",
  amber: "bg-amber-soft text-amber-ink ring-amber/25",
  coral: "bg-coral-soft text-coral-ink ring-coral/25",
} as const;

export function StatusPill({
  status,
  label,
  size = "md",
  className,
}: {
  status: StatusKey;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset",
        size === "sm" ? "h-6 px-2 text-micro tracking-normal" : "h-7 px-2.5 text-caption",
        TONE[s.tone],
        className
      )}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden strokeWidth={2.25} />
      {label ?? s.label}
    </span>
  );
}

export function toneClass(tone: keyof typeof TONE) {
  return TONE[tone];
}
