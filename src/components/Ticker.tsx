"use client";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts up to `value` with a spring, using tabular figures. */
export function NumberTicker({ value, format = (n) => Math.round(n).toLocaleString("en-IE"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, format);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) return mv.set(value);
    const a = animate(mv, value, { type: "spring", stiffness: 60, damping: 20, restDelta: 0.01 });
    return () => a.stop();
  }, [inView, value, mv, reduce]);
  return (
    <motion.span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </motion.span>
  );
}

const GLYPHS = "0123456789abcdef";

/** Types a hash in character by character with a short scramble at the cursor. */
export function HashTyper({ text, className, speed = 18 }: { text: string; className?: string; speed?: number }) {
  const [shown, setShown] = useState("");
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return setShown(text);
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i > text.length) return clearInterval(id);
      const scramble = Array.from({ length: Math.min(3, text.length - i) }, () => GLYPHS[(Math.random() * 16) | 0]).join("");
      setShown(text.slice(0, i) + scramble);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduce]);
  return (
    <span className={`font-mono break-all ${className ?? ""}`} aria-label={text}>
      {shown}
    </span>
  );
}

export const shortHash = (h: string, n = 6) => (h.length > n * 2 + 1 ? `${h.slice(0, n)}…${h.slice(-n)}` : h);
