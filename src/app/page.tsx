"use client";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { HoldToShake } from "@/components/HoldToShake";
import { CountryPicker, useCountry } from "@/components/Money";
import { LiveReceipt } from "@/components/LiveReceipt";
import { Mark, springs } from "@/components/Mark";
import { haptic, sfx } from "@/lib/client/sfx";
import { Seal } from "@/components/Seal";
import { Item, Protected, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { usePitchSession, type PitchSession } from "@/lib/client/pitchSession";
import { DEAL_CONTRACT_ID, PASSKEY, TOKEN_CONTRACT_ID, explorer, formatMoney } from "@/lib/config";

/**
 * Home: the product explains itself by being used. One tap locks a real €5 on Stellar,
 * the judge shakes (or says "not yet"), then sees every step's on-chain proof.
 */
export default function Home() {
  const [country, setCountry] = useCountry();
  const { session, start, shake, notYet, reset, settling } = usePitchSession(country.currency);
  const currency = session.currency ?? (session.dealId ? "EUR" : country.currency);
  const money = formatMoney(5, currency, country.locale);
  const [refunding, setRefunding] = useState(false);
  const phase = session.status === "done" ? "done" : session.status === "ready" ? "ready" : session.status === "idle" ? "idle" : "working";
  const phaseRef = useRef(phase);
  useEffect(() => {
    const from = phaseRef.current;
    phaseRef.current = phase;
    if (from === "working" && phase === "ready") {
      haptic.success();
      sfx.confirm();
    }
  }, [phase]);

  return (
    <Screen
      wide
      fit
      right={
        <div className="flex items-center gap-2">
          {session.status === "idle" && <CountryPicker country={country} onChange={setCountry} />}
          <a href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer" onPointerDown={() => haptic.tick()} className="eyebrow glass hidden items-center gap-2 !rounded-full px-4 py-2 hover:text-ink lg:flex">
            <span className="pulse-dot" />
            Live on Stellar testnet
          </a>
          <Link href="/check" onPointerDown={() => haptic.tick()} className="eyebrow rounded-full px-3 py-2 hover:text-ink">Scam check</Link>
          <Link href="/try" onPointerDown={() => haptic.tick()} className="eyebrow rounded-full px-3 py-2 hover:text-ink">With a friend</Link>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,380px)] lg:items-center lg:gap-14">
      <div className={`flex min-h-0 flex-col justify-center ${phase === "idle" ? "" : "w-full lg:mx-auto lg:max-w-[420px]"}`}>
      <AnimatePresence mode="wait">
        <motion.div key={phase} className="flex flex-1 flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springs.smooth}>
          {phase === "idle" && <Hero onStart={start} money={money} />}
          {phase === "working" && <Locking money={money} step={!session.wallet ? "wallet" : !session.locked ? "locked" : "joined"} error={session.status === "failed" ? session.error : undefined} />}
          {phase === "ready" && (
            <Stagger className="flex flex-col items-center gap-5 text-center lg:gap-6">
              <Item>
                <div className="eyebrow">You&apos;re at the meetup</div>
                <h1 className="display mt-2 text-[34px] leading-[1.02] lg:text-[52px]">It checks out.<br /><span className="glacier-text">Shake on it.</span></h1>
                <p className="mx-auto mt-3 max-w-[28ch] text-[15px] leading-snug text-ink-2">{money} is locked, and the seller can see it. Hold to pay them.</p>
              </Item>
              <Item>
                <HoldToShake onShake={shake} disabled={settling} hint="Money moves only now" size={188} />
              </Item>
              {session.error && <p className="max-w-[32ch] text-sm text-ink-2" role="alert">{session.error}</p>}
              <Item>
                <Button
                  variant="ghost"
                  className="!h-11"
                  loading={refunding}
                  disabled={settling}
                  onClick={async () => {
                    setRefunding(true);
                    try {
                      await notYet();
                      haptic.success();
                      sfx.confirm();
                    } catch {
                      // The session displays the error and keeps the action retryable.
                    } finally {
                      setRefunding(false);
                    }
                  }}
                >
                  Not yet, give it back
                </Button>
              </Item>
            </Stagger>
          )}
          {phase === "done" && <Reveal session={session} onAgain={reset} money={money} />}
        </motion.div>
      </AnimatePresence>
      </div>
      <LivePanel session={session} money={money} />
      </div>
      <Composed />
      </div>
    </Screen>
  );
}

function Hero({ onStart, money }: { onStart: () => void; money: string }) {
  return (
    <Stagger className="flex flex-col justify-center gap-5 py-2 text-center lg:gap-6 lg:py-0 lg:text-left">
      <Item className="flex justify-center lg:hidden">
        <Mark size={76} assemble />
      </Item>
      <Item>
        <div className="eyebrow">For deals on OLX, Vinted, WhatsApp</div>
        <h1 className="display mt-2 text-[36px] leading-[1.02] lg:text-[68px] lg:leading-[0.96]">Pay a stranger.<br /><span className="lg:glacier-text">Only when you meet.</span></h1>
        <p className="mx-auto mt-4 max-w-[30ch] text-[17px] text-ink-2 lg:mx-0 lg:max-w-[38ch] lg:text-xl">The money waits, locked, where the seller can see it. It moves only when your two phones are face to face.</p>
      </Item>
      <Item className="flex flex-col gap-3 lg:max-w-[400px]">
        <Button full onClick={onStart}>Try it now · lock {money}</Button>
        <p className="text-sm text-mute">Test money · 20 seconds · no sign-up</p>
      </Item>
      <Item>
        <Protected className="justify-center lg:justify-start" />
      </Item>
      <Item>
        <Link href="/deal/new" onPointerDown={() => haptic.tick()} className="text-[14px] text-ink-2 hover:text-ink">
          Meeting in person? Shake. Shipping it? <span className="text-safe">The shake travels in the box →</span>
        </Link>
      </Item>
      <Item className="grid grid-cols-3 gap-2 lg:max-w-[560px] lg:gap-4">
        {[
          ["Lock", "Not sent. On hold."],
          ["They check", "Real money, not a screenshot."],
          ["Shake", "Face to face. Paid in 5s."],
        ].map(([t, d], i) => (
          <motion.div key={t} className="flex flex-col items-center gap-1.5 lg:items-start" whileHover={{ y: -3 }} transition={springs.snappy}>
            <span className="step-dot !size-8 font-mono text-xs text-safe">{i + 1}</span>
            <div className="font-display text-[15px] font-medium lg:text-lg">{t}</div>
            <p className="text-[12px] leading-snug text-ink-2 lg:text-sm">{d}</p>
          </motion.div>
        ))}
      </Item>
    </Stagger>
  );
}

function Locking({ step, error, money }: { step: string; error?: string; money: string }) {
  const reduce = useReducedMotion();
  const prev = useRef(step);
  useEffect(() => {
    if (prev.current === step) return;
    prev.current = step;
    haptic.tap();
    sfx.tick();
  }, [step]);
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      <motion.div animate={reduce ? undefined : { scale: [1, 1.035, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <Mark size={88} state="open" />
      </motion.div>
      <div className="text-center">
        <div className="eyebrow">Locking for the seller</div>
        <motion.div className="amount mt-3 text-[64px]" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={springs.slam}>{money}</motion.div>
      </div>
      <div className="glass w-full p-6">
        <Steps
          steps={[
            { key: "wallet", label: "Making your wallet (no sign-up)" },
            { key: "locked", label: `Locking ${money} on Stellar` },
            { key: "joined", label: "Seller sees it's real" },
          ]}
          current={step}
        />
        {error && <p className="mt-4 text-sm text-ink-2" role="status">{error} Retrying…</p>}
      </div>
    </div>
  );
}

function Reveal({ session, onAgain, money }: { session: ReturnType<typeof usePitchSession>["session"]; onAgain: () => void; money: string }) {
  const released = session.outcome === "released";
  return (
    <Stagger className="flex flex-col gap-5 py-4">
      <Item className="flex justify-center">
        {released ? <Seal /> : <Seal label="Refunded" sub="Back to you · on Stellar" tone="mute" />}
      </Item>
      <Item className="text-center">
        <h1 className="display text-[36px] leading-[1.05]">You didn&apos;t just read a website.<br />You used SHAKE.</h1>
        <p className="mx-auto mt-3 max-w-[32ch] text-ink-2">Every step was a real payment on Stellar. Tap any of them to see the proof.</p>
      </Item>
      <Item className="glass p-6 lg:hidden">
        <LiveReceipt
          delay={0.3}
          items={[
            { key: "w", title: "Wallet made, no sign-up", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined },
            { key: "l", title: `${money} locked when you tapped`, at: session.locked?.at, hash: session.locked?.hash ?? undefined },
            { key: "j", title: "Seller saw it was real", at: session.joined?.at, hash: session.joined?.hash ?? undefined },
            { key: "s", title: released ? "Paid when you shook" : "Back to you when you said not yet", at: session.settled?.at, hash: session.settled?.hash ?? undefined, tone: released ? "safe" : "mute" },
          ]}
        />
      </Item>
      <Item className="flex flex-col gap-3">
        <Link href="/try" className="contents"><Button full>Now try it with a friend</Button></Link>
        <div className="flex gap-3">
          {session.dealId && <Link href={`/r/${session.dealId}`} className="contents"><Button variant="glass" full>Receipt</Button></Link>}
          <Button variant="ghost" full onClick={onAgain}>Start again</Button>
        </div>
      </Item>
    </Stagger>
  );
}

/** Desktop only: every step of the judge's own deal, landing on Stellar while they watch. */
function LivePanel({ session, money }: { session: PitchSession; money: string }) {
  const released = session.outcome === "released";
  const refunded = session.outcome === "refunded";
  const next = !session.wallet ? "w" : !session.locked ? "l" : !session.joined ? "j" : !session.settled ? "s" : null;
  const title = session.status === "idle" ? "Watch it happen" : released ? "Paid. Proof below." : refunded ? "Back to you." : "Happening right now";
  return (
    <motion.div className="relative hidden lg:block" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 28, delay: 0.2 }}>
    <div className="halo" aria-hidden />
    <aside className="glass px-6 py-5">
      <div className="flex items-center gap-3">
        <Mark size={40} state={released ? "shut" : session.locked ? "rest" : "open"} />
        <div className="min-w-0">
          <div className="eyebrow">Under the hood · live</div>
          <div className="relative h-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={title} className="truncate font-display text-[17px] font-medium" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={springs.snappy}>
                {title}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">~5 seconds · zero fees · no sign-up</p>
      <div className="mt-4">
        <LiveReceipt
          dense
          stagger={0.08}
          items={[
            { key: "w", title: "Wallet made for you", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined, pending: !session.wallet, active: next === "w" },
            { key: "l", title: `${money} locked`, at: session.locked?.at, hash: session.locked?.hash ?? undefined, pending: !session.locked, active: next === "l" },
            { key: "j", title: "Seller sees real money", at: session.joined?.at, hash: session.joined?.hash ?? undefined, pending: !session.joined, active: next === "j" },
            { key: "s", title: refunded ? "Refunded to you" : "Released by the handshake", at: session.settled?.at, hash: session.settled?.hash ?? undefined, pending: !session.settled, active: next === "s", tone: refunded ? "mute" : "safe" },
          ]}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <p className="text-[13px] text-mute">Tap a proof to open it.</p>
        <a href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-[11px] text-ink-2 hover:text-safe">
          {DEAL_CONTRACT_ID.slice(0, 4)}…{DEAL_CONTRACT_ID.slice(-4)} ↗
        </a>
      </div>
    </aside>
    </motion.div>
  );
}

const PARTS: { chip: string; icon: string; title: string; body: string; href?: string }[] = [
  { chip: "Soroban", icon: "stellar", title: "Stellar smart contracts", body: "Pays only with the secret inside the seller's one-time QR.", href: explorer.contract(DEAL_CONTRACT_ID) },
  { chip: "Passkey", icon: "passkey", title: "Face ID wallet", body: "A smart account guarded by a passkey. Nothing to write down.", href: explorer.contract(PASSKEY.webauthnVerifier) },
  { chip: "OpenZeppelin", icon: "openzeppelin", title: "Sponsored fees", body: "Channels sponsors network fees, with SHAKE's own pool as a fallback.", href: "https://docs.openzeppelin.com/relayer" },
  { chip: "Test assets", icon: "token", title: "Four test currencies", body: "tEUR, tUSD, tGBP and tBRL as Stellar Asset Contracts.", href: explorer.contract(TOKEN_CONTRACT_ID) },
  { chip: "SEP-24", icon: "anchor", title: "Testnet cash-out", body: "A real testnet transfer to an anchor, with a simulated bank payout.", href: "/.well-known/stellar.toml" },
  { chip: "Receipts", icon: "proof", title: "On-chain proof", body: "Shared links show the locked money, read from the chain.", href: "/try" },
];

/** One quiet row. Each piece still opens its proof. */
function Composed() {
  return (
    <footer className="mt-auto flex shrink-0 flex-col gap-3 border-t border-white/[0.06] pt-4 lg:flex-row lg:items-center lg:gap-5">
      <h2 className="eyebrow shrink-0 text-[9px] lg:max-w-[100px] lg:leading-relaxed">Composed on Stellar</h2>
      <nav aria-label="Composed on Stellar" className="flex min-w-0 flex-wrap gap-2 lg:flex-1 lg:gap-1.5">
        {PARTS.map((p, i) => (
          <motion.a
            key={p.chip}
            href={p.href}
            title={`${p.title}. ${p.body}`}
            target={p.href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] py-1.5 pl-2 pr-3 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:border-safe/30 hover:bg-safe/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safe lg:text-[10px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.snappy, delay: 0.12 + i * 0.04 }}
            whileTap={{ scale: 0.92 }}
            onPointerDown={() => haptic.tick()}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-safe/[0.06] transition-colors group-hover:bg-safe/[0.12]">
              <Image src={`/integrations/${p.icon}.svg`} alt="" width={16} height={16} unoptimized />
            </span>
            {p.chip}
          </motion.a>
        ))}
      </nav>
      <TestnetNote className="hidden shrink-0 xl:block" />
    </footer>
  );
}
