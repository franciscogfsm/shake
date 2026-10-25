"use client";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Mark } from "./Mark";
import { ShakeBurst } from "./ShakeBurst";

const HOLD_MS = 1400;
const TICKS = 60;

type Props = {
  label?: string;
  hint?: string;
  /** Called once the ring completes. Resolve when the network confirms; reject to spring back. */
  onShake: () => Promise<void>;
  disabled?: boolean;
  size?: number;
  /** Increment to complete the shake without holding (e.g. a physical bump). */
  trigger?: number;
};

/**
 * Press and hold: the ring fills, the coin halves pull apart (tension) with a rising tone,
 * letting go early springs back. On completion the halves slam shut with a light burst.
 */
export function HoldToShake({ label = "Hold to shake", hint, onShake, disabled, size = 216, trigger = 0 }: Props) {
  const progress = useMotionValue(0);
  const offset = useTransform(progress, [0, 1], [1, 0]);
  const auraOpacity = useTransform(progress, [0, 1], [0.25, 1]);
  const auraScale = useTransform(progress, [0, 1], [0.85, 1.12]);
  const grad = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "holding" | "sending" | "done">("idle");
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  const tone = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  const [muted] = useState(true);

  const stopTone = () => {
    const t = tone.current;
    if (!t) return;
    t.gain.gain.setTargetAtTime(0, t.ctx.currentTime, 0.05);
    t.osc.stop(t.ctx.currentTime + 0.2);
    tone.current = null;
  };

  const start = () => {
    if (disabled || phase === "sending" || phase === "done") return;
    setPhase("holding");
    if (!muted) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(420, ctx.currentTime + HOLD_MS / 1000);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        tone.current = { ctx, osc, gain };
      } catch {}
    }
    anim.current = animate(progress, 1, {
      duration: ((1 - progress.get()) * HOLD_MS) / 1000,
      ease: [0.45, 0, 0.75, 1],
      onComplete: complete,
    });
  };

  const cancel = () => {
    if (phase !== "holding") return;
    anim.current?.stop();
    stopTone();
    setPhase("idle");
    animate(progress, 0, { type: "spring", stiffness: 400, damping: 28 });
  };

  const complete = async () => {
    stopTone();
    setPhase("sending");
    navigator.vibrate?.(30);
    try {
      await onShake();
      setPhase("done");
      navigator.vibrate?.([20, 40, 60]);
    } catch {
      setPhase("idle");
      animate(progress, 0, { type: "spring", stiffness: 300, damping: 24 });
    }
  };

  useEffect(() => () => stopTone(), []);

  useEffect(() => {
    if (!trigger || disabled || phase === "sending" || phase === "done") return;
    anim.current?.stop();
    setPhase("holding");
    anim.current = animate(progress, 1, { duration: 0.22, ease: "easeIn", onComplete: complete });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const done = phase === "done";
  const ring = size + 44;
  return (
    <div className="flex flex-col items-center gap-4">
      {/* the ring lives outside the glass button: .glass forces its children to position: relative */}
      <div className="relative grid place-items-center" style={{ width: ring, height: ring }}>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(143,211,255,.38), rgba(170,120,255,.12) 45%, transparent 68%)", opacity: auraOpacity, scale: auraScale }}
        />
        {phase === "idle" && !reduce && !disabled && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-[rgba(143,211,255,.45)]"
            style={{ width: size, height: size }}
            animate={{ scale: [1, 1.2], opacity: [0.7, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <svg aria-hidden className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d4efff" />
              <stop offset=".5" stopColor="var(--safe)" />
              <stop offset="1" stopColor="#b9a3ff" />
            </linearGradient>
          </defs>
          {Array.from({ length: TICKS }, (_, i) => (
            <line key={i} x1="50" y1="1.2" x2="50" y2={i % 5 ? "2.6" : "3.4"} stroke="rgba(255,255,255,.16)" strokeWidth=".35" transform={`rotate(${(i * 360) / TICKS} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="46.5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.2" />
          <motion.circle
            cx="50"
            cy="50"
            r="46.5"
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            style={{ strokeDashoffset: offset, filter: "drop-shadow(0 0 2px rgba(143,211,255,.9))" }}
          />
        </svg>
        <ShakeBurst fire={done} size={ring} />
        <motion.button
          type="button"
          aria-label={label}
          aria-describedby={hint ? "hold-hint" : undefined}
          disabled={disabled}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            start();
          }}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && (e.preventDefault(), start())}
          onKeyUp={(e) => (e.key === " " || e.key === "Enter") && cancel()}
          onContextMenu={(e) => e.preventDefault()}
          className="glass grid select-none place-items-center rounded-full disabled:opacity-50"
          style={{ width: size, height: size, touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          animate={phase === "sending" && !reduce ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0, scale: phase === "holding" ? 0.96 : 1 }}
          transition={{ duration: 0.35 }}
        >
          <span
            className="grid place-items-center rounded-full"
            style={{
              width: size * 0.74,
              height: size * 0.74,
              background: "radial-gradient(circle at 50% 35%, rgba(255,255,255,.06), rgba(0,0,0,.35) 75%)",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,.55), inset 0 -1px 0 rgba(255,255,255,.08), 0 1px 0 rgba(255,255,255,.06)",
            }}
          >
            <Mark size={size * 0.42} state={done ? "shut" : "rest"} tension={done ? undefined : progress} />
          </span>
        </motion.button>
      </div>
      <div className="text-center" aria-live="polite">
        <div className="font-display text-xl font-medium tracking-[-0.02em]">
          {phase === "sending" ? "Releasing…" : done ? "Shaken." : phase === "holding" ? "Keep holding…" : label}
        </div>
        {hint && (
          <div id="hold-hint" className="eyebrow mt-1.5">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
