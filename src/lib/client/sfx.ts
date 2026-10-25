"use client";

/** Tiny UI sounds made with Web Audio (no files): a soft low "tap" for presses, a faint "tick" for typing. */
let ctx: AudioContext | null = null;
const audio = () => {
  try {
    ctx ||= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

function blip(from: number, to: number, ms: number, vol: number, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS Safari has no vibration API; the snap and the sound carry it */
  }
}

/** Patterns sized like a taptic engine: a tick, a press, a release, a slam. */
export const haptic = {
  tick: () => buzz(8),
  tap: () => buzz(14),
  press: () => buzz(22),
  release: () => buzz([6, 18, 10]),
  slam: () => buzz([18, 28, 24, 36, 55]),
  success: () => buzz([12, 40, 20, 48]),
};

export const sfx = {
  tap() {
    blip(150, 62, 110, 0.22);
    blip(2400, 1800, 18, 0.015, "triangle"); // a hint of click on top so it reads on phone speakers
    haptic.tap();
  },
  tick() {
    blip(1700, 1300, 22, 0.02, "triangle");
  },
  /** A tone that rises for as long as the finger stays down. Returns stop(). */
  rise(ms: number) {
    const a = audio();
    if (!a) return () => {};
    const t = a.currentTime;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(128, t);
    osc.frequency.linearRampToValueAtTime(340, t + ms / 1000);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.035, t + 0.15);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    return () => {
      const now = a.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.stop(now + 0.08);
    };
  },
  slam() {
    blip(78, 36, 170, 0.2);
    blip(640, 180, 80, 0.05, "triangle");
  },
  confirm() {
    blip(480, 760, 110, 0.045, "triangle");
  },
  release() {
    blip(200, 70, 100, 0.05);
  },
};
