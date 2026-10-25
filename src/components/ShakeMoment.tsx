"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SEAM = "V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z";
const LEFT = `M12 2A10 10 0 0 0 12 22${SEAM}`;
const RIGHT = `M12 2A10 10 0 0 1 12 22${SEAM}`;

/**
 * The signature moment, on both phones: the buyer's half and the seller's half fly in from
 * opposite edges and slam shut as one coin. Haptic + light burst + screen kick, then it gets out of the way.
 */
export function ShakeMoment({ play, onDone }: { play: boolean; onDone?: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "hit" | "out" | "gone">(play ? "in" : "gone");
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!play) return;
    setPhase("in");
    const t1 = setTimeout(() => {
      setPhase("hit");
      navigator.vibrate?.([35, 40, 70]);
    }, reduce ? 0 : 520);
    const t2 = setTimeout(() => setPhase("out"), reduce ? 300 : 1500);
    const t3 = setTimeout(() => {
      setPhase("gone");
      done.current?.();
    }, reduce ? 500 : 2000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [play, reduce]);

  const size = "min(62vw, 300px)";
  return (
    <AnimatePresence>
      {phase !== "gone" && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center overflow-hidden"
          style={{ background: "radial-gradient(60% 45% at 50% 50%, rgba(80,140,255,.22), transparent 70%), #0d0f12" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === "out" ? 0 : 1, x: phase === "hit" && !reduce ? [0, -10, 9, -6, 4, 0] : 0 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.45 }, x: { duration: 0.32 } }}
          aria-live="assertive"
          role="status"
        >
          <span className="sr-only">Shaken. The money is released.</span>
          {/* flash */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(143,211,255,.75), rgba(143,211,255,.12) 40%, transparent 70%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "hit" ? [0, 1, 0.25] : 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          {/* rings */}
          {phase === "hit" &&
            [0, 0.12, 0.24].map((d, i) => (
              <motion.div
                key={i}
                className="pointer-events-none absolute rounded-full border"
                style={{ width: size, height: size, borderColor: i === 1 ? "rgba(255,255,255,.55)" : "rgba(143,211,255,.9)" }}
                initial={{ opacity: 0.9, scale: 0.8 }}
                animate={{ opacity: 0, scale: 2.6 + i * 0.4 }}
                transition={{ duration: 1, delay: d, ease: "easeOut" }}
              />
            ))}
          <div className="relative" style={{ width: size, height: size }}>
            <Half d={LEFT} from={-1} hit={phase !== "in"} reduce={!!reduce} fill="url(#sm-solid)" />
            <Half d={RIGHT} from={1} hit={phase !== "in"} reduce={!!reduce} fill="url(#sm-glass)" rim />
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="sm-solid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="1" stopColor="#cfd3da" />
                </linearGradient>
                <linearGradient id="sm-glass" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#bfe6ff" stopOpacity=".9" />
                  <stop offset=".55" stopColor="#8fd3ff" stopOpacity=".55" />
                  <stop offset="1" stopColor="#8fd3ff" stopOpacity=".8" />
                </linearGradient>
              </defs>
            </svg>
            {/* sheen across the closed coin */}
            {phase === "hit" && !reduce && (
              <motion.div
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 1, 0] }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="absolute -inset-y-1/4 w-1/4 rotate-[22deg]"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)" }}
                  initial={{ x: "-120%" }}
                  animate={{ x: "520%" }}
                  transition={{ duration: 0.7, ease: [0.2, 0.6, 0.3, 1] }}
                />
              </motion.div>
            )}
          </div>
          <motion.div
            className="absolute bottom-[18%] font-display text-[28px] font-medium tracking-[-0.03em]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: phase === "in" ? 0 : 1, y: phase === "in" ? 12 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.1 }}
          >
            Shaken.
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Half({ d, from, hit, reduce, fill, rim }: { d: string; from: -1 | 1; hit: boolean; reduce: boolean; fill: string; rim?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="absolute inset-0 size-full overflow-visible"
      style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,.5))" }}
      initial={reduce ? false : { x: `${from * 75}vw`, rotate: from * 28, opacity: 0.6 }}
      animate={{ x: 0, rotate: 0, opacity: 1, scale: hit && !reduce ? [1, 1.08, 0.98, 1] : 1 }}
      transition={{ x: { duration: 0.5, ease: [0.7, 0, 0.9, 0.6] }, rotate: { duration: 0.5, ease: [0.5, 0, 0.6, 1] }, scale: { duration: 0.45, ease: "easeOut" } }}
    >
      <path d={d} fill={fill} />
      {rim && <path d="M12 2.3A9.7 9.7 0 0 1 12 21.7" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth=".5" />}
      {hit && <circle cx="12" cy="12" r="9.8" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth=".35" />}
    </motion.svg>
  );
}
