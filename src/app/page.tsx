"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { HoldToShake } from "@/components/HoldToShake";
import { LiveReceipt } from "@/components/LiveReceipt";
import { Mark } from "@/components/Mark";
import { Seal } from "@/components/Seal";
import { NumberTicker } from "@/components/Ticker";
import { Item, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { usePitchSession } from "@/lib/client/pitchSession";

/**
 * Home: the product explains itself by being used. One tap locks a real €5 on Stellar,
 * the judge shakes (or says "not yet"), then sees every step's on-chain proof.
 */
export default function Home() {
  const { session, start, shake, notYet, reset } = usePitchSession();
  const [refunding, setRefunding] = useState(false);
  const phase = session.status === "done" ? "done" : session.status === "ready" ? "ready" : session.status === "idle" ? "idle" : "working";

  return (
    <Screen right={<Link href="/try" className="eyebrow rounded-full px-3 py-2 hover:text-ink">With a friend</Link>}>
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
    </Screen>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <Stagger className="flex flex-1 flex-col gap-7 pt-8">
      <Item className="flex justify-center pt-4">
        <Mark size={112} assemble />
      </Item>
      <Item className="text-center">
        <div className="eyebrow">For deals on OLX, Vinted, WhatsApp</div>
        <h1 className="display mt-3 text-[44px] leading-[1.02]">Pay a stranger.<br />Only when you meet.</h1>
        <p className="mx-auto mt-4 max-w-[30ch] text-[17px] text-ink-2">The money waits, locked, where the seller can see it. It moves only when your two phones are face to face.</p>
      </Item>
      <Item className="flex flex-col gap-3">
        <Button full onClick={onStart}>Try it now · lock €5</Button>
        <p className="text-center text-sm text-mute">Test money. Takes 20 seconds. No sign-up.</p>
      </Item>
      <Item>
        <Protected />
      </Item>
      <Item className="grid gap-3 pt-4">
        {[
          ["1", "Lock", "You put the money on hold. Not sent, not gone."],
          ["2", "They see it's real", "The seller checks the locked money themselves. Not a screenshot."],
          ["3", "Shake", "Face to face, you scan their one-time code. Paid in 5 seconds."],
        ].map(([n, t, d]) => (
          <div key={n} className="glass flex items-start gap-4 p-5">
            <span className="amount grid size-9 shrink-0 place-items-center rounded-full bg-white/6 text-base [text-shadow:none]">{n}</span>
            <div>
              <div className="font-display text-lg font-medium">{t}</div>
              <p className="text-sm text-ink-2">{d}</p>
            </div>
          </div>
        ))}
        <p className="pt-1 text-center text-sm text-ink-2">No meetup? The money comes back to you.</p>
      </Item>
      <Item className="pb-4">
        <TestnetNote />
      </Item>
    </Stagger>
  );
}

/** The live counter: money held safe by SHAKE right now, read from the contract's events. */
function Protected() {
  const [s, setS] = useState<{ protectedNow: string; deals: number } | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((j) => j && setS(j)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <div className="h-[22px]" />;
  const euros = Number(BigInt(s.protectedNow) / BigInt(10_000_000));
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-ink-2">
      <span className="pulse-dot" />
      <span>
        <NumberTicker value={euros} format={(n) => `€${Math.round(n).toLocaleString("en-IE")}`} className="font-medium text-ink" /> protected right now · {s.deals} deals on Stellar
      </span>
    </div>
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
      <Item className="glass p-6">
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
      <Item className="pb-4">
        <TestnetNote />
      </Item>
    </Stagger>
  );
}
