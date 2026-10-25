"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "@/components/Mark";

/** The three beats of every deal, in the order the hero tells them. */
export const BEATS = [
  { t: "Lock", d: "You lock it. It isn't sent." },
  { t: "Verify", d: "They see it's real. Not a photo." },
  { t: "Meet", d: "Face to face. A one-time QR." },
  { t: "Shake", d: "Scan it. Paid in 5 seconds." },
] as const;

const BEAT_MS = 3000;

/** Cycles through the beats until the visitor picks one; picking pauses it for a while, then it carries on. */
export function useBeat() {
  const [beat, setBeat] = useState(0);
  const [held, setHeld] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), held ? 6000 : BEAT_MS);
    return () => clearTimeout(t);
  }, [beat, held]);
  return [beat, (b: number) => { setBeat(b); setHeld((h) => h + 1); }] as const;
}

// A decorative one-time QR: fixed finder squares plus a stable scatter of modules.
const QR = Array.from({ length: 121 }, (_, i) => {
  const x = i % 11, y = Math.floor(i / 11);
  const finder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
  return finder ? !(x % 10 === 1 && y % 10 === 1) && !(x === 9 && y === 1) && !(x === 1 && y === 9) : (x * 7 + y * 13 + x * y) % 5 < 2;
});

function Phone({ who, children, big }: { who: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div className={`relative flex shrink-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.12] bg-[#101317] shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)] ${big ? "h-[232px] w-[132px] rounded-[26px]" : "h-[150px] w-[92px]"}`}>
      <div className={`mx-auto mt-1.5 rounded-full bg-black ${big ? "h-[14px] w-[44px]" : "h-[9px] w-[30px]"}`} />
      <div className={`text-center font-mono uppercase tracking-[0.14em] text-mute ${big ? "mt-2 text-[9px]" : "mt-1 text-[7px]"}`}>{who}</div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-2 text-center">{children}</div>
    </div>
  );
}

/**
 * The whole product in a five second loop: your phone, the money held in the middle, their phone.
 * Purely illustrative (the real deal runs when you tap Try it); the caption carries the meaning for screen readers.
 */
export function HowItWorks({ beat, money, big, className = "" }: { beat: number; money: string; big?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  // within Verify: a faked screenshot glitches first, then the real locked money replaces it
  const [real, setReal] = useState(false);
  useEffect(() => {
    setReal(false);
    if (beat !== 1) return;
    const t = setTimeout(() => setReal(true), 1100);
    return () => clearTimeout(t);
  }, [beat]);
  const paid = beat === 3;

  const amount = big ? "text-[26px]" : "text-[17px]";
  const small = big ? "text-[11px]" : "text-[8px]";
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -6 }, transition: springs.snappy };
  const near = beat >= 2 && !reduce ? (big ? 18 : 10) : 0;
  const key = `${beat}${real}`;

  return (
    <div className={className}>
      <div className="relative flex items-center justify-center gap-2" aria-hidden>
        <motion.div animate={{ x: near }} transition={springs.smooth}>
          <Phone who="You" big={big}>
            <AnimatePresence mode="wait" initial={false}>
              {beat === 0 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`text-mute ${small}`}>Locking</span>
                  <span className={`amount ${amount}`}>{money}</span>
                  <span className={`rounded-full bg-safe px-2 py-0.5 font-medium text-on-safe ${small}`}>Face ID</span>
                </motion.div>
              )}
              {beat === 1 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount} text-ink-2`}>{money}</span>
                  <span className={`text-safe ${small}`}>Locked ✓</span>
                  <span className={`text-mute ${small}`}>Not sent yet</span>
                </motion.div>
              )}
              {beat === 2 && (
                <motion.div key={key} {...fade} className={`relative grid place-items-center ${big ? "size-[88px]" : "size-[56px]"}`}>
                  {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                    <span key={c} className={`absolute size-3 rounded-[3px] border-safe ${c}`} />
                  ))}
                  {!reduce && <motion.span className="absolute inset-x-1 h-px bg-safe shadow-[0_0_8px_var(--safe)]" initial={{ top: "10%" }} animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 1.4, ease: "easeInOut", repeat: 1 }} />}
                  <span className={`text-mute ${small}`}>Scanning</span>
                </motion.div>
              )}
              {paid && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount}`}>Paid</span>
                  <span className={`text-safe ${small}`}>in 5 seconds</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Phone>
        </motion.div>

        <div className={`relative flex flex-col items-center ${big ? "w-[76px]" : "w-[52px]"}`}>
          {/* the money travelling from your phone into the hold */}
          {beat === 0 && !reduce && (
            <motion.span
              key="coin"
              className={`absolute top-1/2 rounded-full bg-safe shadow-[0_0_16px_var(--safe)] ${big ? "size-3" : "size-2"}`}
              initial={{ x: big ? -60 : -40, y: "-50%", opacity: 0 }}
              animate={{ x: 0, opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.3, 0.7, 0.4, 1] }}
            />
          )}
          <Mark size={big ? 52 : 34} state={paid ? "shut" : beat === 0 ? "open" : "rest"} />
          {/* the seal lands on the shake, like the real receipt */}
          <motion.div
            key={paid ? "seal" : "label"}
            initial={paid && !reduce ? { opacity: 0, scale: 1.7, rotate: -14 } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: paid ? -6 : 0 }}
            transition={paid ? { type: "spring", stiffness: 520, damping: 22, delay: 0.25 } : springs.snappy}
            className={`mt-1.5 text-center font-mono uppercase tracking-[0.12em] ${big ? "text-[9px]" : "text-[7px]"} ${paid ? "rounded-full border border-safe px-1.5 py-0.5 text-safe shadow-[0_0_14px_-4px_var(--safe)]" : "text-mute"}`}
          >
            {paid ? "Released" : beat === 0 ? "On Stellar" : "Held safe"}
          </motion.div>
          {paid && !reduce && (
            <motion.span className="pointer-events-none absolute left-1/2 top-[38%] size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-safe/30 blur-xl" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
          )}
        </div>

        <motion.div animate={{ x: -near }} transition={springs.smooth}>
          <Phone who="Seller" big={big}>
            <AnimatePresence mode="wait" initial={false}>
              {beat === 0 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`text-mute ${small}`}>Waiting for</span>
                  <span className={`amount ${amount} text-mute`}>{money}</span>
                </motion.div>
              )}
              {beat === 1 && !real && (
                <motion.div
                  key={key}
                  {...fade}
                  animate={reduce ? { opacity: 1, y: 0 } : { opacity: [1, 0.4, 1, 0.6, 1], x: [0, -3, 2, -1, 0], y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className={`text-mute ${small}`}>“I sent it, look”</span>
                  <span className={`rounded-md border border-dashed border-white/25 px-2 py-1 text-mute line-through ${small}`}>screenshot</span>
                  <span className={`font-medium text-ink-2 ${small}`}>✕ Not on Stellar</span>
                </motion.div>
              )}
              {beat === 1 && real && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount} glacier-text`}>{money}</span>
                  <span className={`text-ink ${small}`}>locked for you ✓</span>
                  <span className={`text-mute ${small}`}>Checked on Stellar</span>
                </motion.div>
              )}
              {beat === 2 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <svg viewBox="0 0 11 11" className={`rounded-[4px] bg-white p-[3px] ${big ? "size-[72px]" : "size-[46px]"}`} shapeRendering="crispEdges">
                    {QR.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#0d0f12" />)}
                  </svg>
                  <span className={`text-mute ${small}`}>One-time QR</span>
                </motion.div>
              )}
              {paid && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount} text-safe`}>+{money}</span>
                  <span className={`text-ink ${small}`}>Yours ✓</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Phone>
        </motion.div>
      </div>
    </div>
  );
}

/** What each beat means, in words. Shared by the mobile caption and the desktop panel. */
export function beatLine(beat: number, money: string) {
  return [
    `You lock ${money}. It leaves your wallet, but nobody can touch it yet.`,
    `A screenshot can be faked. They see ${money} really locked for them, checked on Stellar.`,
    `You meet face to face. They show a one-time QR that only exists on their phone, right now.`,
    `You scan it and it pays in about 5 seconds. Don't meet? It comes back to you.`,
  ][beat];
}
