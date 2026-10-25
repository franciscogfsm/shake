"use client";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type Perm = "unknown" | "needs-tap" | "listening" | "unsupported" | "denied";

/**
 * Listens for the two phones bumping together: a sharp spike in acceleration
 * (one hit above STRONG, or two quick hits above SOFT within 500ms). iOS asks for motion permission once.
 */
const STRONG = 24;
const SOFT = 15;

export function BumpToShake({ onBump, armed }: { onBump: () => void; armed: boolean }) {
  const [perm, setPerm] = useState<Perm>("unknown");
  const fired = useRef(false);
  const hits = useRef<number[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return setPerm("unsupported");
    const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    // desktop browsers expose the event but never fire it; only treat touch devices as capable
    if (!matchMedia("(pointer: coarse)").matches) return setPerm("unsupported");
    setPerm(typeof D.requestPermission === "function" ? "needs-tap" : "listening");
  }, []);

  useEffect(() => {
    if (perm !== "listening" || !armed) return;
    fired.current = false;
    const onMotion = (e: DeviceMotionEvent) => {
      if (fired.current) return;
      const a = e.acceleration;
      let mag: number;
      if (a && a.x != null && a.y != null && a.z != null) mag = Math.hypot(a.x, a.y, a.z);
      else {
        const g = e.accelerationIncludingGravity;
        if (!g || g.x == null || g.y == null || g.z == null) return;
        mag = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81);
      }
      const now = performance.now();
      hits.current = hits.current.filter((t) => now - t < 500);
      if (mag > SOFT) hits.current.push(now);
      if (mag > STRONG || hits.current.length >= 2) {
        fired.current = true;
        onBump();
      }
    };
    addEventListener("devicemotion", onMotion);
    return () => removeEventListener("devicemotion", onMotion);
  }, [perm, armed, onBump]);

  const ask = async () => {
    try {
      const D = DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> };
      setPerm((await D.requestPermission()) === "granted" ? "listening" : "denied");
    } catch {
      setPerm("denied");
    }
  };

  if (perm === "unsupported" || perm === "unknown") return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-16 w-40" aria-hidden>
        {[-1, 1].map((side) => (
          <motion.div
            key={side}
            className="glass absolute top-1 h-14 w-9 rounded-[10px]"
            style={{ left: side < 0 ? 38 : 82 }}
            animate={reduce || perm !== "listening" ? undefined : { x: [0, side * -14, side * -18, 0], rotate: [0, side * -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: [0.6, 0, 0.4, 1], times: [0, 0.45, 0.5, 1] }}
          />
        ))}
      </div>
      {perm === "needs-tap" ? (
        <button onClick={ask} className="glass h-11 rounded-full px-5 text-[15px] font-medium">Enable bump to pay</button>
      ) : perm === "listening" ? (
        <div className="flex items-center gap-2 text-[15px] text-ink-2" aria-live="polite">
          <span className="pulse-dot" /> Bump your phones together
        </div>
      ) : (
        <div className="text-sm text-mute">Motion is off. Hold the ring instead.</div>
      )}
    </div>
  );
}
