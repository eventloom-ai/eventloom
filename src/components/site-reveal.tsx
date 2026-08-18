"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

export function SiteReveal({
  children,
  motion: mode,
  index = 0,
  style,
}: {
  children: ReactNode;
  motion: "none" | "subtle" | "expressive";
  index?: number;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  if (mode === "none" || reduce) return <div style={style}>{children}</div>;

  const distance = mode === "expressive" ? 28 : 14;
  const duration = mode === "expressive" ? 0.7 : 0.5;
  const stagger = mode === "expressive" ? 0.08 : 0.05;

  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay: Math.min(index * stagger, 0.4), ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
