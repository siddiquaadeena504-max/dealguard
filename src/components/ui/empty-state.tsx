import { cn } from "@/lib/utils";

/** Micro-illustrations built from simple shapes in brand colours. */
const ART = {
  inbox: (
    <svg viewBox="0 0 120 96" className="h-24 w-auto" aria-hidden>
      <rect x="18" y="30" width="84" height="54" rx="12" className="fill-surface-sunken" />
      <path d="M18 56h24l6 10h24l6-10h24" className="fill-none stroke-foreground/20" strokeWidth="3" strokeLinejoin="round" />
      <rect x="34" y="10" width="52" height="34" rx="8" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="42" y="19" width="28" height="4" rx="2" className="fill-emerald" />
      <rect x="42" y="28" width="20" height="4" rx="2" className="fill-foreground/15" />
      <circle cx="96" cy="22" r="7" className="fill-emerald/25" />
      <circle cx="96" cy="22" r="3" className="fill-emerald" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 120 96" className="h-24 w-auto" aria-hidden>
      <circle cx="60" cy="50" r="38" className="fill-emerald-soft" />
      <path d="M60 18l24 9v19c0 15-11 27-24 32-13-5-24-17-24-32V27z" className="fill-surface stroke-emerald" strokeWidth="3" strokeLinejoin="round" />
      <path d="M49 49l8 8 15-15" className="fill-none stroke-emerald" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="24" r="4" className="fill-amber/60" />
      <circle cx="100" cy="74" r="5" className="fill-emerald/40" />
    </svg>
  ),
  coins: (
    <svg viewBox="0 0 120 96" className="h-24 w-auto" aria-hidden>
      <ellipse cx="50" cy="70" rx="26" ry="9" className="fill-foreground/10" />
      <rect x="24" y="44" width="52" height="26" rx="0" className="fill-emerald/30" />
      <ellipse cx="50" cy="44" rx="26" ry="9" className="fill-emerald" />
      <ellipse cx="50" cy="44" rx="14" ry="4" className="fill-emerald-deep/60" />
      <circle cx="88" cy="36" r="16" className="fill-surface stroke-amber" strokeWidth="3" />
      <path d="M88 28v16M82 34h12" className="stroke-amber" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 120 96" className="h-24 w-auto" aria-hidden>
      <rect x="22" y="18" width="76" height="64" rx="12" className="fill-surface stroke-line" strokeWidth="2" />
      <rect x="22" y="18" width="76" height="16" rx="8" className="fill-emerald" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => (
          <rect key={`${c}-${r}`} x={32 + c * 15} y={42 + r * 12} width="9" height="7" rx="2"
            className={c === 2 && r === 1 ? "fill-amber" : "fill-foreground/10"} />
        ))
      )}
    </svg>
  ),
} as const;

export function EmptyState({
  art = "inbox",
  title,
  description,
  action,
  className,
}: {
  art?: keyof typeof ART;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {ART[art]}
      <h3 className="mt-5 font-heading text-h3 font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
