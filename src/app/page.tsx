"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { HoldToShake } from "@/components/HoldToShake";
import { LiveReceipt } from "@/components/LiveReceipt";
import { Mark } from "@/components/Mark";
import { Seal } from "@/components/Seal";
import { Item, Protected, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { usePitchSession, type PitchSession } from "@/lib/client/pitchSession";
import { DEAL_CONTRACT_ID, PASSKEY, TOKEN_CONTRACT_ID, explorer } from "@/lib/config";

/**
 * Home: the product explains itself by being used. One tap locks a real €5 on Stellar,
 * the judge shakes (or says "not yet"), then sees every step's on-chain proof.
 */
export default function Home() {
  const { session, start, shake, notYet, reset } = usePitchSession();
  const [refunding, setRefunding] = useState(false);
  const phase = session.status === "done" ? "done" : session.status === "ready" ? "ready" : session.status === "idle" ? "idle" : "working";

  return (
    <Screen
      wide
      fit
      right={
        <div className="flex items-center gap-2">
          <a href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer" className="eyebrow glass hidden items-center gap-2 !rounded-full px-4 py-2 hover:text-ink lg:flex">
            <span className="pulse-dot" />
            Live on Stellar testnet
          </a>
          <Link href="/try" className="eyebrow rounded-full px-3 py-2 hover:text-ink">With a friend</Link>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,380px)] lg:items-center lg:gap-14">
      <div className={`flex min-h-0 flex-col justify-center ${phase === "idle" ? "" : "w-full lg:mx-auto lg:max-w-[420px]"}`}>
      <AnimatePresence mode="wait">
        <motion.div key={phase} className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
          {phase === "idle" && <Hero onStart={start} />}
          {phase === "working" && <Locking step={!session.wallet ? "wallet" : !session.locked ? "locked" : "joined"} error={session.status === "failed" ? session.error : undefined} />}
          {phase === "ready" && (
            <Stagger className="flex flex-col items-center gap-5 text-center lg:gap-6">
              <Item>
                <div className="eyebrow">You&apos;re at the meetup</div>
                <h1 className="display mt-2 text-[34px] leading-[1.02] lg:text-[52px]">It checks out.<br /><span className="glacier-text">Shake on it.</span></h1>
                <p className="mx-auto mt-3 max-w-[28ch] text-[15px] leading-snug text-ink-2">€5 is locked, and the seller can see it. Hold to pay them.</p>
              </Item>
              <Item>
                <HoldToShake onShake={shake} hint="Money moves only now" size={188} />
              </Item>
              <Item>
                <Button
                  variant="ghost"
                  className="!h-11"
                  loading={refunding}
                  onClick={async () => {
                    setRefunding(true);
                    await notYet().finally(() => setRefunding(false));
                  }}
                >
                  Not yet, give it back
                </Button>
              </Item>
            </Stagger>
          )}
          {phase === "done" && <Reveal session={session} onAgain={reset} />}
        </motion.div>
      </AnimatePresence>
      </div>
      <LivePanel session={session} />
      </div>
      <Composed />
      </div>
    </Screen>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
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
        <Button full onClick={onStart}>Try it now · lock €5</Button>
        <p className="text-sm text-mute">Test money · 20 seconds · no sign-up</p>
      </Item>
      <Item>
        <Protected className="justify-center lg:justify-start" />
      </Item>
      <Item className="grid grid-cols-3 gap-2 lg:max-w-[560px] lg:gap-4">
        {[
          ["Lock", "Not sent. On hold."],
          ["They check", "Real money, not a screenshot."],
          ["Shake", "Face to face. Paid in 5s."],
        ].map(([t, d], i) => (
          <div key={t} className="flex flex-col items-center gap-1.5 lg:items-start">
            <span className="step-dot !size-8 font-mono text-xs text-safe">{i + 1}</span>
            <div className="font-display text-[15px] font-medium lg:text-lg">{t}</div>
            <p className="text-[12px] leading-snug text-ink-2 lg:text-sm">{d}</p>
          </div>
        ))}
      </Item>
    </Stagger>
  );
}

function Locking({ step, error }: { step: string; error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      <Mark size={96} state="rest" />
      <div className="text-center">
        <div className="eyebrow">Locking for the seller</div>
        <div className="amount mt-3 text-[64px]">€5</div>
      </div>
      <div className="glass w-full p-6">
        <Steps
          steps={[
            { key: "wallet", label: "Making your wallet (no sign-up)" },
            { key: "locked", label: "Locking €5 on Stellar" },
            { key: "joined", label: "Seller sees it's real" },
          ]}
          current={step}
        />
        {error && <p className="mt-4 text-sm text-ink-2" role="status">{error} Retrying…</p>}
      </div>
    </div>
  );
}

function Reveal({ session, onAgain }: { session: ReturnType<typeof usePitchSession>["session"]; onAgain: () => void }) {
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
            { key: "l", title: "€5 locked when you tapped", at: session.locked?.at, hash: session.locked?.hash ?? undefined },
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
function LivePanel({ session }: { session: PitchSession }) {
  const released = session.outcome === "released";
  const refunded = session.outcome === "refunded";
  const next = !session.wallet ? "w" : !session.locked ? "l" : !session.joined ? "j" : !session.settled ? "s" : null;
  return (
    <motion.div className="relative hidden lg:block" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 28, delay: 0.2 }}>
    <div className="halo" aria-hidden />
    <aside className="glass px-6 py-5">
      <div className="flex items-center gap-3">
        <Mark size={40} state={released ? "shut" : session.locked ? "rest" : "open"} />
        <div className="min-w-0">
          <div className="eyebrow">Under the hood · live</div>
          <div className="truncate font-display text-[17px] font-medium">{session.status === "idle" ? "Watch it happen" : released ? "Paid. Proof below." : refunded ? "Back to you." : "Happening right now"}</div>
        </div>
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">~5 seconds · €0 fees · no sign-up</p>
      <div className="mt-4">
        <LiveReceipt
          dense
          stagger={0.08}
          items={[
            { key: "w", title: "Wallet made for you", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined, pending: !session.wallet, active: next === "w" },
            { key: "l", title: "€5 locked", at: session.locked?.at, hash: session.locked?.hash ?? undefined, pending: !session.locked, active: next === "l" },
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

const PARTS: { chip: string; title: string; body: string; href?: string }[] = [
  { chip: "Soroban", title: "Hash-lock", body: "Pays only with the secret inside the seller's one-time QR.", href: explorer.contract(DEAL_CONTRACT_ID) },
  { chip: "Passkey", title: "Face ID wallet", body: "A smart account guarded by a passkey. Nothing to write down.", href: explorer.contract(PASSKEY.webauthnVerifier) },
  { chip: "Channels", title: "Zero fees", body: "Channels pays every network fee. Nobody needs XLM.", href: "https://docs.openzeppelin.com/relayer" },
  { chip: "tEUR", title: "Stable money", body: "tEUR, tUSD, tGBP and tBRL as Stellar Asset Contracts.", href: explorer.contract(TOKEN_CONTRACT_ID) },
  { chip: "SEP-24", title: "To the bank", body: "The seller cashes out to an IBAN through an anchor.", href: "/.well-known/stellar.toml" },
  { chip: "Preview", title: "Proof", body: "Shared links show the locked money, read from the chain.", href: "/try" },
];

/** One quiet row. Each piece still opens its proof. */
function Composed() {
  return (
    <footer className="mt-auto flex shrink-0 items-center gap-4 pt-3">
      <h2 className="eyebrow hidden shrink-0 lg:block">Composed on Stellar</h2>
      <nav aria-label="Composed on Stellar" className="-mx-5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {PARTS.map((p) => (
          <a
            key={p.chip}
            href={p.href}
            title={`${p.title}. ${p.body}`}
            target={p.href?.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-mute hover:bg-white/5 hover:text-ink"
          >
            {p.chip}
          </a>
        ))}
      </nav>
      <TestnetNote className="hidden shrink-0 lg:block" />
    </footer>
  );
}
