"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "@/components/Mark";

/** The three beats of every deal, in the order the hero tells them. */
export const BEATS = [
  { t: "Lock", d: "You hold it. It isn't sent." },
  { t: "They see", d: "Real money, not a photo." },
  { t: "Shake", d: "You meet. Then it pays." },
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
  // within the Shake beat: first the QR is scanned, then the halves slam and it pays
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    setPaid(false);
    if (beat !== 2) return;
    const t = setTimeout(() => setPaid(true), 1100);
    return () => clearTimeout(t);
  }, [beat]);

  const amount = big ? "text-[26px]" : "text-[17px]";
  const small = big ? "text-[11px]" : "text-[8px]";
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -6 }, transition: springs.snappy };
  const near = beat === 2 && !reduce ? (big ? 18 : 10) : 0;
  const key = `${beat}${paid}`;

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
              {beat === 2 && !paid && (
                <motion.div key={key} {...fade} className={`relative grid place-items-center ${big ? "size-[88px]" : "size-[56px]"}`}>
                  {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                    <span key={c} className={`absolute size-3 rounded-[3px] border-safe ${c}`} />
                  ))}
                  {!reduce && <motion.span className="absolute inset-x-1 h-px bg-safe shadow-[0_0_8px_var(--safe)]" initial={{ top: "10%" }} animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 1.1, ease: "easeInOut" }} />}
                  <span className={`text-mute ${small}`}>Scanning</span>
                </motion.div>
              )}
              {beat === 2 && paid && (
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
          <Mark size={big ? 52 : 34} state={beat === 2 && paid ? "shut" : beat === 0 ? "open" : "rest"} />
          <div className={`mt-1.5 text-center font-mono uppercase tracking-[0.12em] ${big ? "text-[9px]" : "text-[7px]"} ${beat === 2 && paid ? "text-safe" : "text-mute"}`}>
            {beat === 2 && paid ? "Released" : beat === 0 ? "On Stellar" : "Held safe"}
          </div>
          {beat === 2 && paid && !reduce && (
            <motion.span className="pointer-events-none absolute left-1/2 top-[38%] size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-safe/30 blur-xl" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
          )}
        </div>

        <motion.div animate={{ x: -near }} transition={springs.smooth}>
          <Phone who="Seller" big={big}>
            <AnimatePresence mode="wait" initial={false}>
              {beat === 0 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`text-mute ${small}`}>“I sent it, look”</span>
                  <span className={`rounded-md border border-dashed border-white/20 px-2 py-1 text-mute line-through ${small}`}>screenshot</span>
                  <span className={`text-mute ${small}`}>Not proof</span>
                </motion.div>
              )}
              {beat === 1 && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <span className={`amount ${amount} glacier-text`}>{money}</span>
                  <span className={`text-ink ${small}`}>locked for you ✓</span>
                  <span className={`text-mute ${small}`}>Checked on Stellar</span>
                </motion.div>
              )}
              {beat === 2 && !paid && (
                <motion.div key={key} {...fade} className="flex flex-col items-center gap-1">
                  <svg viewBox="0 0 11 11" className={`rounded-[4px] bg-white p-[3px] ${big ? "size-[72px]" : "size-[46px]"}`} shapeRendering="crispEdges">
                    {QR.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#0d0f12" />)}
                  </svg>
                  <span className={`text-mute ${small}`}>One-time QR</span>
                </motion.div>
              )}
              {beat === 2 && paid && (
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
    `You lock ${money}. It leaves your wallet, but they can't touch it yet.`,
    `They see ${money} locked for them, checked on Stellar. Not a screenshot.`,
    `You meet and scan their one-time QR. It pays in about 5 seconds. Don't meet? It comes back to you.`,
  ][beat];
}
