"use client";

import { useReduce } from "@/components/motion/use-reduce";
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
  The DealGuard mark: a soft, curved-top shield. The checkmark is cut out of it as negative
  space, and its long stroke breaks out through the top-right edge: "approved, and out the door".
  Built with a mask so it renders in one colour (currentColor).
*/
export const SHIELD_D =
  "M20 2.6c4.3 2.6 9 4 14.2 4.4.4 1.9.5 3.9.5 6v6c0 8.8-5.9 15.2-14.7 18.5C11.2 34.2 5.3 27.8 5.3 19v-6c0-2.1.1-4.1.5-6C11 6.6 15.7 5.2 20 2.6z";
export const CHECK_D = "M12.4 20.2l5.8 5.8L37.5 6.5";

export function ShieldMark({
  className,
  title,
  animate = false,
}: {
  className?: string;
  title?: string;
  /** Draws the check on mount (used in the hero and loaders). */
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const reduce = useReduce();
  const draw = animate && !reduce;
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-6 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
          <rect width="40" height="40" fill="white" />
          <motion.path
            d={CHECK_D}
            fill="none"
            stroke="black"
            strokeWidth={4.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={draw ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
          />
        </mask>
      </defs>
      <motion.path
        d={SHIELD_D}
        fill="currentColor"
        mask={`url(#m${id})`}
        initial={draw ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        style={{ transformOrigin: "50% 50%" }}
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
  animate,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  animate?: boolean;
}) {
  return (
    <span
      className={cn(
        "group/logo inline-flex items-center gap-2 font-heading text-[1.1875rem] leading-none tracking-[-0.03em]",
        className
      )}
    >
      <ShieldMark
        animate={animate}
        className={cn(
          "size-8 text-emerald transition-transform duration-300 ease-out group-hover/logo:-rotate-6 group-hover/logo:scale-105",
          markClassName
        )}
        title={showWordmark ? undefined : "DealGuard"}
      />
      {showWordmark && (
        <span>
          <span className="font-medium">Deal</span>
          <span className="font-extrabold">Guard</span>
        </span>
      )}
    </span>
  );
}
