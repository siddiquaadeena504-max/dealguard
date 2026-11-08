import { cn } from "@/lib/utils";

/** Shield outline with the checkmark cut out as negative space (even-odd fill). One color: currentColor. */
export const SHIELD_PATH =
  "M16 2 27 6v9c0 7-5 12.5-11 15C10 27.5 5 22 5 15V6z" +
  "M9.6 16.9l2.1-2.1 2.8 2.8 5.8-5.8 2.1 2.1-7.9 7.9z";

export function ShieldMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={SHIELD_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-heading text-[1.125rem] leading-none tracking-[-0.02em]", className)}>
      <ShieldMark className={cn("size-7 text-emerald", markClassName)} title={showWordmark ? undefined : "DealGuard"} />
      {showWordmark && (
        <span>
          <span className="font-medium">Deal</span>
          <span className="font-bold">Guard</span>
        </span>
      )}
    </span>
  );
}
