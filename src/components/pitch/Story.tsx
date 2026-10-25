"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { LEFT, Mark, RIGHT, springs } from "@/components/Mark";
import { HashTyper, NumberTicker } from "@/components/Ticker";
import { TestnetNote } from "@/components/ui";
import { haptic } from "@/lib/client/sfx";
import { DEAL_CONTRACT_ID, PASSKEY, TOKEN_CONTRACT_ID, explorer } from "@/lib/config";

export const PARTS: { chip: string; icon: string; title: string; body: string; href?: string }[] = [
  { chip: "Soroban", icon: "stellar", title: "Stellar smart contracts", body: "Pays only with the secret inside the seller's one-time QR.", href: explorer.contract(DEAL_CONTRACT_ID) },
  { chip: "Passkey", icon: "passkey", title: "Face ID wallet", body: "A smart account guarded by a passkey. Nothing to write down.", href: explorer.contract(PASSKEY.webauthnVerifier) },
  { chip: "OpenZeppelin", icon: "openzeppelin", title: "Sponsored fees", body: "Channels sponsors network fees, with SHAKE's own pool as a fallback.", href: "https://docs.openzeppelin.com/relayer" },
  { chip: "Test assets", icon: "token", title: "Four test currencies", body: "tEUR, tUSD, tGBP and tBRL as Stellar Asset Contracts.", href: explorer.contract(TOKEN_CONTRACT_ID) },
  { chip: "SEP-24", icon: "anchor", title: "Testnet cash-out", body: "Live transfer to the test anchor. Bank settlement runs in sandbox mode.", href: "/.well-known/stellar.toml" },
  { chip: "Receipts", icon: "proof", title: "On-chain proof", body: "Shared links show the locked money, read from the chain.", href: "/try" },
];

const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-12% 0px" }, transition: springs.smooth };

/** Below the hero: the whole idea, told by scrolling. Problem → handshake → why it can't be faked → what else → proof → your turn. */
export function Story({ onStart, money }: { onStart: () => void; money: string }) {
  return (
    <div className="overflow-x-clip">
      <Problem />
      <Handshake />
      <Presence />
      <Only />
      <Stellar />
      <Finale onStart={onStart} money={money} />
    </div>
  );
}

/* ───────────── 1. The problem: a screenshot glitches into a fake ───────────── */

function Problem() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [stage, setStage] = useState(reduce ? 2 : 0);
  useMotionValueEvent(p, "change", (v) => !reduce && setStage(v < 0.3 ? 0 : v < 0.55 ? 1 : 2));
  const tilt = useTransform(p, [0, 1], [-6, 4]);
  const lift = useTransform(p, [0, 1], [40, -30]);

  return (
    <section ref={ref} className="relative h-[230svh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-8 lg:grid lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <div className="eyebrow">The problem</div>
          <h2 className="display mt-3 text-[34px] leading-[1.02] lg:text-[56px]">
            <ScrollWords p={p} range={[0.02, 0.5]} text="Who goes first? They won’t hand it over for a screenshot." />
            <br />
            <motion.span className="glacier-text" animate={{ opacity: stage === 2 ? 1 : 0.12 }} transition={{ duration: 0.4 }}>
              And screenshots lie.
            </motion.span>
          </h2>
          <motion.div className="mt-6 grid max-w-[460px] grid-cols-2 gap-3" animate={{ opacity: stage === 2 ? 1 : 0, y: stage === 2 ? 0 : 14 }} transition={springs.smooth}>
            <Stat value={4467} label="MB WAY scam complaints in Portugal, 2024" href="https://dinheirovivo.dn.pt/economia/queixas-por-burlas-via-mbway-aumentaram-6-em-2024" />
            <Stat value={121} prefix="€" suffix="bn" label="second-hand sold in Europe in 2025" href="https://www.retaildetail.eu/news/general/second-hand-marketplaces-drive-innovation-in-e-commerce/" />
          </motion.div>
        </div>
        <motion.div className="order-1 flex justify-center lg:order-2" style={reduce ? undefined : { rotate: tilt, y: lift }}>
          <FakeShot stage={stage} />
        </motion.div>
      </div>
    </section>
  );
}

function ScrollWords({ text, p, range }: { text: string; p: MotionValue<number>; range: [number, number] }) {
  const words = text.split(" ");
  const step = (range[1] - range[0]) / words.length;
  return (
    <>
      {words.map((w, i) => (
        <Word key={i} p={p} at={[range[0] + i * step, range[0] + (i + 1) * step]}>{w}</Word>
      ))}
    </>
  );
}

function Word({ children, p, at }: { children: string; p: MotionValue<number>; at: [number, number] }) {
  const reduce = useReducedMotion();
  const opacity = useTransform(p, at, [0.14, 1]);
  return <motion.span style={{ opacity: reduce ? 1 : opacity }}>{children} </motion.span>;
}

function Stat({ value, label, href, prefix = "", suffix = "" }: { value: number; label: string; href: string; prefix?: string; suffix?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group rounded-2xl border border-line bg-white/[0.025] p-4 transition-colors hover:border-safe/30">
      <div className="amount text-[30px] leading-none lg:text-[40px]">
        {prefix}<NumberTicker value={value} />{suffix}
      </div>
      <div className="mt-2 text-[12px] leading-snug text-mute lg:text-[13px]">{label} <span className="text-ink-2 group-hover:text-safe">↗</span></div>
    </a>
  );
}

/** A bank-app style "Paid ✓" image that tears itself apart as you scroll. */
function FakeShot({ stage }: { stage: number }) {
  const reduce = useReducedMotion();
  const glitch = stage >= 1 && !reduce;
  const card = (
    <div className="w-[248px] rounded-[26px] border border-white/10 bg-[#15181d] p-5 lg:w-[300px] lg:p-6">
      <div className="flex items-center justify-between text-[11px] text-mute"><span>Bank app</span><span>14:02</span></div>
      <div className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-emerald-400/15 text-[22px] text-emerald-300">✓</div>
      <div className="mt-4 text-center text-[13px] text-ink-2">Transfer complete</div>
      <div className="amount mt-1 text-center text-[40px] lg:text-[46px]">€400.00</div>
      <div className="mt-1 text-center text-[13px] text-mute">to Ana R. · ref 88213</div>
      <div className="mt-6 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[12px] text-ink-2">“Paid ✅ send the bike pls”</div>
    </div>
  );
  return (
    <div className="relative scale-[0.82] sm:scale-100" aria-hidden>
      {glitch && (
        <>
          <motion.div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen [filter:hue-rotate(-60deg)_saturate(3)]" animate={{ x: [0, -7, 3, -2, 6, 0], opacity: [0, 0.6, 0.2, 0.7, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.5 }}>{card}</motion.div>
          <motion.div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen [filter:hue-rotate(150deg)_saturate(3)]" animate={{ x: [0, 6, -4, 2, -5, 0], opacity: [0, 0.6, 0.3, 0.6, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.5, delay: 0.05 }}>{card}</motion.div>
        </>
      )}
      <motion.div animate={glitch ? { x: [0, 2, -3, 0], skewX: [0, 4, -2, 0] } : { x: 0, skewX: 0 }} transition={{ duration: 0.35, repeat: glitch ? Infinity : 0, repeatDelay: 0.9 }}>
        {card}
      </motion.div>
      {glitch && <motion.div className="pointer-events-none absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-white/10 to-transparent" animate={{ top: ["0%", "100%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }} />}
      <AnimatePresence>
        {stage === 2 && (
          <motion.div
            className="absolute top-1/2 left-1/2 rounded-xl border-2 border-danger px-4 py-2 font-mono text-[15px] font-bold tracking-[0.18em] whitespace-nowrap text-danger uppercase backdrop-blur-sm lg:text-[18px]"
            initial={{ opacity: 0, scale: 2.2, rotate: -4, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, rotate: -12, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0 }}
            transition={springs.slam}
          >
            Not a payment
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── 2. The handshake: two halves meet as you scroll ───────────── */

const STEPS = [
  { at: 0, n: "01", k: "Lock", title: "You lock the money.", body: "It leaves your wallet, but it isn’t theirs yet. Nobody can just keep it.", badge: "€60 locked" },
  { at: 0.24, n: "02", k: "Verify", title: "They see it’s real.", body: "Read live from Stellar, on their own phone. Not an image you sent.", badge: "€60 locked for you ✓" },
  { at: 0.48, n: "03", k: "Meet", title: "You meet. You check it.", body: "Their phone shows a one-time QR. Yours scans it.", badge: "One-time QR · scanned" },
  { at: 0.74, n: "04", k: "Shake", title: "Paid in 5 seconds.", body: "The two halves meet and the money moves. Not before.", badge: "Paid ✓" },
];

function Handshake() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(reduce ? 3 : 0);
  useMotionValueEvent(p, "change", (v) => {
    if (reduce) return;
    const s = STEPS.findLastIndex((x) => v >= x.at);
    if (s !== step) {
      setStep(s);
      haptic.tick();
    }
  });
  const xl = useTransform(p, [0, 0.8], ["-30vw", "0vw"]);
  const xr = useTransform(p, [0, 0.8], ["30vw", "0vw"]);
  const rl = useTransform(p, [0, 0.8], [-28, 0]);
  const rr = useTransform(p, [0, 0.8], [28, 0]);
  const glow = useTransform(p, [0.7, 0.85], [0, 1]);
  const labels = useTransform(p, [0.5, 0.72], [1, 0]);
  const met = step === 3;
  const s = STEPS[step];

  return (
    <section ref={ref} className={reduce ? "py-24" : "relative h-[420svh]"} aria-label="How it works">
      <div className={reduce ? "" : "sticky top-0 flex h-svh flex-col items-center justify-center"}>
        <div className="eyebrow text-center">How it works</div>
        <h2 className="display mt-2 text-center text-[30px] leading-[1.02] lg:text-[52px]">Like cash. <span className="glacier-text">Without the envelope.</span></h2>

        <div className="relative mt-8 grid h-[min(44vw,240px)] w-full place-items-center lg:mt-12 lg:h-[300px]">
          <motion.div className="absolute size-[min(70vw,420px)] rounded-full bg-safe/25 blur-[70px]" style={{ opacity: reduce ? 1 : glow }} />
          {met && !reduce && (
            <motion.div key="ring" className="absolute size-[min(44vw,260px)] rounded-full border-2 border-safe" initial={{ scale: 0.9, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />
          )}
          <Half side="l" x={reduce ? undefined : xl} r={reduce ? undefined : rl} met={met} />
          <Half side="r" x={reduce ? undefined : xr} r={reduce ? undefined : rr} met={met} />
          {!reduce && (
            <>
              <motion.span className="absolute top-full left-[8%] mt-2 font-mono text-[10px] tracking-[0.16em] text-mute uppercase lg:left-[18%]" style={{ opacity: labels }}>You</motion.span>
              <motion.span className="absolute top-full right-[8%] mt-2 font-mono text-[10px] tracking-[0.16em] text-mute uppercase lg:right-[18%]" style={{ opacity: labels }}>Seller</motion.span>
            </>
          )}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={s.badge}
              className={`absolute -top-3 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap lg:-top-6 lg:text-[15px] ${met ? "bg-safe text-on-safe" : "glass text-ink"}`}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={springs.snappy}
            >
              {s.badge}
            </motion.div>
          </AnimatePresence>
        </div>

        {reduce ? (
          <ol className="mx-auto mt-14 grid max-w-[900px] gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((x) => (
              <li key={x.k}><div className="eyebrow">{x.n} · {x.k}</div><div className="mt-1 font-display text-[20px] font-medium">{x.title}</div><p className="mt-1 text-[14px] text-ink-2">{x.body}</p></li>
            ))}
          </ol>
        ) : (
          <>
            <div className="relative mt-12 h-[120px] w-full max-w-[520px] text-center lg:mt-16">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}>
                  <div className="eyebrow text-safe">{s.n} · {s.k}</div>
                  <div className="display mt-2 text-[28px] leading-[1.05] lg:text-[40px]">{s.title}</div>
                  <p className="mx-auto mt-2 max-w-[34ch] text-[15px] text-ink-2 lg:text-[17px]">{s.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-6 flex w-full max-w-[420px] gap-2">
              {STEPS.map((x, i) => (
                <div key={x.k} className="flex-1">
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full origin-left bg-safe" animate={{ scaleX: i <= step ? 1 : 0 }} transition={springs.smooth} />
                  </div>
                  <div className={`mt-2 font-mono text-[10px] tracking-[0.14em] uppercase ${i === step ? "text-safe" : "text-mute"}`}>{x.k}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Half({ side, x, r, met }: { side: "l" | "r"; x?: MotionValue<string>; r?: MotionValue<number>; met: boolean }) {
  const l = side === "l";
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="absolute size-[min(44vw,240px)] overflow-visible drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] lg:size-[300px]"
      style={{ x, rotate: r }}
      animate={met ? { scale: [1, 1.08, 0.98, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`h${side}`} x1="0" y1="0" x2="1" y2="1">
          {l ? <><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c4c9d1" /></> : <><stop offset="0" stopColor="#bfe6ff" /><stop offset=".6" stopColor="#8fd3ff" stopOpacity=".7" /><stop offset="1" stopColor="#8fd3ff" stopOpacity=".9" /></>}
        </linearGradient>
      </defs>
      <path d={l ? LEFT : RIGHT} fill={`url(#h${side})`} />
      {!l && <path d="M12 2.3A9.7 9.7 0 0 1 12 21.7" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".3" />}
    </motion.svg>
  );
}

/* ───────────── 3. Why it can't be faked: the key lives on their screen ───────────── */

const QR = Array.from({ length: 21 * 21 }, (_, i) => {
  const x = i % 21, y = (i / 21) | 0;
  const finder = (a: number, b: number) => x >= a && x < a + 7 && y >= b && y < b + 7;
  if (finder(0, 0) || finder(14, 0) || finder(0, 14)) {
    const fx = x >= 14 ? x - 14 : x, fy = y >= 14 ? y - 14 : y;
    return fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
  }
  return (x * 31 + y * 17 + x * y * 7) % 7 < 3;
});

function Presence() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-20% 0px" });
  const reduce = useReducedMotion();
  return (
    <section className="py-24 lg:py-36">
      <motion.div {...reveal} className="mx-auto max-w-[760px] text-center">
        <div className="eyebrow">The part nobody else does</div>
        <h2 className="display mt-3 text-[34px] leading-[1.02] lg:text-[60px]">The key lives on <span className="glacier-text">their screen.</span></h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-snug text-ink-2 lg:text-lg">The seller’s phone makes a one-time code and puts only its fingerprint on Stellar. The money moves only when your phone has seen their screen. That’s proof you were in the same place.</p>
      </motion.div>

      <div ref={ref} className="relative mx-auto mt-14 grid max-w-[1000px] gap-4 lg:mt-20 lg:grid-cols-3 lg:gap-6">
        <motion.div className="absolute top-1/2 right-[16%] left-[16%] hidden h-px origin-left bg-gradient-to-r from-safe/0 via-safe/60 to-safe/0 lg:block" initial={{ scaleX: 0 }} animate={{ scaleX: seen ? 1 : 0 }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }} />
        <Card i={0} seen={seen} n="01" title="Seller’s QR" body="A one-time code, only on their live screen.">
          <div className="relative mx-auto size-[132px] overflow-hidden rounded-xl bg-white p-2.5">
            <svg viewBox="0 0 21 21" className="size-full" shapeRendering="crispEdges">{QR.map((on, i) => on && <rect key={i} x={i % 21} y={(i / 21) | 0} width="1" height="1" fill="#0d0f12" />)}</svg>
            {!reduce && <motion.div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-safe/70 to-transparent" animate={{ top: ["-20%", "100%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }} />}
          </div>
        </Card>
        <Card i={1} seen={seen} n="02" title="Fingerprint on Stellar" body="Only the hash is public. The code can’t be guessed from it.">
          <div className="mx-auto flex h-[132px] max-w-[220px] flex-col justify-center rounded-xl border border-line bg-black/30 p-3 text-left">
            <div className="font-mono text-[10px] tracking-[0.12em] text-mute uppercase">sha256(code)</div>
            <div className="mt-1.5 text-[12px] leading-snug text-safe">{seen && <HashTyper text="9f2c41e07ab38d5c16e2f0a9b47d83c1e5a06f7d2b98c4e1" speed={22} />}</div>
          </div>
        </Card>
        <Card i={2} seen={seen} n="03" title="Match, then pay" body="Your phone scans it. The contract checks. Paid.">
          <div className="grid h-[132px] place-items-center">
            <Mark size={96} state={seen ? "shut" : "open"} />
          </div>
        </Card>
      </div>
      <motion.p {...reveal} className="mt-10 text-center font-mono text-[11px] tracking-[0.12em] text-mute uppercase lg:text-[12px]">No QR, no payment · not from a screenshot, a server or us</motion.p>
    </section>
  );
}

function Card({ i, seen, n, title, body, children }: { i: number; seen: boolean; n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <motion.div className="glass relative p-5 text-center lg:p-6" initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={seen ? { opacity: 1, y: 0, scale: 1 } : {}} transition={{ ...springs.smooth, delay: i * 0.18 }}>
      {children}
      <div className="eyebrow mt-5 text-safe">{n}</div>
      <div className="mt-1 font-display text-[19px] font-medium">{title}</div>
      <p className="mx-auto mt-1 max-w-[28ch] text-[14px] text-ink-2">{body}</p>
    </motion.div>
  );
}

/* ───────────── 4. What only SHAKE does ───────────── */

const SHOPS = ["Vinted", "OLX", "eBay", "Wallapop", "Depop", "Etsy", "Facebook Marketplace", "Leboncoin", "Kleinanzeigen", "Marktplaats", "Craigslist"];

function Only() {
  const reduce = useReducedMotion();
  return (
    <section className="py-16 lg:py-28">
      <motion.div {...reveal} className="max-w-[720px]">
        <div className="eyebrow">And it goes further</div>
        <h2 className="display mt-3 text-[34px] leading-[1.02] lg:text-[60px]">Built for the way <span className="glacier-text">people really deal.</span></h2>
      </motion.div>
      <div className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-6 lg:gap-5">
        <Tile className="lg:col-span-4" i={0}>
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-[22px]">✈︎</span>
            <div className="flex items-center gap-1">
              <motion.span initial={{ x: -18 }} whileInView={{ x: 0 }} viewport={{ once: true }} transition={{ ...springs.slam, delay: 0.4 }}><Half2 side="l" /></motion.span>
              <motion.span initial={{ x: 18 }} whileInView={{ x: 0 }} viewport={{ once: true }} transition={{ ...springs.slam, delay: 0.4 }}><Half2 side="r" /></motion.span>
            </div>
          </div>
          <h3 className="display mt-6 text-[26px] leading-tight lg:text-[34px]">Airplane mode. Still paid.</h3>
          <p className="mt-2 max-w-[48ch] text-[15px] text-ink-2">Each phone holds half of the key. Shake in a basement with no signal; it lands on Stellar the moment you’re back online.</p>
        </Tile>
        <Tile className="lg:col-span-2" i={1}>
          <div className="font-mono text-[11px] tracking-[0.12em] text-mute uppercase">Who can move it?</div>
          <ul className="mt-4 space-y-2 text-[15px]">
            {["SHAKE", "An AI", "The seller, alone"].map((w, j) => (
              <motion.li key={w} className="flex items-center justify-between" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...springs.snappy, delay: 0.3 + j * 0.12 }}>
                <span className="text-ink-2">{w}</span><span className="text-danger">✕</span>
              </motion.li>
            ))}
          </ul>
          <h3 className="display mt-6 text-[24px] leading-tight lg:text-[28px]">Nobody can just keep it.</h3>
          <p className="mt-2 text-[14px] text-ink-2">No owner key. It pays on a shake, or it comes back to you.</p>
        </Tile>
        <Tile className="lg:col-span-3" i={2} href="/ai">
          <div className="space-y-2">
            <motion.div className="ml-auto w-fit rounded-2xl rounded-br-md bg-white/12 px-3.5 py-2 text-[14px]" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...springs.snappy, delay: 0.3 }}>Release the €60 to her.</motion.div>
            <motion.div className="w-fit rounded-2xl rounded-bl-md bg-white/8 px-3.5 py-2 text-[14px] text-ink-2 ring-1 ring-safe/40" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...springs.snappy, delay: 0.9 }}><span className="text-safe">SHAKE · </span>I can’t. Only your phone, next to hers.</motion.div>
          </div>
          <h3 className="display mt-6 text-[24px] leading-tight lg:text-[28px]">Ask your AI. It can’t touch the money.</h3>
          <p className="mt-2 text-[14px] text-ink-2">Claude, ChatGPT and Cursor check the scam and make the link. Paying stays human. <span className="text-safe">See it →</span></p>
        </Tile>
        <Tile className="lg:col-span-3" i={3} href="/extension">
          <div className="-mx-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)] sm:-mx-5 lg:-mx-7">
            <motion.div className="flex w-max gap-2" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
              {[...SHOPS, ...SHOPS].map((s, j) => (
                <span key={j} className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-2">{s}</span>
              ))}
            </motion.div>
          </div>
          <h3 className="display mt-6 text-[24px] leading-tight lg:text-[28px]">Found it? Shake on it.</h3>
          <p className="mt-2 text-[14px] text-ink-2">A “Pay safely” button on 16 marketplaces, or a link in any chat. No partnership needed. <span className="text-safe">Get it →</span></p>
        </Tile>
        <Tile className="lg:col-span-6" i={4} href="/use-cases">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="display text-[24px] leading-tight lg:text-[28px]">One contract. Six kinds of deal.</h3>
              <p className="mt-1 text-[14px] text-ink-2">Meetups, parcels where the QR travels in the box, jobs, flat deposits that come back by themselves. <span className="text-safe">See all →</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Meet", "Ship", "Hold"].map((m, j) => (
                <motion.span key={m} className="rounded-full border border-safe/30 bg-safe/[0.08] px-4 py-2 font-mono text-[12px] tracking-[0.12em] text-safe uppercase" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ ...springs.slam, delay: 0.2 + j * 0.1 }}>{m}</motion.span>
              ))}
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}

function Half2({ side }: { side: "l" | "r" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-10 overflow-visible" aria-hidden>
      <path d={side === "l" ? LEFT : RIGHT} fill={side === "l" ? "#e6e9ee" : "#8fd3ff"} fillOpacity={side === "l" ? 1 : 0.8} transform={side === "l" ? "translate(-1 0)" : "translate(1 0)"} />
    </svg>
  );
}

function Tile({ children, className = "", i, href }: { children: React.ReactNode; className?: string; i: number; href?: string }) {
  const body = (
    <motion.div
      className={`group relative h-full overflow-hidden rounded-[28px] border border-line bg-white/[0.025] p-5 transition-colors lg:p-7 ${href ? "hover:border-safe/30 hover:bg-white/[0.04]" : ""}`}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ ...springs.smooth, delay: (i % 2) * 0.08 }}
      whileHover={href ? { y: -4 } : undefined}
    >
      {children}
    </motion.div>
  );
  return href ? <Link href={href} onPointerDown={() => haptic.tick()} className={`block ${className}`}>{body}</Link> : <div className={className}>{body}</div>;
}

/* ───────────── 5. Composed on Stellar, with live numbers ───────────── */

function Stellar() {
  const [s, setS] = useState<{ deals: number; released: number } | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((j) => j && setS(j)).catch(() => {});
  }, []);
  return (
    <section className="py-16 lg:py-28">
      <motion.div {...reveal} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[640px]">
          <div className="eyebrow">Composed on Stellar · all live</div>
          <h2 className="display mt-3 text-[34px] leading-[1.02] lg:text-[60px]">Every step is a <span className="glacier-text">real transaction.</span></h2>
        </div>
        {s && (
          <div className="flex gap-8">
            <div><div className="amount text-[40px] leading-none lg:text-[52px]"><NumberTicker value={s.deals} /></div><div className="mt-1 text-[13px] text-mute">deals locked</div></div>
            <div><div className="amount text-[40px] leading-none text-safe lg:text-[52px]"><NumberTicker value={s.released} /></div><div className="mt-1 text-[13px] text-mute">shaken and paid</div></div>
          </div>
        )}
      </motion.div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-4">
        {PARTS.map((p, i) => (
          <motion.a
            key={p.chip}
            href={p.href}
            target={p.href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group flex gap-4 rounded-[22px] border border-line bg-white/[0.02] p-5 transition-colors hover:border-safe/30 hover:bg-safe/[0.04]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            transition={{ ...springs.smooth, delay: (i % 3) * 0.08 }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-safe/[0.08] transition-transform group-hover:scale-110">
              <Image src={`/integrations/${p.icon}.svg`} alt="" width={22} height={22} unoptimized />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.14em] text-mute uppercase">{p.chip}</div>
              <div className="mt-0.5 font-display text-[17px] font-medium">{p.title} <span className="text-mute transition-colors group-hover:text-safe">↗</span></div>
              <p className="mt-1 text-[14px] leading-snug text-ink-2">{p.body}</p>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}

/* ───────────── 6. Your turn ───────────── */

function Finale({ onStart, money }: { onStart: () => void; money: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-25% 0px" });
  return (
    <section className="relative py-24 text-center lg:py-40">
      <div ref={ref} className="relative mx-auto flex max-w-[720px] flex-col items-center">
        <div className="halo" aria-hidden />
        <Mark size={104} state={seen ? "shut" : "open"} />
        <motion.h2 {...reveal} className="display mt-8 text-[44px] leading-[0.96] lg:text-[84px]">Your turn.</motion.h2>
        <motion.p {...reveal} className="mt-4 max-w-[34ch] text-[17px] leading-snug text-ink-2 lg:text-xl">Lock {money} of test money. Hold to shake. Then open every step on Stellar.</motion.p>
        <motion.div {...reveal} className="mt-8 w-full max-w-[360px]">
          <Button full onClick={onStart}>Try it now · lock {money}</Button>
        </motion.div>
        <Link href="/try" className="mt-4 text-[14px] text-ink-2 hover:text-ink">Or make a real deal with a friend <span className="text-safe">→</span></Link>
      </div>
      <TestnetNote className="mt-20" />
    </section>
  );
}
