"use client";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { BumpToShake } from "./BumpToShake";
import { GlassSheet } from "./GlassSheet";
import { HoldToShake } from "./HoldToShake";
import { useCountry } from "./Money";
import { Scanner, preloadScanner } from "./Scanner";
import { TestnetNote } from "./ui";
import { currencyOfToken, formatMoney, fromUnits } from "@/lib/config";
import { codeToHex, dealMeta, parseScan } from "@/lib/client/handshake";
import { buyerHalf, type OfflineShake } from "@/lib/client/offline";
import type { Deal } from "@/lib/client/useDeal";
import { ApiError, callDeal, getKeypair, sha256Hex } from "@/lib/client/wallet";

type Props = {
  deal: Deal;
  /** A code that came in the URL (opened from a phone camera). */
  initial?: string;
  onReleased: () => void;
  /** No signal at the shake: the buyer's half is ready to show the seller. */
  onOffline: (shake: OfflineShake) => void;
  /** The confirm sheet is open, so the caller keeps this screen even if the deal closes underneath. */
  onArmed?: (armed: boolean) => void;
  onBack?: () => void;
};

/** The buyer at the meetup: check the item, scan the seller's QR, hold to pay. Works with no signal too. */
export function ScanFlow({ deal, initial, onReleased, onOffline, onArmed, onBack }: Props) {
  const id = deal.id;
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState("");
  const [bump, setBump] = useState(0);
  const [country] = useCountry();
  const [item, setItem] = useState<string | undefined>();

  useEffect(() => {
    setItem(dealMeta.get(id).item);
    preloadScanner();
    if (initial) check(initial.length === 10 ? initial : `${location.origin}/scan/${id}#${initial}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => onArmed?.(!!code), [code, onArmed]);

  const check = async (raw: string) => {
    const parsed = parseScan(raw);
    if (!parsed) return setProblem("That's not a SHAKE code.");
    if (parsed.dealId && parsed.dealId !== id) return setProblem("That QR belongs to a different deal.");
    const hex = /^[0-9a-f]{64}$/i.test(parsed.code) ? parsed.code : codeToHex(parsed.code);
    if (deal.hash && (await sha256Hex(hex)) !== deal.hash) return setProblem("That code is old or wrong. Ask the seller to show their QR again.");
    setProblem("");
    setCode(hex);
  };

  // the seller's code checked out against the deal this phone already has, so the buyer's half can be shown
  const payOffline = async () => {
    const half = await buyerHalf(getKeypair(), id);
    if ((await sha256Hex(half)) !== deal.key) {
      setProblem("This phone can't pay without signal for this deal. Find signal and hold again.");
      setCode(null);
      throw new Error("no key");
    }
    onOffline({ secret: code!, half, at: Date.now() });
  };

  const release = async () => {
    if (deal.key && !navigator.onLine) return payOffline();
    try {
      await callDeal(getKeypair(), "release", { dealId: id, secret: code! });
      onReleased();
    } catch (e) {
      // the signal dropped mid-shake: pay offline instead (if the release did land, settling later just finds it paid)
      if (!(e instanceof ApiError) && deal.key) return payOffline();
      setProblem(e instanceof ApiError ? e.message : "The network didn't confirm. Nothing moved. Try again.");
      setCode(null);
      throw e;
    }
  };

  const money = formatMoney(fromUnits(deal.amount), currencyOfToken(deal.token).code, country.locale);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-center lg:gap-16 lg:pt-0">
      <div className="lg:col-start-1">
        <div className="eyebrow">{item ? `${item} · ` : ""}{money}</div>
        <h1 className="display mt-2 text-[34px] lg:text-[60px] lg:leading-[0.96]">Check the item.<br /><span className="lg:glacier-text">Then scan.</span></h1>
      </div>
      <Scanner onCode={check} paused={!!code} className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />
      <div className="flex flex-col gap-5 lg:col-start-1">
        {problem && <p className="rounded-2xl bg-white/5 px-4 py-3 text-center text-ink-2 lg:text-left" role="alert">{problem}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            check(typed);
          }}
        >
          <label htmlFor="code" className="sr-only">Code under the QR</label>
          <input
            id="code"
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 14))}
            placeholder="Or type the code: XXXX-XXXX-XX"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 rounded-full bg-white/5 px-5 font-mono tracking-[0.1em] text-ink outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-mute focus:bg-white/8"
          />
          <Button type="submit" variant="glass" disabled={typed.replace(/[^A-Z0-9]/g, "").length < 10}>Go</Button>
        </form>
        {onBack && <Button variant="ghost" full onClick={onBack}>Back to the deal</Button>}
        <TestnetNote className="mt-auto lg:mt-0 lg:text-left" />
      </div>

      <GlassSheet open={!!code} onClose={() => setCode(null)} label="Release the money">
        <div className="flex flex-col items-center gap-6 pb-4 text-center">
          <div>
            <div className="eyebrow">Code matches ✓</div>
            <h2 className="display mt-3 text-[30px]">Release {money} to the seller?</h2>
            <p className="mt-2 text-sm text-ink-2">Only if you have the item in your hands. This is final.</p>
          </div>
          <BumpToShake armed={!!code} onBump={() => setBump((n) => n + 1)} />
          <HoldToShake onShake={release} trigger={bump} hint="or hold · about 5 seconds to final" />
        </div>
      </GlassSheet>
    </div>
  );
}
