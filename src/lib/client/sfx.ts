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

export const sfx = {
  tap() {
    blip(150, 62, 110, 0.22);
    blip(2400, 1800, 18, 0.015, "triangle"); // a hint of click on top so it reads on phone speakers
    navigator.vibrate?.(8);
  },
  tick() {
    blip(1700, 1300, 22, 0.02, "triangle");
  },
};
