"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { springs } from "./Mark";

type Variant = "solid" | "glass" | "ghost" | "danger";
type Props = HTMLMotionProps<"button"> & { variant?: Variant; loading?: boolean; full?: boolean };

const styles: Record<Variant, string> = {
  solid: "bg-safe text-on-safe shadow-[0_12px_40px_-12px_rgba(143,211,255,.65)]",
  glass: "glass text-ink",
  ghost: "text-ink-2 hover:text-ink",
  danger: "glass glass-danger text-ink",
};

export function Button({ variant = "solid", loading, full, className = "", children, disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      whileHover={disabled || loading ? undefined : { scale: 1.015 }}
      transition={springs.snappy}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex h-14 min-w-[44px] items-center justify-center gap-2 rounded-full px-7 font-display text-[17px] font-medium tracking-[-0.01em] transition-opacity disabled:opacity-45 ${
        full ? "w-full" : ""
      } ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Dots /> : (children as React.ReactNode)}
    </motion.button>
  );
}

export function Dots() {
  return (
    <span className="inline-flex gap-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
