"use client";

import { useReduce } from "@/components/motion/use-reduce";
import { motion } from "framer-motion";

// Deterministic pseudo-random so server and client agree.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const COLORS = ["var(--emerald)", "var(--emerald-deep)", "var(--amber)", "#7CE3C3"];

/** A brief emerald burst from the centre of its parent. Mount it to fire. */
export function Confetti({ count = 26, spread = 150 }: { count?: number; spread?: number }) {
  const reduce = useReduce();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible">
      {Array.from({ length: count }, (_, i) => {
        const angle = rand(i, 1) * Math.PI * 2;
        const dist = spread * (0.45 + rand(i, 2) * 0.55);
        const w = 4 + rand(i, 3) * 5;
        return (
          <motion.span
            key={i}
            className="absolute rounded-[2px]"
            style={{ width: w, height: w * (rand(i, 4) > 0.5 ? 2.2 : 1), background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 40,
              opacity: 0,
              rotate: rand(i, 5) * 540 - 270,
              scale: 1,
            }}
            transition={{ duration: 1.1 + rand(i, 6) * 0.5, ease: [0.2, 0.7, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

/** Concentric emerald rings expanding out of a shield (the "shield pulse"). */
export function ShieldPulse() {
  const reduce = useReduce();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute size-16 rounded-full border-2 border-emerald"
          initial={{ scale: 0.6, opacity: 0.7 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1.4, delay: i * 0.22, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
