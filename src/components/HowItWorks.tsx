"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Mark, springs } from "@/components/Mark";
import { haptic } from "@/lib/client/sfx";

/** The four beats of every deal, in the order the hero tells them. */
export const BEATS = ["Lock", "Verify", "Meet", "Shake"] as const;
/** How long each beat plays; the shake gets room to land. */
export const BEAT_MS = [3000, 3400, 3000, 4000];
// when the second half of each beat happens: Face ID passes, the real money replaces the fake, the scan matches, the money lands
const SUB_MS = [850, 1100, 1500, 650];

/** Cycles through the beats; picking one jumps there and the story carries on from it. */
export function useBeat() {
  const [beat, setBeat] = useState(0);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS[beat]);
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

const SIZES = {
  // stage width, phone width/height/radius, coin, gap between phones when they meet
  small: { w: 332, pw: 120, ph: 214, r: 28, coin: 44, gap: 10, amount: "text-[30px]", label: "text-[11px]", qr: 72 },
  big: { w: 456, pw: 164, ph: 324, r: 36, coin: 72, gap: 14, amount: "text-[44px]", label: "text-[13px]", qr: 104 },
};

function Phone({ who, children, s, lit, sweep }: { who: string; children: React.ReactNode; s: (typeof SIZES)["big"]; lit?: boolean; sweep?: boolean }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden border-[1.5px] bg-[#0e1115] transition-[border-color,box-shadow] duration-500 ${lit ? "border-safe/50 shadow-[0_0_60px_-18px_var(--safe),0_40px_70px_-30px_rgba(0,0,0,.95),inset_0_0_0_4px_#05070a]" : "border-white/[0.14] shadow-[0_40px_70px_-30px_rgba(0,0,0,.95),inset_0_0_0_4px_#05070a]"}`}
      style={{ width: s.pw, height: s.ph, borderRadius: s.r }}
    >
      {/* status bar and island, so it reads as a real phone at a glance */}
      <div className="relative flex shrink-0 items-center justify-between px-[14%] pt-[7px] font-mono text-[8px] text-ink-2">
        <span>9:41</span>
        <span className="absolute left-1/2 top-[6px] h-[13px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
        <span className="h-[6px] w-[12px] rounded-[2px] border border-ink-2/60" />
      </div>
      <div className="mt-2.5 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-mute">{who}</div>
      <div className="relative flex flex-1 items-center justify-center px-3 pb-6 text-center">{children}</div>
      {/* glass glare, plus a light sweep the moment money lands */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.07),transparent_38%)]" />
      {sweep && <motion.span className="pointer-events-none absolute inset-y-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(143,211,255,.22),transparent)]" initial={{ x: "-120%" }} animate={{ x: "320%" }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }} />}
    </div>
  );
}

/** The money in flight between phones: a small glowing chip on an arc. */
function Flight({ from, to, top, money, delay = 0 }: { from: number; to: number; top: number; money: string; delay?: number }) {
  return (
    <motion.span
      className="amount pointer-events-none absolute left-1/2 z-30 -ml-6 -mt-3.5 flex h-7 w-12 items-center justify-center rounded-full bg-safe text-[13px] text-on-safe shadow-[0_0_30px_var(--safe)]"
      style={{ top }}
      initial={{ x: from, y: 0, opacity: 0, scale: 0.6 }}
      animate={{ x: [from, (from + to) / 2, to], y: [0, -46, 0], opacity: [0, 1, 0], scale: [0.6, 1.1, 0.4] }}
      transition={{ duration: 0.75, delay, ease: [0.5, 0, 0.3, 1], times: [0, 0.5, 1] }}
    >
      {money}
    </motion.span>
  );
}

/**
 * The whole product as one short film: your phone, the money held in the middle, their phone.
 * Purely illustrative (the real deal runs when you tap Try it).
 */
export function HowItWorks({ beat, money, big, className = "" }: { beat: number; money: string; big?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const s = SIZES[big ? "big" : "small"];
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (big) return;
    const el = frame.current;
    if (!el) return;
    const fit = () => { const w = el.clientWidth; if (w > 0) setScale(Math.min(1, w / s.w)); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [big, s.w]);
  // the second half of each beat (see SUB_MS)
  const [sub, setSub] = useState(false);
  useEffect(() => {
    setSub(false);
    const t = setTimeout(() => setSub(true), SUB_MS[beat]);
    return () => clearTimeout(t);
  }, [beat]);
  const paid = beat === 3;
  const meet = beat >= 2;

  const rest = s.w - 2 * s.pw; // the gap while the money waits in the middle
  const near = meet && !reduce ? (rest - s.gap) / 2 : 0;
  const side = s.pw / 2 + (meet ? s.gap : rest) / 2; // phone centre, measured from the stage centre
  const tilt = reduce ? 0 : meet ? 0 : 14;
  const fade = { initial: { opacity: 0, scale: reduce ? 1 : 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: reduce ? 1 : 1.06 }, transition: springs.smooth };
  const pop = { ...fade, transition: springs.slam };
  const flip = (k: string, a: React.ReactNode, slam = false) => <motion.div key={k} {...(slam ? pop : fade)} className="flex flex-col items-center gap-1.5">{a}</motion.div>;
  // the coin waits in the gap, rises over the seam while you scan, then slams down onto it
  const coinY = reduce ? 0 : beat === 2 ? -s.ph / 2 + s.coin / 2 + 4 : 0;

  const stage = (
    <div className={big ? `relative mx-auto ${className}` : "relative"} style={{ width: s.w, height: s.ph + 24 }} aria-hidden>
      {/* floor light under the pair, brighter when they meet */}
      <motion.span className="absolute bottom-0 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[50%] bg-safe/25 blur-2xl" animate={{ opacity: paid ? 1 : meet ? 0.6 : 0.3, scaleX: meet ? 0.7 : 1 }} transition={springs.smooth} />

      <motion.div className="absolute left-0 top-0 z-10" animate={{ x: paid && !reduce ? [near, near + 5, near] : near, rotateY: tilt }} transition={paid ? { duration: 0.45, delay: 0.1 } : springs.smooth} style={{ transformPerspective: 900 }}>
        <Phone who="You" s={s} lit={paid && sub} sweep={paid && sub}>
          <AnimatePresence mode="popLayout" initial={false}>
            {beat === 0 && flip(sub ? "lock-sent" : "lock", <>
              <span className={`amount ${s.amount} ${sub ? "glacier-text" : ""}`}>{money}</span>
              {sub ? <span className={`text-safe ${s.label}`}>Locked ✓</span> : <span className={`rounded-full bg-safe px-2.5 py-1 font-medium text-on-safe ${s.label}`}>Face ID</span>}
            </>, sub)}
            {beat === 1 && flip("held", <>
              <span className={`text-safe ${s.label}`}>Locked ✓</span>
              <span className={`text-ink-2 ${s.label}`}>Not sent yet</span>
            </>)}
            {beat === 2 && (
              <motion.div key="scan" {...fade} className="relative" style={{ width: s.qr, height: s.qr }}>
                {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
                  <span key={c} className={`absolute size-4 rounded-[4px] ${sub ? "border-safe" : "border-white/60"} ${c}`} />
                ))}
                {!reduce && !sub && <motion.span className="absolute inset-x-1.5 h-[2px] rounded-full bg-safe shadow-[0_0_12px_var(--safe)]" initial={{ top: "10%" }} animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 1.4, ease: "easeInOut" }} />}
                {sub && <motion.span className={`absolute inset-0 grid place-items-center text-safe ${s.label}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={springs.slam}>It&apos;s them ✓</motion.span>}
              </motion.div>
            )}
            {paid && flip("paid", <>
              <span className={`amount ${s.amount}`}>Paid</span>
              <span className={`text-safe ${s.label}`}>✓ in 5 seconds</span>
            </>, true)}
          </AnimatePresence>
        </Phone>
      </motion.div>

      <motion.div className="absolute right-0 top-0 z-10" animate={{ x: paid && !reduce ? [-near, -near - 5, -near] : -near, rotateY: -tilt }} transition={paid ? { duration: 0.45, delay: 0.1 } : springs.smooth} style={{ transformPerspective: 900 }}>
        <Phone who="Seller" s={s} lit={(beat === 1 && sub) || (paid && sub)} sweep={(beat === 1 && sub) || (paid && sub)}>
          <AnimatePresence mode="popLayout" initial={false}>
            {beat === 0 && flip("wait", <>
              <span className="block h-1.5 w-12 rounded-full bg-white/[0.07]" />
              <span className="block h-1.5 w-8 rounded-full bg-white/[0.05]" />
              <span className={`mt-1 text-mute ${s.label}`}>Waiting</span>
            </>)}
            {beat === 1 && !sub && flip("fake", <>
              {/* the screenshot scam: it flickers, splits, and is struck off */}
              <motion.span
                className={`amount ${s.amount} text-ink-2`}
                style={{ textShadow: reduce ? undefined : "2px 0 rgba(255,80,120,.6), -2px 0 rgba(80,200,255,.6)" }}
                animate={reduce ? undefined : { x: [0, -4, 4, -2, 0, 3, 0], opacity: [1, 0.4, 1, 0.25, 1, 0.6, 1], skewX: [0, 10, -8, 0, 5, 0, 0] }}
                transition={{ duration: 0.75, delay: 0.1 }}
              >
                <span className="line-through decoration-2">{money}</span>
              </motion.span>
              <span className={`text-mute ${s.label}`}>Screenshot ✕</span>
            </>)}
            {beat === 1 && sub && flip("real", <>
              <span className={`amount ${s.amount} glacier-text`}>{money}</span>
              <span className={`text-ink ${s.label}`}>locked for you ✓</span>
            </>, true)}
            {beat === 2 && (
              <motion.div key="qr" {...fade}>
                <svg viewBox="0 0 11 11" className="rounded-[6px] bg-white p-[4px]" style={{ width: s.qr, height: s.qr }} shapeRendering="crispEdges">
                  {QR.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#0d0f12" />)}
                </svg>
              </motion.div>
            )}
            {paid && !sub && flip("coming", <span className="block h-1.5 w-10 rounded-full bg-white/[0.07]" />)}
            {paid && sub && flip("got", <>
              <span className={`amount ${s.amount} text-safe`}>+{money}</span>
              <span className={`text-ink ${s.label}`}>Yours</span>
            </>, true)}
          </AnimatePresence>
        </Phone>
      </motion.div>

      {/* proof beam: the seller reads the locked money straight from the chain */}
      {beat === 1 && sub && !reduce && (
        <motion.span className="absolute left-1/2 z-0 h-px origin-left bg-gradient-to-r from-safe to-transparent" style={{ top: s.ph / 2, width: rest / 2 + 8 }} initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: [1, 1, 0.4] }} transition={{ duration: 0.5, ease: "easeOut" }} />
      )}

      {/* the coin: the money held on Stellar */}
      <motion.div className="absolute left-1/2 z-20 flex flex-col items-center" style={{ top: s.ph / 2 - s.coin / 2, marginLeft: -s.coin / 2 }} animate={{ y: coinY, scale: beat === 2 && !reduce ? 0.82 : 1 }} transition={paid ? springs.slam : springs.smooth}>
        {!reduce && !paid && (
          <motion.span
            className="absolute rounded-full bg-safe/30 blur-xl"
            style={{ width: s.coin * 1.4, height: s.coin * 1.4, left: -s.coin * 0.2, top: -s.coin * 0.2 }}
            animate={{ opacity: beat === 0 ? (sub ? [0.4, 1] : 0.2) : [0.5, 0.9, 0.5] }}
            transition={beat === 0 ? { duration: 0.6 } : { duration: 2.4, repeat: Infinity }}
          />
        )}
        <Mark size={s.coin} state={paid ? "shut" : (beat === 0 && !sub) || (beat === 2 && !sub) ? "open" : "rest"} />
        <AnimatePresence>
          {beat < 2 && (
            <motion.span className="absolute top-full mt-2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] text-mute lg:text-[10px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {beat === 0 && !sub ? "Locking" : big ? "Held on Stellar" : "Held"}
            </motion.span>
          )}
        </AnimatePresence>
        {paid && !reduce && (
          <>
            <motion.span className="pointer-events-none absolute rounded-full bg-safe/50 blur-2xl" style={{ width: s.coin * 2, height: s.coin * 2, left: -s.coin / 2, top: -s.coin / 2 }} initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 1, ease: "easeOut", delay: 0.12 }} />
            {[0, 0.12].map((d) => (
              <motion.span key={d} className="pointer-events-none absolute inset-0 rounded-full border border-safe" initial={{ scale: 0.8, opacity: 0.9 }} animate={{ scale: 4, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.12 + d }} />
            ))}
          </>
        )}
      </motion.div>

      {/* the money's journey: into the hold when you lock, out to them when you shake */}
      {!reduce && beat === 0 && sub && <Flight key="in" from={-side} to={0} top={s.ph / 2} money={money} />}
      {!reduce && paid && <Flight key="out" from={0} to={side} top={s.ph / 2} money={money} delay={0.2} />}

      {/* the stamp across both phones */}
      <AnimatePresence>
        {paid && (
          <motion.div
            className="absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-safe bg-[#0d0f12]/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-safe shadow-[0_0_24px_-6px_var(--safe)] backdrop-blur"
            style={{ top: s.ph - 52 }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.2, rotate: -16 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 20, delay: 0.55 }}
          >
            Released ✓
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  if (big) return stage;
  return (
    <div ref={frame} className={`relative mx-auto w-full overflow-hidden ${className}`} style={{ maxWidth: s.w, height: (s.ph + 24) * scale }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: s.w, transform: `scale(${scale})` }}>{stage}</div>
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
                transition={beat === i && !reduce ? { duration: BEAT_MS[i] / 1000, ease: "linear" } : { duration: 0.2 }}
              />
            </span>
            <span className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${beat === i ? "text-safe" : "text-mute group-hover:text-ink-2"}`}>{t}</span>
          </button>
        ))}
      </div>
      <div className="relative mt-2 h-12 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={beat} className="font-display text-[15px] font-medium leading-snug text-ink sm:text-[17px] lg:text-[19px]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springs.snappy}>
            {beatLine(beat, money)}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite">{`${BEATS[beat]}. ${beatLine(beat, money)}`}</p>
    </div>
  );
}
