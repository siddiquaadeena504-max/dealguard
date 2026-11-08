import { cn } from "@/lib/utils";

/** Shimmering placeholder used for every page-load state (never a bare spinner). */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-sunken",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent dark:after:via-white/5",
        className
      )}
      {...props}
    />
  );
}

/** Per-field AI confidence: a 3-bar meter plus a word, so it never relies on colour alone. */
export function ConfidenceHint({ value, className }: { value: number; className?: string }) {
  const level = value >= 0.8 ? 3 : value >= 0.5 ? 2 : 1;
  const word = ["", "Check this", "Fairly sure", "Confident"][level];
  const tone = ["", "bg-coral", "bg-amber", "bg-emerald"][level];
  const text = ["", "text-coral-ink", "text-amber-ink", "text-emerald-ink"][level];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-micro font-medium tracking-normal", text, className)}
      title={`AI confidence ${Math.round(value * 100)}%`}
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-[3px] rounded-full", i <= level ? tone : "bg-foreground/15")}
            style={{ height: 4 + i * 3 }}
          />
        ))}
      </span>
      {word}
      <span className="sr-only">({Math.round(value * 100)}% confidence)</span>
    </span>
  );
}

/** Circular countdown for usage rights. */
export function CountdownRing({
  daysLeft,
  totalDays,
  size = 88,
  className,
}: {
  daysLeft: number;
  totalDays: number;
  size?: number;
  className?: string;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = totalDays > 0 ? Math.max(0, Math.min(1, daysLeft / totalDays)) : 0;
  const tone = daysLeft <= 0 ? "text-coral" : daysLeft <= 7 ? "text-amber" : "text-emerald";
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700 ease-out", tone)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tabular text-h3 leading-none font-semibold">{Math.max(0, daysLeft)}</div>
          <div className="mt-1 text-micro text-muted-foreground uppercase">
            {daysLeft <= 0 ? "expired" : daysLeft === 1 ? "day left" : "days left"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-micro font-semibold text-muted-foreground uppercase", className)} {...props} />;
}
