"use client";

import { useReduce } from "@/components/motion/use-reduce";
import { useRef } from "react";
import {
  motion,
  type TargetAndTransition,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Fades + lifts its children in when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const reduce = useReduce();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </Comp>
  );
}

/** Splits a headline into words that rise in one after another. */
export function WordsReveal({
  text,
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
}) {
  const reduce = useReduce();
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span
            className={cn("inline-block", wordClassName)}
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: delay + i * 0.08, ease: EASE_OUT }}
          >
            {w}
            {i < text.split(" ").length - 1 ? String.fromCharCode(160) : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** A card with a soft emerald spotlight that follows the cursor. */
export function SpotlightCard({ className, children, ...props }: HTMLMotionProps<"div">) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const bg = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, var(--glow), transparent 70%)`;
  return (
    <motion.div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-200);
        y.set(-200);
      }}
      className={cn(
        "group/spot relative overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-line/60 dark:ring-line",
        className
      )}
      {...props}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100" style={{ background: bg }} />
      <div className="relative">{children as React.ReactNode}</div>
    </motion.div>
  );
}

/** Pulls gently toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.25, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReduce();
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Slowly drifting emerald/amber light behind a section. */
export function Aurora({ className }: { className?: string }) {
  const reduce = useReduce();
  const blob = (cls: string, anim: TargetAndTransition, duration: number) => (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-full blur-3xl", cls)}
      animate={reduce ? undefined : anim}
      transition={{ duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  );
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {blob("left-[8%] top-[-10%] size-[520px] bg-emerald/25 dark:bg-emerald/20", { x: [0, 80, -40], y: [0, 60, 20], scale: [1, 1.15, 0.95] }, 18)}
      {blob("right-[-6%] top-[10%] size-[440px] bg-emerald-deep/20 dark:bg-emerald-deep/25", { x: [0, -70, 30], y: [0, 40, -30] }, 22)}
      {blob("left-[40%] top-[35%] size-[360px] bg-amber/15 dark:bg-amber/10", { x: [0, 60, -60], y: [0, -40, 30], scale: [0.9, 1.1, 1] }, 26)}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--line)_1px,transparent_1px),linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_at_50%_30%,black_20%,transparent_70%)]" />
    </div>
  );
}

/** Infinite horizontal marquee. */
export function Marquee({ items, className }: { items: React.ReactNode[]; className?: string }) {
  const reduce = useReduce();
  return (
    <div className={cn("relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]", className)}>
      {[0, 1].map((k) => (
        <motion.div
          key={k}
          aria-hidden={k === 1}
          className="flex shrink-0 items-center gap-10 pr-10"
          animate={reduce ? undefined : { x: ["0%", "-100%"] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        >
          {items}
        </motion.div>
      ))}
    </div>
  );
}
