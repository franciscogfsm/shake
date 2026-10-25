"use client";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { HoldToShake } from "@/components/HoldToShake";
import { HowItWorks, StoryCaption, useBeat } from "@/components/HowItWorks";
import { CountryPicker, useCountry } from "@/components/Money";
import { LiveReceipt } from "@/components/LiveReceipt";
import { Mark, springs } from "@/components/Mark";
import { haptic, sfx } from "@/lib/client/sfx";
import { PaySheet } from "@/components/PaySheet";
import { Seal } from "@/components/Seal";
import { Item, Protected, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { PARTS, Story } from "@/components/pitch/Story";
import { usePitchSession, type PitchSession } from "@/lib/client/pitchSession";
import { DEAL_CONTRACT_ID, explorer, formatMoney } from "@/lib/config";

/**
 * Home: the product explains itself by being used. One tap locks 5 test currency units on Stellar,
 * the judge shakes (or says "not yet"), then sees every step's on-chain proof.
 */
export default function Home() {
  const [country, setCountry] = useCountry();
  const { session, start, shake, notYet, reset, settling, availability, refresh } = usePitchSession(country.currency);
  const currency = session.currency ?? (session.dealId ? "EUR" : country.currency);
  const money = formatMoney(5, currency, country.locale);
  const [refunding, setRefunding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [beat, pickBeat, nonce] = useBeat();
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
      fit={phase !== "idle"}
      right={
        <nav className="flex items-center gap-1 lg:gap-2">
          <Link href="/use-cases" onPointerDown={() => haptic.tick()} className="eyebrow hidden h-10 items-center rounded-full px-3 hover:text-ink lg:inline-flex">Use cases</Link>
          <Link href="/extension" onPointerDown={() => haptic.tick()} className="eyebrow hidden h-10 items-center rounded-full px-3 hover:text-ink lg:inline-flex">Extension</Link>
          <Link href="/ai" onPointerDown={() => haptic.tick()} className="eyebrow hidden h-10 items-center rounded-full px-3 hover:text-ink lg:inline-flex">For AI</Link>
          <Link href="/try" onPointerDown={() => haptic.tick()} className="glass inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-transform active:scale-95 sm:px-4 sm:text-[14px]"><span className="min-[380px]:hidden">Try</span><span className="hidden min-[380px]:inline">Try SHAKE</span></Link>
          {session.status === "idle" && <CountryPicker country={country} onChange={setCountry} />}
        </nav>
      }
    >
      {/* idle: the hero fills the first screen and the story scrolls below it */}
      <div className={phase === "idle" ? "flex min-h-[calc(100dvh-5.25rem-max(env(safe-area-inset-top),16px)-max(env(safe-area-inset-bottom),16px))] flex-col lg:min-h-[calc(100dvh-3rem-32px)]" : "flex min-h-0 flex-1 flex-col"}>
      <div className="flex flex-1 flex-col justify-center lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-12 xl:gap-16">
      <div className={`flex flex-col justify-center lg:min-h-0 ${phase === "idle" || phase === "ready" ? "" : "w-full lg:mx-auto lg:max-w-[420px]"}`}>
      <AnimatePresence mode="wait">
        <motion.div key={phase} className="flex flex-1 flex-col" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springs.smooth}>
          {phase === "idle" && <Hero onStart={() => setPaying(true)} money={money} beat={beat} nonce={nonce} onBeat={pickBeat} />}
          {phase === "working" && <Locking money={money} via={session.method} step={!session.wallet ? "wallet" : !session.locked ? "locked" : "joined"} error={session.status === "failed" ? session.error : undefined} />}
          {phase === "ready" && availability !== "available" && (
            <div className="flex flex-col items-center gap-5 text-center" aria-live="polite">
              <Mark size={88} />
              <div>
                <div className="eyebrow">Checking your payment</div>
                <h1 className="display mt-2 text-[34px]">{availability === "checking" ? "Confirming locked funds." : availability === "missing" ? "This saved deal is unavailable." : "We couldn’t verify this deal."}</h1>
                <p className="mx-auto mt-3 max-w-[34ch] text-ink-2">{availability === "checking" ? "Checking Stellar before enabling payment or refund." : availability === "missing" ? "The current test network has no record of this deal. You can check again or start a new payment." : "Your saved session is preserved. Check again to continue."}</p>
              </div>
              {availability !== "checking" && <Button onClick={() => void refresh()}>Check again</Button>}
              {availability === "missing" && <Button variant="ghost" onClick={reset}>Start a new payment</Button>}
            </div>
          )}
          {phase === "ready" && availability === "available" && (
            <Stagger className="flex flex-col items-center gap-5 text-center lg:gap-6">
              <Item>
                <div className="eyebrow">You&apos;re at the meetup</div>
                <h1 className="display mt-2 text-[36px] leading-[0.98] lg:text-[64px]">The money moves<br /><span className="glacier-text">only when you meet.</span></h1>
                <p className="mx-auto mt-4 max-w-[34ch] text-[17px] leading-snug text-ink-2 lg:text-xl">{money} is locked. They can see it&apos;s real, not a screenshot. Hold to pay them.</p>
              </Item>
              <Item>
                <HoldToShake onShake={shake} disabled={settling} hint="Hold to pay them" size={188} />
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
                  Cancel and refund
                </Button>
                <p className="mt-1 text-xs text-mute">Before you pay, you can return the locked funds to your wallet.</p>
              </Item>
            </Stagger>
          )}
          {phase === "done" && <Reveal session={session} onAgain={reset} money={money} />}
        </motion.div>
      </AnimatePresence>
      </div>
      {phase === "idle" ? <StoryPanel beat={beat} nonce={nonce} onBeat={pickBeat} money={money} /> : <LivePanel session={session} money={money} />}
      </div>
      <Composed />
      </div>
      {phase === "idle" && <Story onStart={() => setPaying(true)} money={money} />}
      <PaySheet open={paying} onClose={() => setPaying(false)} title={`Lock ${money}`} money={money} currency={currency} country={country.code} onPay={(m) => { setPaying(false); void start(m); }} />
    </Screen>
  );
}

/** Clean on purpose: the film explains it, one line names it, one button tries it, one line proves it's live. */
function Hero({ onStart, money, beat, nonce, onBeat }: { onStart: () => void; money: string; beat: number; nonce: number; onBeat: (b: number) => void }) {
  return (
    <Stagger className="flex flex-col justify-center gap-5 py-2 text-center lg:gap-8 lg:py-0 lg:text-left">
      <Item>
        <h1 className="display text-[34px] leading-[0.96] min-[380px]:text-[40px] sm:text-[48px] lg:text-[60px] lg:leading-[0.94] xl:text-[76px]">Pay a stranger.<br /><span className="glacier-text">Only when<br className="lg:hidden" /> you meet.</span></h1>
        <p className="mx-auto mt-3 max-w-[26ch] text-[16px] leading-snug text-ink-2 lg:mx-0 lg:mt-5 lg:max-w-[28ch] lg:text-lg">Lock the money. They see it&apos;s real, not a screenshot.</p>
      </Item>
      <Item className="flex flex-col gap-3 lg:max-w-[400px] lg:gap-4">
        <Button full onClick={onStart}>Try it now · lock {money}</Button>
        <Protected live className="justify-center lg:justify-start" />
      </Item>
      <Item className="flex w-full flex-col items-center gap-2 lg:hidden">
        <HowItWorks beat={beat} money={money} />
        <StoryCaption beat={beat} nonce={nonce} money={money} onBeat={onBeat} className="w-full max-w-[332px] text-left" />
      </Item>
      <Item>
        <Link href="/use-cases" onPointerDown={() => haptic.tick()} className="text-[13px] text-mute hover:text-ink">
          Also for cars, flat deposits, parcels and events <span className="text-safe">→</span>
        </Link>
      </Item>
    </Stagger>
  );
}

function Locking({ step, error, money, via }: { step: string; error?: string; money: string; via?: string }) {
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
        <motion.div className="amount mt-3 text-[clamp(48px,18vw,64px)]" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={springs.slam}>{money}</motion.div>
      </div>
      <div className="glass w-full p-6">
        <Steps
          steps={[
            { key: "wallet", label: via ? `Paying with ${via} · test money` : "Making your wallet (no sign-up)" },
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
        <p className="mx-auto mt-3 max-w-[32ch] text-ink-2">Your {released ? "payment" : "refund"} settled on Stellar Testnet. Open each transaction to verify it on-chain.</p>
      </Item>
      <Item className="glass p-6 lg:hidden">
        <LiveReceipt
          delay={0.3}
          items={[
            { key: "w", title: session.method ? `Paid with ${session.method} · no sign-up` : "Wallet made, no sign-up", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined },
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

/** Desktop, before they start: the deal they are about to make, as a short film. */
function StoryPanel({ beat, nonce, onBeat, money }: { beat: number; nonce: number; onBeat: (b: number) => void; money: string }) {
  return (
    <motion.div className="relative hidden lg:block" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.2 }}>
      <div className="halo" aria-hidden />
      <HowItWorks beat={beat} money={money} big className="relative" />
      <StoryCaption beat={beat} nonce={nonce} money={money} onBeat={onBeat} className="relative mx-auto mt-6 max-w-[456px]" />
    </motion.div>
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
            { key: "w", title: session.method ? `${money} in · ${session.method} (test)` : "Wallet made for you", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined, pending: !session.wallet, active: next === "w" },
            { key: "l", title: `${money} locked`, at: session.locked?.at, hash: session.locked?.hash ?? undefined, pending: !session.locked, active: next === "l" },
            { key: "j", title: "Seller sees the real money", at: session.joined?.at, hash: session.joined?.hash ?? undefined, pending: !session.joined, active: next === "j" },
            { key: "s", title: refunded ? "Back to you" : "Paid when you shake", at: session.settled?.at, hash: session.settled?.hash ?? undefined, pending: !session.settled, active: next === "s", tone: refunded ? "mute" : "safe" },
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

/** One quiet row. Each piece still opens its proof. */
function Composed() {
  return (
    <footer className="mt-auto flex shrink-0 items-center gap-3 border-t border-white/[0.06] pt-3">
      <h2 className="eyebrow hidden shrink-0 whitespace-nowrap sm:block">Composed on Stellar</h2>
      <nav aria-label="Composed on Stellar" className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PARTS.map((p, i) => (
          <motion.a
            key={p.chip}
            href={p.href}
            title={`${p.title}. ${p.body}`}
            target={p.href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] pl-1.5 pr-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-2 transition-colors hover:border-safe/30 hover:bg-safe/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safe"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.snappy, delay: 0.12 + i * 0.04 }}
            whileTap={{ scale: 0.92 }}
            onPointerDown={() => haptic.tick()}
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-safe/[0.06] transition-colors group-hover:bg-safe/[0.12]">
              <Image src={`/integrations/${p.icon}.svg`} alt="" width={14} height={14} unoptimized />
            </span>
            {p.chip}
          </motion.a>
        ))}
      </nav>
      <TestnetNote compact className="hidden shrink-0 whitespace-nowrap xl:block" />
    </footer>
  );
}
