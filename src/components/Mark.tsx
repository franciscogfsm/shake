"use client";
import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useId } from "react";

// Both halves share one seam, so closed = a perfect coin (see docs/design-system.md).
const SEAM = "V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z";
export const LEFT = `M12 2A10 10 0 0 0 12 22${SEAM}`;
export const RIGHT = `M12 2A10 10 0 0 1 12 22${SEAM}`;

export type MarkState = "rest" | "open" | "shut";
const OFFSET: Record<MarkState, number> = { rest: 0.6, open: 2.6, shut: 0 };

export const springs = {
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  slam: { type: "spring", stiffness: 700, damping: 18, mass: 0.8 },
} as const;

type Props = {
  size?: number;
  state?: MarkState;
  /** 0..1 drives the halves apart continuously (hold-to-shake tension); overrides `state` while set. */
  tension?: MotionValue<number>;
  assemble?: boolean;
  className?: string;
  title?: string;
};

export function Mark({ size = 28, state = "rest", tension, assemble, className, title }: Props) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const off = OFFSET[state];
  const zero = useMotionValue(0);
  const t = tension ?? zero;
  // At rest the halves share the seam (a hair of overlap so the join doesn't show a gap). Holding pulls them apart.
  const fromTensionL = useTransform(t, [0, 1], [0.2, -2.6]);
  const fromTensionR = useTransform(t, [0, 1], [-0.2, 2.6]);
  const scale = useTransform(t, [0, 1], [1, 0.92]);
  const shut = state === "shut";
  const transition = shut ? springs.slam : springs.snappy;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ overflow: "visible", scale: tension ? scale : undefined }}
      animate={shut && !reduce ? { scale: [0.92, 1.09, 0.98, 1.015, 1], rotate: [0, -4, 2.5, -1, 0] } : undefined}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <defs>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#cfd3da" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfe6ff" stopOpacity=".85" />
          <stop offset=".55" stopColor="#8fd3ff" stopOpacity=".5" />
          <stop offset="1" stopColor="#8fd3ff" stopOpacity=".72" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset=".5" stopColor="#8fd3ff" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff" stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={`sh${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <motion.path
        d={LEFT}
        fill={`url(#s${id})`}
        initial={assemble && !reduce ? { x: -6, opacity: 0 } : false}
        animate={tension ? undefined : { x: -off, opacity: 1 }}
        style={tension ? { x: fromTensionL } : undefined}
        transition={assemble ? { ...springs.slam, delay: 0.1 } : transition}
      />
      <motion.g
        initial={assemble && !reduce ? { x: 6, opacity: 0 } : false}
        animate={tension ? undefined : { x: off, opacity: 1 }}
        style={tension ? { x: fromTensionR } : undefined}
        transition={assemble ? { ...springs.slam, delay: 0.1 } : transition}
      >
        <path d={RIGHT} fill={`url(#g${id})`} />
        <path d="M12 2.3A9.7 9.7 0 0 1 12 21.7" fill="none" stroke={`url(#r${id})`} strokeWidth=".6" />
      </motion.g>
      <motion.circle
        cx="12"
        cy="12"
        r="9.8"
        fill="none"
        stroke={`url(#r${id})`}
        strokeWidth=".45"
        initial={false}
        animate={{ opacity: shut ? 1 : 0 }}
        transition={{ duration: 0.25, delay: shut ? 0.12 : 0 }}
      />
      {shut && !reduce && (
        <g clipPath={`url(#c${id})`}>
          <g transform="rotate(22 12 12)">
            <motion.rect
              x="-10"
              y="-4"
              width="5"
              height="32"
              fill={`url(#sh${id})`}
              initial={{ x: -10, opacity: 1 }}
              animate={{ x: 34, opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.6, 0.3, 1] }}
            />
          </g>
        </g>
      )}
    </motion.svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display text-[13px] font-bold tracking-[0.24em] text-ink">
      <Mark size={size} assemble title="SHAKE" />
      SHAKE
    </span>
  );
}
