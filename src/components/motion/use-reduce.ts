"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Like useReducedMotion, but always false on the first render so the server
 * and browser produce identical HTML. Real preference applies after mount.
 */
export function useReduce() {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!prefers;
}
