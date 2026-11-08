"use client";

import { useReduce } from "@/components/motion/use-reduce";
import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({
  amount,
  currency,
  compact,
  className,
}: {
  amount: number | null | undefined;
  currency?: string;
  compact?: boolean;
  className?: string;
}) {
  return <span className={cn("tabular", className)}>{money(amount, currency, { compact })}</span>;
}

/** Counts up from 0 when it scrolls into view. Respects reduced motion. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReduce();
  // Always start at 0 so server and browser render the same text.
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular", className)} aria-label={format(value)}>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}

export function CountUpMoney({ amount, currency, className }: { amount: number; currency?: string; className?: string }) {
  return <CountUp value={amount} format={(n) => money(Math.round(n), currency)} className={className} />;
}
