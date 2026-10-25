"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "@/components/Mark";
import { haptic } from "@/lib/client/sfx";

/** The four beats of every deal, in the order the hero tells them. */
export const BEATS = ["Lock", "Verify", "Meet", "Shake"] as const;
export const BEAT_MS = 3200;

/** Cycles through the beats; picking one jumps there and the story carries on from it. */
export function useBeat() {
  const [beat, setBeat] = useState(0);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat, nonce]);
  return [beat, (b: number) => { setBeat(b); setNonce((n) => n + 1); }, nonce] as const;
}

/** What each beat means, in words. Shared by the caption and screen readers. */
export function beatLine(beat: number, money: string) {
  return [
    `You lock ${money}. Nobody can touch it yet.`,
    `They see it's real. A screenshot can't fake this.`,
    `Face to face, you scan their one-time QR.`,
    `Paid in 5 seconds. No meeting? It comes back.`,
  ][beat];
}

// A decorative one-time QR: fixed finder squares plus a stable scatter of modules.
const QR = Array.from({ length: 121 }, (_, i) => {
  const x = i % 11, y = Math.floor(i / 11);
  const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
  return finder ? !(x % 10 === 1 && y % 10 === 1) && !(x === 9 && y === 1) && !(x === 1 && y === 9) : (x * 7 + y * 13 + x * y) % 5 < 2;
});

function Phone({ who, children, big, lit }: { who: string; children: React.ReactNode; big?: boolean; lit?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex shrink-0 flex-col overflow-hidden border bg-[#0f1216] shadow-[0_24px_50px_-24px_rgba(0,0,0,.9)] transition-colors duration-500 ${lit ? "border-safe/40" : "border-white/[0.1]"} ${big ? "h-[226px] w-[128px] rounded-[28px]" : "h-[184px] w-[106px] rounded-[24px]"}`}>
        <div className={`mx-auto mt-2 shrink-0 rounded-full bg-black ${big ? "h-[15px] w-[46px]" : "h-[11px] w-[34px]"}`} />
        <div className="relative flex flex-1 items-center justify-center px-2 text-center">{children}</div>
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-mute">{who}</div>
    </div>
  );
}

/**
 * The whole product as one short film: your phone, the money held in the middle, their phone.
 * One thing on each screen per beat. Purely illustrative (the real deal runs when you tap Try it).
 */
export function HowItWorks({ beat, money, big, className = "" }: { beat: number; money: string; big?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  // within Verify: a faked screenshot glitches first, then the real locked money replaces it
  const [real, setReal] = useState(false);
  useEffect(() => {
    setReal(false);
    if (beat !== 1) return;
    const t = setTimeout(() => setReal(true), 1000);
    return () => clearTimeout(t);
  }, [beat]);
  const paid = beat === 3;

  const amount = big ? "text-[36px]" : "text-[30px]";
  const label = big ? "text-[12px]" : "text-[10px]";
  const fade = { initial: { opacity: 0, scale: reduce ? 1 : 0.9, filter: "blur(6px)" }, animate: { opacity: 1, scale: 1, filter: "blur(0px)" }, exit: { opacity: 0, scale: reduce ? 1 : 1.06, filter: "blur(6px)" }, transition: springs.smooth };
  const near = beat >= 2 && !reduce ? (big ? 22 : 16) : 0;
  const qr = big ? "size-[84px]" : "size-[68px]";

  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="relative flex items-start justify-center">
        <motion.div animate={{ x: near }} transition={springs.smooth}>
          <Phone who="You" big={big} lit={paid}>
            <AnimatePresence mode="popLayout" initial={false}>
              {beat === 0 && (
                <motion.div key="lock" {...fade} className="flex flex-col items-center gap-2">
                  {/* the money leaves your phone for the hold in the middle */}
                  <motion.span className={`amount ${amount}`} animate={reduce ? undefined : { x: [0, 0, big ? 80 : 70], opacity: [1, 1, 0], scale: [1, 1, 0.4] }} transition={{ duration: 1.6, times: [0, 0.55, 1], ease: [0.6, 0, 0.3, 1] }}>
                    {money}
                  </motion.span>
                  <span className={`rounded-full bg-safe px-2.5 py-0.5 font-medium text-on-safe ${label}`}>Face ID</span>
                </motion.div>
              )}
              {beat === 1 && (
                <motion.div key="held" {...fade} className={`flex flex-col items-center gap-1 text-ink-2 ${label}`}>
                  <span className="text-safe">Locked ✓</span>
                  <span>Not sent yet</span>
                </motion.div>
              )}
              {beat === 2 && (
                <motion.div key="scan" {...fade} className={`relative ${qr}`}>
                  {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
                    <span key={c} className={`absolute size-4 rounded-[4px] border-safe ${c}`} />
                  ))}
                  {!reduce && <motion.span className="absolute inset-x-1.5 h-[2px] rounded-full bg-safe shadow-[0_0_10px_var(--safe)]" initial={{ top: "12%" }} animate={{ top: ["12%", "88%", "12%"] }} transition={{ duration: 1.5, ease: "easeInOut", repeat: 1 }} />}
                </motion.div>
              )}
              {paid && (
                <motion.div key="paid" {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${big ? "text-[34px]" : "text-[26px]"}`}>Paid</span>
                  <span className={`text-safe ${label}`}>✓ in 5 seconds</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Phone>
        </motion.div>

        {/* the hold: the coin's two halves, apart while the money is safe, slammed shut when you meet */}
        <div className={`relative flex flex-col items-center justify-center self-stretch pb-6 ${big ? "w-[72px]" : "w-[64px]"}`}>
          {!reduce && beat < 3 && (
            <motion.span
              className="absolute rounded-full bg-safe/20 blur-xl"
              style={{ width: big ? 70 : 54, height: big ? 70 : 54 }}
              animate={{ opacity: beat === 0 ? [0, 0, 1] : [0.6, 1, 0.6], scale: [0.9, 1.05, 0.9] }}
              transition={beat === 0 ? { duration: 1.8, times: [0, 0.7, 1] } : { duration: 2.4, repeat: Infinity }}
            />
          )}
          <Mark size={big ? 56 : 42} state={paid ? "shut" : beat === 0 ? "open" : "rest"} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={paid ? "seal" : "label"}
              initial={paid && !reduce ? { opacity: 0, scale: 1.8, rotate: -14 } : { opacity: 0 }}
              animate={{ opacity: 1, scale: 1, rotate: paid ? -6 : 0 }}
              exit={{ opacity: 0 }}
              transition={paid ? { type: "spring", stiffness: 520, damping: 22, delay: 0.3 } : springs.snappy}
              className={`absolute bottom-0 whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.14em] ${paid ? "rounded-full border border-safe px-1.5 py-0.5 text-safe shadow-[0_0_16px_-4px_var(--safe)]" : "text-mute"}`}
            >
              {paid ? "Released" : "On Stellar"}
            </motion.div>
          </AnimatePresence>
          {paid && !reduce && (
            <>
              <motion.span className="pointer-events-none absolute size-28 rounded-full bg-safe/40 blur-2xl" initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
              <motion.span className="pointer-events-none absolute size-16 rounded-full border border-safe" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </>
          )}
        </div>

        <motion.div animate={{ x: -near }} transition={springs.smooth}>
          <Phone who="Seller" big={big} lit={beat === 1 && real}>
            <AnimatePresence mode="popLayout" initial={false}>
              {beat === 0 && (
                <motion.div key="wait" {...fade} className="flex flex-col items-center gap-2">
                  <span className="block h-1.5 w-12 rounded-full bg-white/[0.07]" />
                  <span className="block h-1.5 w-8 rounded-full bg-white/[0.05]" />
                </motion.div>
              )}
              {beat === 1 && !real && (
                <motion.div key="fake" {...fade} className="flex flex-col items-center gap-1.5">
                  {/* the screenshot scam: it flickers, splits, and is struck off */}
                  <motion.span
                    className={`amount ${amount} text-ink-2`}
                    style={{ textShadow: reduce ? undefined : "2px 0 rgba(255,80,120,.55), -2px 0 rgba(80,200,255,.55)" }}
                    animate={reduce ? undefined : { x: [0, -3, 3, -2, 0, 2, 0], opacity: [1, 0.5, 1, 0.3, 1, 0.6, 1], skewX: [0, 8, -6, 0, 4, 0, 0] }}
                    transition={{ duration: 0.7, delay: 0.15 }}
                  >
                    <span className="line-through decoration-2">{money}</span>
                  </motion.span>
                  <span className={`text-mute ${label}`}>Screenshot ✕</span>
                </motion.div>
              )}
              {beat === 1 && real && (
                <motion.div key="real" {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount} glacier-text`}>{money}</span>
                  <span className={`text-ink ${label}`}>locked for you ✓</span>
                </motion.div>
              )}
              {beat === 2 && (
                <motion.div key="qr" {...fade}>
                  <svg viewBox="0 0 11 11" className={`rounded-[6px] bg-white p-[4px] ${qr}`} shapeRendering="crispEdges">
                    {QR.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#0d0f12" />)}
                  </svg>
                </motion.div>
              )}
              {paid && (
                <motion.div key="got" {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${big ? "text-[34px]" : "text-[26px]"} text-safe`}>+{money}</span>
                  <span className={`text-ink ${label}`}>Yours</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Phone>
        </motion.div>
      </div>
    </div>
  );
}

/** Story-style progress: four thin bars you can tap, and one line saying what's happening. */
export function StoryCaption({ beat, nonce, money, onBeat, className = "" }: { beat: number; nonce: number; money: string; onBeat: (b: number) => void; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={className}>
      <div className="flex gap-1.5">
        {BEATS.map((t, i) => (
          <button
            key={t}
            type="button"
            aria-label={t}
            aria-pressed={beat === i}
            onClick={() => { haptic.tick(); onBeat(i); }}
            className="group flex flex-1 flex-col gap-2 py-1.5 text-left"
          >
            <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/[0.1]">
              <motion.span
                key={beat === i ? `${beat}-${nonce}` : i}
                className="absolute inset-0 origin-left rounded-full bg-safe"
                initial={{ scaleX: i < beat ? 1 : 0 }}
                animate={{ scaleX: i <= beat ? 1 : 0 }}
                transition={beat === i && !reduce ? { duration: BEAT_MS / 1000, ease: "linear" } : { duration: 0.2 }}
              />
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${beat === i ? "text-ink" : "text-mute group-hover:text-ink-2"}`}>{t}</span>
          </button>
        ))}
      </div>
      <div className="relative mt-1 h-11 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={beat} className="text-[15px] leading-snug text-ink-2 lg:text-[16px]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springs.snappy}>
            {beatLine(beat, money)}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite">{`${BEATS[beat]}. ${beatLine(beat, money)}`}</p>
    </div>
  );
}
