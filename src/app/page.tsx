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
    <Screen wide right={<Link href="/try" className="eyebrow rounded-full px-3 py-2 hover:text-ink">With a friend</Link>}>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-20">
      <div className={`flex flex-1 flex-col ${phase === "idle" ? "" : "w-full lg:mx-auto lg:max-w-[440px]"}`}>
      <AnimatePresence mode="wait">
        <motion.div key={phase} className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
          {phase === "idle" && <Hero onStart={start} />}
          {phase === "working" && <Locking step={!session.wallet ? "wallet" : !session.locked ? "locked" : "joined"} error={session.status === "failed" ? session.error : undefined} />}
          {phase === "ready" && (
            <Stagger className="flex flex-1 flex-col items-center gap-8 pt-6 text-center">
              <Item>
                <div className="eyebrow">You&apos;re at the meetup</div>
                <h1 className="display mt-3 text-[36px]">It checks out. Shake on it.</h1>
                <p className="mx-auto mt-3 max-w-[32ch] text-ink-2">Your €5 is locked and the seller can see it. Hold to pay them. Changed your mind? You get it back.</p>
              </Item>
              <Item className="flex flex-1 items-center">
                <HoldToShake onShake={shake} hint="Money moves only now" />
              </Item>
              <Item className="w-full">
                <Button
                  variant="ghost"
                  full
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
    </Screen>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <Stagger className="flex min-h-[calc(100dvh-3rem-env(safe-area-inset-top))] flex-col justify-center gap-6 py-4 text-center lg:min-h-0 lg:gap-8 lg:py-10 lg:text-left">
      <Item className="flex justify-center lg:hidden">
        <Mark size={76} assemble />
      </Item>
      <Item>
        <div className="eyebrow">For deals on OLX, Vinted, WhatsApp</div>
        <h1 className="display mt-3 text-[40px] leading-[1.02] lg:text-[76px] lg:leading-[0.98]">Pay a stranger.<br />Only when you meet.</h1>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
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
    <Stagger className="flex flex-1 flex-col gap-7 pt-6">
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
  return (
    <aside className="glass hidden p-8 lg:block">
      <div className="flex items-center gap-4">
        <Mark size={56} state={released ? "shut" : session.locked ? "rest" : "open"} />
        <div>
          <div className="eyebrow">Live on Stellar</div>
          <div className="font-display text-xl font-medium">{session.status === "idle" ? "Press Try it now. Watch it happen." : released ? "Paid. Proof below." : refunded ? "Back to you. Proof below." : "Happening right now"}</div>
        </div>
      </div>
      <div className="mt-8">
        <LiveReceipt
          stagger={0.08}
          items={[
            { key: "w", title: "Wallet made, fees paid for you", at: session.wallet?.at, hash: session.wallet?.hash ?? undefined, pending: !session.wallet },
            { key: "l", title: "€5 locked in the deal contract", at: session.locked?.at, hash: session.locked?.hash ?? undefined, pending: !session.locked },
            { key: "j", title: "Seller sees real money", at: session.joined?.at, hash: session.joined?.hash ?? undefined, pending: !session.joined },
            { key: "s", title: refunded ? "Refunded to you" : "Released by the handshake", at: session.settled?.at, hash: session.settled?.hash ?? undefined, pending: !session.settled, tone: refunded ? "mute" : "safe" },
          ]}
        />
      </div>
      <p className="mt-8 text-sm text-mute">Each step is a real transaction. Click one to check it yourself.</p>
    </aside>
  );
}

const PARTS: { tag: string; title: string; body: string; href?: string }[] = [
  { tag: "Soroban", title: "Hash-lock deal", body: "Pays only with the secret inside the seller's one-time QR.", href: explorer.contract(DEAL_CONTRACT_ID) },
  { tag: "OpenZeppelin", title: "Face ID wallet", body: "A smart account guarded by a passkey. Nothing to write down.", href: explorer.contract(PASSKEY.webauthnVerifier) },
  { tag: "OpenZeppelin", title: "Zero fees for you", body: "Channels pays every network fee. Nobody needs XLM.", href: "https://docs.openzeppelin.com/relayer" },
  { tag: "Stellar assets", title: "Stable money", body: "tEUR, tUSD, tGBP and tBRL as Stellar Asset Contracts.", href: explorer.contract(TOKEN_CONTRACT_ID) },
  { tag: "SEP-10 · SEP-24", title: "Straight to the bank", body: "The seller cashes out to an IBAN through an anchor.", href: "/.well-known/stellar.toml" },
  { tag: "Live preview", title: "Proof that can't lie", body: "Shared links show the locked money, read from the chain.", href: "/try" },
];

/** What SHAKE is composed of, each piece one click from its proof. */
function Composed() {
  return (
    <section className="pb-8 pt-10 lg:pb-12 lg:pt-16">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="eyebrow">Composed on Stellar</h2>
        <TestnetNote />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {PARTS.map((p) => (
          <a key={p.title} href={p.href} target={p.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="glass group flex flex-col gap-1.5 p-4 transition-transform hover:-translate-y-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-safe">{p.tag}</span>
            <span className="font-display text-[15px] font-medium">{p.title}</span>
            <span className="text-[12px] leading-snug text-ink-2">{p.body}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
