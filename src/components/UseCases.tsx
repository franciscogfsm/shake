"use client";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LEFT, RIGHT, springs } from "@/components/Mark";
import { haptic } from "@/lib/client/sfx";

type MV = MotionValue<number>;
type Case = { id: string; tag: "Works today" | "Coming next"; where: string; title: string; sub: string; steps: [string, string, string]; beats: [string, string, string] };

// Amounts are illustrative examples, not data.
const CASES: Case[] = [
  {
    id: "car", tag: "Works today", where: "Buying a car on OLX",
    title: "He drives out knowing the money is real.",
    sub: "No envelope of cash. No transfer screenshot. The car is paid the moment the keys are in your hand.",
    beats: ["You lock the money", "He sees it’s real, so he drives", "Keys for a scan · paid"],
    steps: ["You lock €8,500 before he leaves home.", "His phone shows it: real, locked for him.", "Keys in hand, you scan his QR. Paid in 5 seconds."],
  },
  {
    id: "flat", tag: "Works today", where: "Renting a flat",
    title: "No keys, no deposit.",
    sub: "Fake landlords collect deposits for flats they don't own. Yours waits until you're standing inside.",
    beats: ["You lock the deposit", "Screenshots don’t count. This does.", "Keys in hand · paid"],
    steps: ["You lock the €1,200 deposit.", "The landlord sees it's real, not a screenshot.", "At the flat, keys in hand, you scan. No flat? It comes back."],
  },
  {
    id: "parcel", tag: "Works today", where: "Selling on Vinted, shipped",
    title: "The QR travels in the box.",
    sub: "You ship knowing the money is locked. They pay only once the parcel is in their hands.",
    beats: ["Buyer locks the money", "The QR goes in the box", "Box opened, QR scanned · paid"],
    steps: ["The buyer locks €45 before you ship.", "You put the one-time QR inside the box.", "They open it and scan. You're paid."],
  },
  {
    id: "night", tag: "Coming next", where: "Paying the crew for one night",
    title: "Everyone who shows up gets paid.",
    sub: "Lock the night's pay up front. Each person checks in at the door with their QR. At close, everyone who came is paid at once.",
    beats: ["You lock everyone’s pay", "They check in at the door", "Close: paid, no-show refunded"],
    steps: ["You lock €120 for each of six people.", "Each one checks in at the door with their QR.", "At close, everyone who came is paid. No-shows come back to you."],
  },
];
const N = CASES.length;

/** Scroll-pinned story: the page stays still, scrolling picks the use case, and each one plays itself like a short film. */
export function UseCases() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(N - 1, Math.max(0, Math.floor(p * N)));
    if (next !== idx) { haptic.tick(); setIdx(next); }
  });
  // the film's own clock: plays through, holds on the payoff, replays
  const lp = useMotionValue(0);
  const [step, setStep] = useState(0);
  useMotionValueEvent(lp, "change", (v) => { const s = v < 0.24 ? 0 : v < 0.64 ? 1 : 2; if (s !== step) setStep(s); });
  useEffect(() => {
    if (reduce) { lp.set(1); return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ctl: ReturnType<typeof animate> | undefined;
    const play = () => { lp.set(0); ctl = animate(lp, 1, { duration: 12, ease: "linear", onComplete: () => { timer = setTimeout(play, 2800); } }); };
    play();
    return () => { ctl?.stop(); clearTimeout(timer); };
  }, [idx, reduce, lp]);
  const c = CASES[idx];
  const hint = useTransform(scrollYProgress, [0, 0.04], [1, 0]);
  const t = reduce ? { duration: 0 } : springs.smooth;

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (el.offsetHeight - window.innerHeight) * (i / N) + 4, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section ref={ref} style={{ height: `${N * 90 + 100}svh` }} className="relative" aria-label="Use cases">
      <div className="sticky top-[calc(5.25rem+max(env(safe-area-inset-top),16px))] flex h-[calc(100svh-5.25rem-max(env(safe-area-inset-top),16px))] min-h-0 flex-col justify-center gap-3 overflow-y-auto py-3 lg:top-[calc(3rem+max(env(safe-area-inset-top),16px))] lg:h-[calc(100svh-3rem-max(env(safe-area-inset-top),16px))] lg:gap-10 lg:py-4">
        <nav className="grid grid-cols-4 gap-2" aria-label="Choose a use case">
          {CASES.map((x, i) => <Segment key={x.id} fill={i === idx ? lp : i < idx ? 1 : 0} label={x.where} active={i === idx} onClick={() => jump(i)} />)}
        </nav>

        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-14">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={c.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={t}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="eyebrow">{String(idx + 1).padStart(2, "0")} · {c.where}</span>
                <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${c.tag === "Works today" ? "border-safe/40 text-safe" : "border-line text-ink-2"}`}>{c.tag}</span>
              </div>
              <h2 className="display mt-3 text-[32px] leading-[0.98] sm:text-[44px] lg:text-[58px]">{c.title}</h2>
              <p className="mt-3 hidden max-w-[40ch] text-[15px] leading-snug text-ink-2 sm:block lg:text-lg">{c.sub}</p>
              <ol className="mt-4 space-y-2 lg:mt-8 lg:space-y-3.5">
                {c.steps.map((s, i) => (
                  <li key={s} className={`flex items-start gap-3 transition-opacity duration-300 ${i <= step ? "opacity-100" : "opacity-35"} ${i === step ? "" : "max-sm:hidden"}`}>
                    <span className={`step-dot !size-6 shrink-0 font-mono text-[10px] transition-colors duration-300 ${i === step ? "text-safe" : "text-ink-2"}`}>{i < step ? "✓" : i + 1}</span>
                    <span className={`pt-0.5 text-[14px] leading-snug lg:text-[16px] ${i === step ? "text-ink" : "text-ink-2"}`}>{s}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-center gap-3">
            {/* what's happening right now, in words, so the film reads without the text beside it */}
            <div className="flex h-8 justify-center" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${c.id}${step}`} initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={t}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3.5 text-[13px] text-ink">
                  <span className="grid size-6 place-items-center rounded-full bg-safe font-mono text-[11px] text-on-safe">{step + 1}</span>{c.beats[step]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="glass relative aspect-[10/7] w-full overflow-hidden" aria-hidden>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={c.id} className="absolute inset-0" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={t}>
                  <Film i={idx} lp={lp} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <motion.p style={{ opacity: hint }} className="eyebrow text-center">Scroll for the next one</motion.p>
      </div>
    </section>
  );
}

function Segment({ fill, label, active, onClick }: { fill: MV | number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "step" : undefined} className="group min-h-11 text-left">
      <span className="block h-[3px] overflow-hidden rounded-full bg-white/10">
        <motion.span className="block h-full origin-left rounded-full bg-safe" style={{ scaleX: fill }} />
      </span>
      <span className={`mt-2 hidden truncate text-[12px] transition-colors sm:block ${active ? "text-ink" : "text-mute group-hover:text-ink-2"}`}>{label}</span>
    </button>
  );
}

/** One scene, driven by a 0..1 timeline. */
function Film({ i, lp }: { i: number; lp: MV }) {
  const Scene = [Car, Flat, Parcel, Night][i];
  return (
    <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <filter id="uc-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        <radialGradient id="uc-spot"><stop offset="0" stopColor="var(--safe)" stopOpacity=".35" /><stop offset="1" stopColor="var(--safe)" stopOpacity="0" /></radialGradient>
        <linearGradient id="uc-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--safe)" stopOpacity=".32" /><stop offset="1" stopColor="var(--safe)" stopOpacity="0" /></linearGradient>
        <linearGradient id="uc-lamp" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#ffe7b0" stopOpacity=".4" /><stop offset="1" stopColor="#ffe7b0" stopOpacity="0" /></linearGradient>
        <linearGradient id="uc-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a323c" /><stop offset="1" stopColor="#13171c" /></linearGradient>
        <linearGradient id="uc-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe7b0" stopOpacity=".55" /><stop offset="1" stopColor="#ffe7b0" stopOpacity="0" /></linearGradient>
      </defs>
      <Scene lp={lp} />
    </svg>
  );
}

/* ---------- building blocks ---------- */

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Fades a group in over [a,b] and out over [c,d], with a small rise. */
function Fade({ lp, at, children, rise = 5 }: { lp: MV; at: [number, number, number?, number?]; children: React.ReactNode; rise?: number }) {
  const [a, b, c = 1.01, d = 1.02] = at;
  const opacity = useTransform(lp, [a, b, c, d], [0, 1, 1, 0]);
  const y = useTransform(lp, [a, b], [rise, 0]);
  return <motion.g style={{ opacity, y }}>{children}</motion.g>;
}

function Check({ lp, at, x, y, s = 1, color = "var(--safe)" }: { lp: MV; at: [number, number]; x: number; y: number; s?: number; color?: string }) {
  const pathLength = useTransform(lp, at, [0, 1]);
  return <motion.path d={`M${x - 5 * s} ${y}l${3.5 * s} ${3.5 * s}L${x + 6 * s} ${y - 4 * s}`} stroke={color} strokeWidth={2.2} style={{ pathLength }} />;
}

const Txt = ({ x, y, size = 11, children, fill = "var(--ink)", mono, anchor = "middle", weight }: { x: number; y: number; size?: number; children: React.ReactNode; fill?: string; mono?: boolean; anchor?: "start" | "middle" | "end"; weight?: number }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight} className={mono ? "font-mono" : "font-display"} letterSpacing={mono ? 0.6 : undefined}>{children}</text>
);

/** A phone in the scene; `glow` lights it up glacier blue when money is locked for its owner. */
function Phone({ x, y, label, glow, children }: { x: number; y: number; label: string; glow?: MV; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {glow && <motion.rect x={-4} y={-4} width={78} height={138} rx={19} stroke="var(--safe)" strokeWidth={6} filter="url(#uc-blur)" style={{ opacity: glow }} />}
      <rect width={70} height={130} rx={15} fill="#0e1115" stroke="rgba(255,255,255,.16)" strokeWidth={1.2} />
      {glow && <motion.rect width={70} height={130} rx={15} stroke="var(--safe)" strokeOpacity={0.7} strokeWidth={1.2} style={{ opacity: glow }} />}
      <rect x={25} y={6} width={20} height={6} rx={3} fill="#000" />
      <Txt x={35} y={27} size={7} mono fill="var(--mute)">{label.toUpperCase()}</Txt>
      {children}
    </g>
  );
}

/** Face ID frame drawing itself, then the amount counting up as the money drops in. Local to a phone. */
function LockIn({ lp, amount }: { lp: MV; amount: number }) {
  const face = useTransform(lp, [0.01, 0.06], [0, 1]);
  const faceS = useTransform(lp, [0.01, 0.06], [1.3, 1]);
  const faceO = useTransform(lp, [0.07, 0.1], [1, 0]);
  const n = useTransform(lp, [0.1, 0.2], [0, amount]);
  const label = useTransform(n, (v) => `€${Math.round(v).toLocaleString("en")}`);
  const ticker = useTransform(lp, [0.09, 0.11, 0.8, 0.82], [0, 1, 1, 0]);
  return (
    <>
      <motion.g style={{ opacity: faceO }}>
        <Txt x={35} y={100} size={8} mono fill="var(--safe)">FACE ID</Txt>
        <motion.path d="M24 50v-6a5 5 0 0 1 5-5h6M46 39h6a5 5 0 0 1 5 5v6M57 66v6a5 5 0 0 1-5 5h-6M35 77h-6a5 5 0 0 1-5-5v-6M31 52v2M50 52v2M40 52v8h-3M33 68q7 5 14 0" transform="translate(-5 0)" stroke="var(--safe)" strokeWidth={1.6} style={{ opacity: face, scale: faceS }} />
      </motion.g>
      <motion.g style={{ opacity: ticker }}>
        <motion.text x={35} y={100} fontSize={13} fill="var(--ink)" textAnchor="middle" className="amount">{label}</motion.text>
        <Fade lp={lp} at={[0.18, 0.21]}>
          <rect x={23} y={106} width={24} height={11} rx={5.5} fill="rgba(143,211,255,.14)" />
          <Txt x={35} y={114} size={6.5} mono fill="var(--safe)">LOCKED</Txt>
        </Fade>
      </motion.g>
    </>
  );
}

/** "€X locked for you ✓" on the other phone, the moment it becomes real. Local to a phone. */
function LockedForYou({ lp, at, amount }: { lp: MV; at: number; amount: string }) {
  return (
    <>
      <Fade lp={lp} at={[0.12, 0.16, at - 0.03, at]}><Txt x={35} y={70} size={8} fill="var(--mute)">Waiting…</Txt></Fade>
      <Fade lp={lp} at={[at, at + 0.04, 0.84, 0.87]}>
        <circle cx={35} cy={58} r={13} fill="rgba(143,211,255,.12)" />
        <Txt x={35} y={95} size={13} weight={600} fill="var(--safe)">{amount}</Txt>
        <Txt x={35} y={107} size={6.5} mono fill="var(--ink-2)">LOCKED FOR YOU</Txt>
      </Fade>
      <Fade lp={lp} at={[at, at + 0.02, 0.84, 0.87]} rise={0}><Check lp={lp} at={[at + 0.02, at + 0.07]} x={35} y={59} s={1.4} /></Fade>
      <Fade lp={lp} at={[0.88, 0.92]}>
        <Txt x={35} y={95} size={15} weight={700} fill="var(--safe)">Paid</Txt>
        <Txt x={35} y={107} size={6.5} mono fill="var(--ink-2)">IN 5 SECONDS</Txt>
      </Fade>
    </>
  );
}

/** The split coin: drops in, waits, then arcs across and snaps shut on arrival with a light burst. */
function Coin({ lp, from, to, fly }: { lp: MV; from: [number, number]; to: [number, number]; fly: [number, number] }) {
  const [a, b] = fly, top = Math.min(from[1], to[1]) - 70;
  const x = useTransform(lp, [a, b], [from[0], to[0]], { ease });
  const y = useTransform(lp, [0, 0.09, 0.16, 0.175, 0.19, a, (a + b) / 2, b], [from[1] - 150, from[1] - 150, from[1] + 3, from[1] - 5, from[1], from[1], top, to[1]]);
  const opacity = useTransform(lp, [0.08, 0.1], [0, 1]);
  const gap = useTransform(lp, [b - 0.015, b + 0.005], [1.3, 0]);
  const neg = useTransform(gap, (v) => -v);
  const scale = useTransform(lp, [b - 0.01, b + 0.01, b + 0.05], [1, 1.3, 1]);
  const spin = useTransform(lp, [a, b], [0, 360]);
  const r1 = useTransform(lp, [b, b + 0.09], [0.5, 3.2]), o1 = useTransform(lp, [b - 0.003, b, b + 0.09], [0, 0.9, 0]);
  const r2 = useTransform(lp, [b + 0.025, b + 0.12], [0.5, 4.4]), o2 = useTransform(lp, [b + 0.02, b + 0.025, b + 0.12], [0, 0.6, 0]);
  const flash = useTransform(lp, [b - 0.005, b + 0.01, b + 0.1], [0, 1, 0.35]);
  return (
    <>
      <motion.circle cx={to[0]} cy={to[1]} r={70} fill="url(#uc-spot)" style={{ opacity: flash }} />
      <motion.circle cx={to[0]} cy={to[1]} r={18} stroke="var(--safe)" strokeWidth={2} style={{ scale: r1, opacity: o1 }} />
      <motion.circle cx={to[0]} cy={to[1]} r={18} stroke="var(--safe)" strokeWidth={1.2} style={{ scale: r2, opacity: o2 }} />
      <motion.g style={{ x, y, opacity }}>
        <motion.g style={{ scale, rotate: spin }}>
          <circle r={20} fill="var(--safe)" opacity={0.35} filter="url(#uc-blur)" />
          <g transform="translate(-15 -15) scale(1.25)">
            <motion.path d={LEFT} fill="var(--safe)" style={{ x: neg }} />
            <motion.path d={RIGHT} fill="var(--safe)" style={{ x: gap }} />
          </g>
        </motion.g>
      </motion.g>
    </>
  );
}

/** A one-time QR with a scan line sweeping over it. Local coords, 30x30 at (x,y). */
const QR_BITS = Array.from({ length: 49 }, (_, i) => {
  const x = i % 7, y = Math.floor(i / 7);
  return (x < 2 && y < 2) || (x > 4 && y < 2) || (x < 2 && y > 4) || (x * 5 + y * 3 + x * y) % 4 === 0;
});
function Qr({ lp, at, x, y }: { lp: MV; at: [number, number]; x: number; y: number }) {
  const beam = useTransform(lp, at, [0, 30]);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-3} y={-3} width={36} height={36} rx={5} fill="#f3f5f7" />
      {QR_BITS.map((on, i) => on && <rect key={i} x={(i % 7) * 30 / 7} y={Math.floor(i / 7) * 30 / 7} width={30 / 7 + 0.2} height={30 / 7 + 0.2} fill="#0d0f12" />)}
      <motion.rect x={-6} width={42} height={2} rx={1} fill="var(--safe)" style={{ y: beam }} />
    </g>
  );
}

function Key({ lp, from, to, at }: { lp: MV; from: [number, number]; to: [number, number]; at: [number, number] }) {
  const [a, b] = at;
  const x = useTransform(lp, [a, b], [from[0], to[0]], { ease });
  const y = useTransform(lp, [a, (a + b) / 2, b], [from[1], Math.min(from[1], to[1]) - 50, to[1]]);
  const rotate = useTransform(lp, [a, b], [0, -320]);
  const opacity = useTransform(lp, [a - 0.01, a, b + 0.03, b + 0.06], [0, 1, 1, 0]);
  return (
    <motion.g style={{ x, y, opacity, rotate }}>
      <circle r={5} stroke="#ffd98a" strokeWidth={2} />
      <path d="M5 0h11m-4 0v4m-4-4v3" stroke="#ffd98a" strokeWidth={2} />
    </motion.g>
  );
}

const Ground = ({ y = 238 }: { y?: number }) => <path d={`M0 ${y}H400`} stroke="rgba(255,255,255,.1)" />;

/* ---------- 01 · the car ---------- */

function Car({ lp }: { lp: MV }) {
  const drive = useTransform(lp, [0.26, 0.58], [290, 0], { ease });
  const wheel = useTransform(lp, [0.26, 0.58], [0, -1440], { ease });
  const bob = useTransform(lp, (v) => (v > 0.26 && v < 0.56 ? Math.sin(v * 320) * 0.8 : 0));
  // the nose dips as it brakes, then settles
  const brake = useTransform(lp, [0.55, 0.585, 0.62], [0, 2.2, 0]);
  const lines = useTransform(lp, [0.27, 0.31, 0.5, 0.57], [0, 0.8, 0.8, 0]);
  const sky = useTransform(lp, [0.26, 0.58], [0, -36], { ease });
  const glow = useTransform(lp, [0.2, 0.26, 0.84, 0.88, 0.9], [0, 0.9, 0.9, 0.5, 1]);
  const lamp = useTransform(lp, [0.26, 0.3, 0.6, 0.64], [0, 1, 1, 0]);
  return (
    <>
      <motion.g style={{ x: sky }} fill="rgba(255,255,255,.028)">
        {[[0, 40, 70], [44, 26, 96], [74, 44, 58], [124, 30, 84], [158, 50, 66], [214, 28, 104], [246, 44, 72], [296, 34, 90], [334, 46, 62], [384, 30, 86], [418, 40, 70]].map(([x, w, h]) => (
          <g key={x}>
            <rect x={x} y={250 - h} width={w} height={h} rx={2} />
            {Array.from({ length: Math.floor(h / 16) }, (_, k) => <rect key={k} x={x + 6} y={250 - h + 8 + k * 16} width={w - 12} height={3} rx={1} fill="rgba(255,231,176,.05)" />)}
          </g>
        ))}
      </motion.g>
      <Ground y={252} />
      <path d="M0 264H400" stroke="rgba(255,255,255,.08)" strokeDasharray="14 12" />
      <motion.g style={{ x: drive, y: bob }}>
        <g transform="translate(140 248)">
          <ellipse cx={61} cy={4} rx={64} ry={4} fill="#000" opacity={0.55} />
          <motion.path d="M3 -17L-74 -32V-1Z" fill="url(#uc-lamp)" style={{ opacity: lamp }} />
          <motion.g style={{ opacity: lines }} stroke="rgba(255,255,255,.35)" strokeWidth={1.4}>
            <path d="M132 -32h22M138 -20h28M130 -8h18" />
          </motion.g>
          <motion.g style={{ rotate: brake, originX: 0.5, originY: 1 }}>
            <path d="M2 -8Q0 -10 1 -16L4 -21Q6 -24 12 -25L34 -28Q40 -29 46 -35L54 -42Q57 -44 62 -44H86Q92 -44 96 -40L106 -30Q108 -28 112 -27L116 -26Q121 -25 121 -19V-10Q121 -7 118 -7H4Z" fill="url(#uc-body)" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
            <path d="M45 -30L55 -39Q57 -41 60 -41H71V-30ZM75 -41H86Q89 -41 91 -39L100 -30H75Z" fill="rgba(143,211,255,.24)" />
            <path d="M73 -29V-10M60 -22h6M86 -22h6" stroke="rgba(255,255,255,.14)" strokeWidth={1.2} />
            <path d="M3 -18h6" stroke="#ffe7b0" strokeWidth={3} />
            <path d="M116 -21h4" stroke="#ff9f5a" strokeWidth={3} />
          </motion.g>
          {[26, 96].map((cx) => (
            <g key={cx} transform={`translate(${cx} -6)`}>
              <circle r={10.5} fill="#07090b" stroke="rgba(255,255,255,.28)" strokeWidth={1.2} />
              <circle r={4.5} fill="#2a313a" />
              <motion.g style={{ rotate: wheel }}>
                <circle cy={-7.5} r={1.4} fill="rgba(255,255,255,.55)" />
                <circle cy={7.5} r={1.4} fill="rgba(255,255,255,.25)" />
              </motion.g>
            </g>
          ))}
          <Fade lp={lp} at={[0.28, 0.32, 0.54, 0.58]}><Pill x={61} y={-58} text="ON HIS WAY" /></Fade>
          <Fade lp={lp} at={[0.6, 0.63, 0.74, 0.77]}><Pill x={61} y={-58} text="ARRIVED" /></Fade>
        </g>
      </motion.g>

      <Phone x={30} y={56} label="You"><LockIn lp={lp} amount={8500} />
        <Fade lp={lp} at={[0.86, 0.9]}><Txt x={35} y={100} size={12} weight={600}>Keys</Txt><Check lp={lp} at={[0.88, 0.93]} x={35} y={112} /></Fade>
      </Phone>
      <Phone x={300} y={56} label="Seller" glow={glow}>
        <LockedForYou lp={lp} at={0.24} amount="€8,500" />
        <Fade lp={lp} at={[0.66, 0.69, 0.8, 0.83]}><Qr lp={lp} at={[0.7, 0.8]} x={20} y={42} /></Fade>
      </Phone>
      <Key lp={lp} from={[200, 222]} to={[65, 150]} at={[0.7, 0.79]} />
      <Coin lp={lp} from={[65, 114]} to={[335, 114]} fly={[0.8, 0.88]} />
    </>
  );
}

const Pill = ({ x, y, text }: { x: number; y: number; text: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-34} y={-10} width={68} height={18} rx={9} fill="rgba(13,15,18,.85)" stroke="rgba(143,211,255,.35)" />
    <Txt x={0} y={3} size={7.5} mono fill="var(--safe)">{text}</Txt>
  </g>
);

/* ---------- 02 · the flat ---------- */

function Flat({ lp }: { lp: MV }) {
  const fakeX = useTransform(lp, [0.26, 0.32], [90, 0], { ease });
  const jitter = useTransform(lp, (v) => (v > 0.4 && v < 0.46 ? Math.sin(v * 900) * 3 : 0));
  const fakeO = useTransform(lp, [0.26, 0.3, 0.46, 0.5], [0, 1, 1, 0]);
  const strike = useTransform(lp, [0.4, 0.45], [0, 1]);
  const door = useTransform(lp, [0.66, 0.76], [1, 0.12], { ease });
  const spill = useTransform(lp, [0.66, 0.76], [0, 1]);
  const lights = useTransform(lp, [0.7, 0.78], [0.1, 1]);
  const glow = useTransform(lp, [0.5, 0.56, 0.84, 0.88, 0.9], [0, 0.9, 0.9, 0.5, 1]);
  return (
    <>
      <Ground />
      <path d="M140 126L200 78L260 126" stroke="rgba(255,255,255,.3)" strokeWidth={1.4} />
      <rect x={150} y={118} width={100} height={120} fill="#12161b" stroke="rgba(255,255,255,.2)" strokeWidth={1.2} />
      {[[162, 134], [214, 134], [162, 166], [214, 166]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width={24} height={20} rx={2} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.14)" />
          <motion.rect x={x} y={y} width={24} height={20} rx={2} fill="#ffe7b0" style={{ opacity: lights }} fillOpacity={0.3} />
        </g>
      ))}
      <motion.path d="M187 238H213L238 272H162Z" fill="url(#uc-door)" style={{ opacity: spill }} />
      <rect x={187} y={196} width={26} height={42} fill="#ffe7b0" fillOpacity={0.5} />
      <motion.rect x={187} y={196} width={26} height={42} fill="#1d232a" stroke="rgba(255,255,255,.25)" style={{ scaleX: door, originX: 0 }} />

      <Phone x={24} y={56} label="You"><LockIn lp={lp} amount={1200} />
        <Fade lp={lp} at={[0.86, 0.9]}><Txt x={35} y={100} size={12} weight={600}>Keys</Txt><Check lp={lp} at={[0.88, 0.93]} x={35} y={112} /></Fade>
      </Phone>
      <Phone x={306} y={56} label="Landlord" glow={glow}>
        <LockedForYou lp={lp} at={0.54} amount="€1,200" />
        <Fade lp={lp} at={[0.68, 0.7, 0.8, 0.83]}><Qr lp={lp} at={[0.7, 0.8]} x={20} y={42} /></Fade>
      </Phone>

      {/* the screenshot a fake landlord would accept: it glitches and gets struck off */}
      <motion.g style={{ x: fakeX, opacity: fakeO }}>
        <motion.g style={{ x: jitter }}>
          <rect x={300} y={92} width={82} height={50} rx={8} fill="#1a0f10" stroke="var(--danger)" strokeOpacity={0.7} />
          <Txt x={341} y={112} size={8} mono fill="var(--danger)">SCREENSHOT</Txt>
          <Txt x={341} y={128} size={10} fill="var(--ink-2)">“Transfer sent”</Txt>
          <motion.path d="M306 98L376 136" stroke="var(--danger)" strokeWidth={2.4} style={{ pathLength: strike }} />
          <motion.path d="M376 98L306 136" stroke="var(--danger)" strokeWidth={2.4} style={{ pathLength: strike }} />
        </motion.g>
      </motion.g>

      <Key lp={lp} from={[200, 218]} to={[59, 150]} at={[0.7, 0.8]} />
      <Coin lp={lp} from={[59, 114]} to={[341, 114]} fly={[0.8, 0.88]} />
    </>
  );
}

/* ---------- 03 · the parcel ---------- */

function Parcel({ lp }: { lp: MV }) {
  const flapL = useTransform(lp, [0.26, 0.3, 0.42, 0.46, 0.64, 0.68], [0, -150, -150, 0, 0, -150]);
  const flapR = useTransform(flapL, (v) => -v);
  const travel = useTransform(lp, [0.5, 0.64], [0, -96], { ease });
  const bump = useTransform(lp, (v) => (v > 0.5 && v < 0.64 ? -Math.abs(Math.sin((v - 0.5) * 70)) * 5 : 0));
  const tape = useTransform(lp, [0.46, 0.5, 0.64, 0.66], [0, 1, 1, 0]);
  const cardX = useTransform(lp, [0.3, 0.4], [337, 196], { ease });
  const cardY = useTransform(lp, [0.3, 0.35, 0.42], [104, 60, 192]);
  const cardS = useTransform(lp, [0.3, 0.42], [1, 0.6]);
  const cardO = useTransform(lp, [0.28, 0.3, 0.41, 0.43], [0, 1, 1, 0]);
  const popY = useTransform(lp, [0.68, 0.74], [8, -44], { ease });
  const popO = useTransform(lp, [0.67, 0.69, 0.84, 0.87], [0, 1, 1, 0]);
  const dust = useTransform(lp, [0.5, 0.53, 0.6, 0.64], [0, 0.6, 0.6, 0]);
  const scan = useTransform(lp, [0.74, 0.76, 0.8, 0.82], [0, 1, 1, 0]);
  const glow = useTransform(lp, [0.16, 0.22, 0.84, 0.88, 0.9], [0, 0.9, 0.9, 0.5, 1]);
  return (
    <>
      <Ground />
      <path d="M110 250H300" stroke="rgba(255,255,255,.07)" strokeDasharray="3 7" />
      <motion.g style={{ x: travel, y: bump }}>
        <g transform="translate(206 216)">
          <motion.g style={{ opacity: popO, y: popY }}>
            <g transform="translate(-15 -15)"><Qr lp={lp} at={[0.76, 0.82]} x={0} y={0} /></g>
          </motion.g>
          <rect x={-32} y={-22} width={64} height={44} rx={3} fill="#1b2027" stroke="rgba(255,255,255,.26)" strokeWidth={1.2} />
          <motion.path d="M-32 -22H0" stroke="rgba(255,255,255,.4)" strokeWidth={2.4} style={{ rotate: flapL, originX: 0, originY: 0.5 }} />
          <motion.path d="M0 -22H32" stroke="rgba(255,255,255,.4)" strokeWidth={2.4} style={{ rotate: flapR, originX: 1, originY: 0.5 }} />
          <motion.rect x={-5} y={-22} width={10} height={44} fill="rgba(143,211,255,.22)" style={{ opacity: tape }} />
          <Txt x={0} y={14} size={6.5} mono fill="var(--mute)">FRAGILE</Txt>
          <motion.g style={{ opacity: dust }} stroke="rgba(255,255,255,.3)" strokeWidth={1.3}><path d="M40 -6h16M44 6h20M38 16h12" /></motion.g>
        </g>
      </motion.g>
      <motion.g style={{ x: cardX, y: cardY, scale: cardS, opacity: cardO }}>
        <g transform="translate(-15 -15)"><Qr lp={lp} at={[2, 3]} x={0} y={0} /></g>
      </motion.g>

      <Phone x={24} y={56} label="Buyer"><LockIn lp={lp} amount={45} />
        <motion.g style={{ opacity: scan }}>
          <path d="M20 46v-6h6M44 40h6v6M50 70v6h-6M26 76h-6v-6" stroke="var(--safe)" strokeWidth={1.6} />
        </motion.g>
        <Fade lp={lp} at={[0.86, 0.9]}><Txt x={35} y={100} size={11} weight={600}>Opened</Txt><Check lp={lp} at={[0.88, 0.93]} x={35} y={112} /></Fade>
      </Phone>
      <Phone x={306} y={56} label="You" glow={glow}>
        <LockedForYou lp={lp} at={0.2} amount="€45" />
      </Phone>
      <Coin lp={lp} from={[59, 114]} to={[341, 114]} fly={[0.8, 0.88]} />
    </>
  );
}

/* ---------- 04 · the night ---------- */

const CREW = ["DJ", "Bar", "Door", "Sound", "Lights", "Bar"];
const NO_SHOW = 4;

function Night({ lp }: { lp: MV }) {
  const pool = useTransform(lp, [0.04, 0.16, 0.78, 0.9], [0, 720, 720, 0]);
  const poolTxt = useTransform(pool, (v) => `€${Math.round(v)}`);
  const clock = useTransform(lp, [0.28, 0.76], [22 * 60, 27 * 60]);
  const clockTxt = useTransform(clock, (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.floor(m % 60 / 15) * 15).padStart(2, "0")}`);
  const party = useTransform(lp, [0.3, 0.36, 0.7, 0.76], [0, 1, 1, 0]);
  const swayL = useTransform(lp, [0.3, 0.72], [-28, 22]);
  const swayR = useTransform(swayL, (v) => -v);
  const back = useTransform(lp, [0.92, 0.96], [0, 1]);
  return (
    <>
      <motion.g style={{ opacity: party }}>
        <motion.path d="M90 -10L40 260H150Z" fill="url(#uc-beam)" style={{ rotate: swayL, originX: 0.5, originY: 0 }} />
        <motion.path d="M310 -10L250 260H360Z" fill="url(#uc-beam)" style={{ rotate: swayR, originX: 0.5, originY: 0 }} />
      </motion.g>
      <Ground y={246} />
      <circle cx={200} cy={52} r={26} fill="rgba(143,211,255,.08)" stroke="rgba(143,211,255,.35)" strokeWidth={1.2} />
      <g transform="translate(185 37) scale(1.25)"><path d={LEFT} fill="var(--safe)" opacity={0.85} /><path d={RIGHT} fill="var(--safe)" opacity={0.85} /></g>
      <motion.text x={200} y={96} fontSize={14} fill="var(--ink)" textAnchor="middle" className="amount">{poolTxt}</motion.text>
      <Txt x={200} y={20} size={7} mono fill="var(--mute)">YOU · TONIGHT&apos;S PAY</Txt>
      <motion.g style={{ opacity: party }}><motion.text x={372} y={24} fontSize={11} fill="var(--ink-2)" textAnchor="end" className="font-mono">{clockTxt}</motion.text></motion.g>
      <Fade lp={lp} at={[0.76, 0.8]}><Txt x={372} y={24} size={10} mono fill="var(--ink-2)" anchor="end">CLOSE</Txt></Fade>
      <Fade lp={lp} at={[0.92, 0.96]}><Txt x={200} y={112} size={8} mono fill="var(--safe)">€120 BACK TO YOU</Txt></Fade>
      {CREW.map((who, i) => <Member key={i} lp={lp} i={i} who={who} />)}
      <motion.circle cx={200} cy={52} r={30} stroke="var(--safe)" strokeWidth={1.4} style={{ opacity: back, scale: back }} />
    </>
  );
}

function Member({ lp, i, who }: { lp: MV; i: number; who: string }) {
  const x0 = 45 + i * 62, show = i !== NO_SHOW, inAt = 0.36 + i * 0.06, payAt = 0.8 + i * 0.012;
  // chip: from the pool to above the person, then into their pocket (or back home for the no-show)
  const cx = useTransform(lp, [0.16 + i * 0.015, 0.26 + i * 0.015, 0.84, 0.92], [200, x0, x0, show ? x0 : 200], { ease });
  const cy = useTransform(lp, [0.16 + i * 0.015, 0.26 + i * 0.015, payAt, payAt + 0.05, 0.84, 0.92], show ? [52, 150, 150, 186, 186, 186] : [52, 150, 150, 150, 150, 52]);
  const co = useTransform(lp, show ? [0.15 + i * 0.015, 0.17 + i * 0.015, payAt + 0.04, payAt + 0.06] : [0.15 + i * 0.015, 0.17 + i * 0.015, 0.9, 0.93], [0, 1, 1, 0]);
  const lit = useTransform(lp, show ? [inAt, inAt + 0.02] : [2, 3], [0, 1]);
  const hop = useTransform(lp, show ? [inAt, inAt + 0.015, inAt + 0.035] : [2, 3, 4], [0, -9, 0]);
  const walk = useTransform(lp, show ? [inAt - 0.05, inAt] : [2, 3], [16, 0]);
  const dim = useTransform(lp, show ? [0.28, 0.3] : [0.6, 0.66], show ? [0.35, 1] : [0.35, 0.2]);
  return (
    <>
      <motion.g style={{ y: hop, x: walk, opacity: dim }}>
        <circle cx={x0} cy={194} r={10} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
        <path d={`M${x0 - 17} 236q0 -24 17 -24t17 24`} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
        <motion.g style={{ opacity: lit }}>
          <circle cx={x0} cy={194} r={10} stroke="var(--safe)" strokeWidth={1.6} />
          <path d={`M${x0 - 17} 236q0 -24 17 -24t17 24`} stroke="var(--safe)" strokeWidth={1.6} />
        </motion.g>
        <Txt x={x0} y={230} size={7} mono fill="var(--ink-2)">{who.toUpperCase()}</Txt>
      </motion.g>
      {show ? (
        <>
          <Fade lp={lp} at={[inAt + 0.01, inAt + 0.03, payAt, payAt + 0.02]} rise={0}><Check lp={lp} at={[inAt + 0.01, inAt + 0.04]} x={x0} y={262} s={0.9} /></Fade>
          <Fade lp={lp} at={[payAt + 0.04, payAt + 0.07]}><Txt x={x0} y={266} size={9} mono fill="var(--safe)">€120 ✓</Txt></Fade>
        </>
      ) : <Fade lp={lp} at={[0.64, 0.68]}><Txt x={x0} y={266} size={8} mono fill="var(--mute)">NO-SHOW</Txt></Fade>}
      <motion.g style={{ x: cx, y: cy, opacity: co }}>
        <circle r={8} fill="#0d0f12" stroke="var(--safe)" strokeWidth={1.4} />
        <Txt x={0} y={3} size={8} weight={700} fill="var(--safe)">€</Txt>
      </motion.g>
    </>
  );
}

export function UseCasesEnd() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h2 className="display text-[34px] leading-[0.98] lg:text-[52px]">Whatever the deal,<br /><span className="glacier-text">it pays when you meet.</span></h2>
      <Link href="/deal/new" onPointerDown={() => haptic.tick()} className="btn-liquid relative mt-2 inline-flex h-14 items-center overflow-hidden rounded-full px-8 font-display text-[17px] font-medium text-on-safe">Start a safe payment</Link>
    </div>
  );
}
