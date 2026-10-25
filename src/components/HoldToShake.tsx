"use client";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Mark } from "./Mark";
import { ShakeBurst } from "./ShakeBurst";

const HOLD_MS = 1400;
const R = 102;
const CIRC = 2 * Math.PI * R;

type Props = {
  label?: string;
  hint?: string;
  /** Called once the ring completes. Resolve when the network confirms; reject to spring back. */
  onShake: () => Promise<void>;
  disabled?: boolean;
  size?: number;
};

/**
 * Press and hold: the ring fills, the coin halves pull apart (tension) with a rising tone,
 * letting go early springs back. On completion the halves slam shut with a light burst.
 */
export function HoldToShake({ label = "Hold to shake", hint, onShake, disabled, size = 216 }: Props) {
  const progress = useMotionValue(0);
  const offset = useTransform(progress, [0, 1], [CIRC, 0]);
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

  const done = phase === "done";
  return (
    <div className="flex flex-col items-center gap-5">
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
        className="glass relative grid select-none place-items-center rounded-full disabled:opacity-50"
        style={{ width: size, height: size, touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
        animate={phase === "sending" && !reduce ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <svg className="pointer-events-none absolute -inset-2.5 -rotate-90" viewBox="0 0 216 216" style={{ width: size + 20, height: size + 20 }}>
          <circle cx="108" cy="108" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
          <motion.circle
            cx="108"
            cy="108"
            r={R}
            fill="none"
            stroke="var(--safe)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            style={{ strokeDashoffset: offset, filter: "drop-shadow(0 0 6px rgba(143,211,255,.85))" }}
          />
        </svg>
        <ShakeBurst fire={done} size={size} />
        <Mark size={size * 0.45} state={done ? "shut" : "rest"} tension={done ? undefined : progress} />
      </motion.button>
      <div className="text-center" aria-live="polite">
        <div className="font-display text-xl font-medium tracking-[-0.02em]">
          {phase === "sending" ? "Releasing…" : done ? "Shaken." : label}
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
