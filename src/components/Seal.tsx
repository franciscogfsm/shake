"use client";
import { motion, useReducedMotion } from "motion/react";

/** The finality seal that stamps in after a release or refund. */
export function Seal({ label = "Released", sub = "Final · on Stellar", tone = "safe" }: { label?: string; sub?: string; tone?: "safe" | "mute" }) {
  const reduce = useReducedMotion();
  const color = tone === "safe" ? "var(--safe)" : "var(--ink-2)";
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ type: "spring", stiffness: 520, damping: 22, delay: 0.35 }}
      className="inline-grid size-28 place-items-center rounded-full text-center"
      style={{ border: `1.5px solid ${color}`, color, boxShadow: `0 0 0 5px rgba(0,0,0,0), inset 0 0 0 5px rgba(0,0,0,0), 0 0 30px -8px ${color}` }}
      role="img"
      aria-label={`${label}. ${sub}`}
    >
      <div className="grid size-[100px] place-items-center rounded-full border border-dashed" style={{ borderColor: color }}>
        <div>
          <div className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">{label}</div>
          <div className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] opacity-80">{sub}</div>
        </div>
      </div>
    </motion.div>
  );
}
