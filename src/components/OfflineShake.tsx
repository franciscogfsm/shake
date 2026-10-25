"use client";
import { useEffect, useState } from "react";
import { Mark } from "./Mark";
import { Money } from "./Money";
import { Seal } from "./Seal";
import { SellerQR } from "./SellerQR";
import { ShakeBurst } from "./ShakeBurst";
import { ShakeMoment } from "./ShakeMoment";
import { Countdown, Item, Stagger } from "./ui";
import { formatMoney, fromUnits, type CurrencyCode } from "@/lib/config";
import { payPayload, useOnline, type OfflineShake } from "@/lib/client/offline";
import type { Deal } from "@/lib/client/useDeal";

type Props = { deal: Deal; shaken: OfflineShake; locale: string; currency: CurrencyCode };

export const Plane = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </svg>
);

/** "No signal · still works", or the moment it's back. */
export function SignalPill({ online }: { online: boolean }) {
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] text-ink" role="status">
      {online ? <span className="pulse-dot" /> : <Plane className="text-safe" />}
      {online ? "Signal's back · sending to Stellar" : "No signal · still works"}
    </span>
  );
}

/** The buyer, after holding with no signal: their half of the key, for the seller's phone to read. */
export function BuyerPayQR({ deal, shaken, locale, currency }: Props) {
  const online = useOnline();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  return (
    <Stagger className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center lg:gap-x-16 lg:text-left">
      <Item className="flex flex-col items-center lg:col-start-1 lg:items-start">
        <SignalPill online={online} />
        <h1 className="display mt-4 text-[34px] leading-[1.02] lg:text-[60px] lg:leading-[0.96]">Show this<br /><span className="glacier-text">to the seller.</span></h1>
        <p className="mt-3 max-w-[32ch] text-ink-2 lg:text-lg">
          It&apos;s your half of the key. Their phone checks it without signal, and {formatMoney(fromUnits(deal.amount), currency, locale)} is theirs.
        </p>
      </Item>
      <Item className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {origin && <SellerQR payload={payPayload(origin, deal.id, shaken.half)} label="Your half of the key, for the seller to scan" />}
      </Item>
      <Item className="lg:col-start-1">
        <p className="max-w-[34ch] text-sm text-mute">It lands on Stellar by itself the moment either phone has signal. Nobody needs to do anything else.</p>
      </Item>
    </Stagger>
  );
}

/** The seller, after reading the buyer's half: paid, with no signal. The slam plays here, not later. */
export function SellerPaidOffline({ deal, shaken, locale, currency }: Props) {
  const online = useOnline();
  const [fresh] = useState(() => Date.now() - shaken.at < 60_000);
  const [burst, setBurst] = useState(!fresh);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <ShakeMoment play={fresh} onDone={() => setBurst(true)} />
      <Stagger className="flex w-full flex-1 flex-col items-center justify-center gap-7 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:gap-y-4 lg:text-left" delay={0.05} key={String(burst)}>
        <Item className="relative grid size-56 place-items-center lg:col-start-1 lg:row-span-3 lg:justify-self-end">
          <ShakeBurst fire={burst} size={224} />
          <Mark size={128} state={burst ? "shut" : "open"} />
        </Item>
        <Item className="lg:col-start-2">
          <div className="eyebrow">Paid to you · no signal</div>
          <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[clamp(52px,18vw,80px)] lg:text-[96px]" />
          <p className="mx-auto mt-4 max-w-[30ch] text-lg text-ink-2 lg:mx-0">Both halves of the key are on your phone. Nobody else can move this money now. Hand over the item.</p>
        </Item>
        <Item className="lg:col-start-2">{burst && <Seal label="Shaken" sub="No signal needed" />}</Item>
        <Item className="flex w-full max-w-[420px] flex-col items-center gap-2.5 lg:col-start-2 lg:items-start">
          <SignalPill online={online} />
          <p className="max-w-[34ch] text-sm text-mute">
            {online ? "One moment. Then it's final on Stellar, with a public receipt." : <>It lands on Stellar by itself when you have signal. Get online within <Countdown to={deal.expiry} />.</>}
          </p>
        </Item>
      </Stagger>
    </div>
  );
}
