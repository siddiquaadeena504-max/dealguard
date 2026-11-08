import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

const ICON_TONE = {
  emerald: "bg-emerald-soft text-emerald-ink",
  amber: "bg-amber-soft text-amber-ink",
  coral: "bg-coral-soft text-coral-ink",
  neutral: "bg-surface-sunken text-foreground/70",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  glow,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONE;
  glow?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", ICON_TONE[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className={cn("mt-4 inline-block font-heading text-h2 font-bold sm:text-[1.875rem]", glow && "shield-glow")}>
        {value}
      </div>
      {hint && <p className="mt-1.5 text-caption text-muted-foreground">{hint}</p>}
    </Card>
  );
}
