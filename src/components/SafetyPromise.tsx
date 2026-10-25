"use client";
import { useState } from "react";
import { GlassSheet } from "@/components/GlassSheet";
import { Mark } from "@/components/Mark";
import { DEAL_CONTRACT_ID, explorer } from "@/lib/config";
import { KINDS, type Kind } from "@/lib/kinds";
import { haptic } from "@/lib/client/sfx";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Every rule the contract enforces for this deal, said in plain words to whoever is looking.
 * Keep in sync with contracts/escrow/src/lib.rs: there is no admin and no upgrade, the resolver can only split.
 */
function rules(kind: Kind, payer: boolean, ends: string): [string, string][] {
  const k = KINDS[kind];
  const job = kind === "service";
  const other = payer ? `The ${k.payee}` : `The ${job || kind === "order" ? "client" : k.mode === "Hold" ? "payer" : "buyer"}`;
  const you = (y: string, t: string) => (payer ? y : t);
  if (k.mode === "Meet")
    return [
      [you("You", other), `Can take it back until the ${k.payee} joins. After that, only by not meeting: on ${ends} it goes back by itself.`],
      [you(other, "You"), `${you("Gets", "Get")} it only when the buyer scans ${you("their", "your")} one-time QR, in person, on the buyer's own phone. Never from a distance, never from a screenshot.`],
      ["Change of plans", `The ${k.payee} can cancel any time, and the money goes straight back to the buyer.`],
    ];
  if (k.mode === "Ship")
    return [
      [you("You", other), `${you("Pay", "Pays")} by ${job ? "approving the work" : "scanning the QR when it arrives"}. ${you("You", "They")} can cancel until the ${k.payee} joins, and if it's never ${job ? "started" : "shipped"} it all goes back on ${ends}.`],
      [you(other, "You"), `${you("Gets", "Get")} it when ${you("you", "they")} ${job ? "approve" : "scan"}, or by itself 3 days after it's marked ${job ? "done" : "delivered"}, if nobody opens a problem.`],
      ["If something's wrong", "The money freezes. A neutral resolver can only split it between you two. It can never keep any of it."],
    ];
  return [
    [you("You", other), `${you("Get", "Gets")} it all back on ${ends}, by itself. Nobody has to press anything.`],
    [you(other, "You"), "Can return it early, or claim part of it for damage before the end date. Never more than the deposit."],
    ["If there's a claim", "The payer accepts it with one tap, or a neutral resolver splits it between you two. Nobody can just keep it."],
  ];
}

/** One quiet row on the money card; opens the rules. Both sides see the same contract, worded for them. */
export function SafetyPromise({ kind, payer, expiry, locale, className = "" }: { kind: Kind; payer: boolean; expiry: number; locale: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ends = new Date(expiry * 1000).toLocaleDateString(locale, { day: "numeric", month: "short", hour: KINDS[kind].mode === "Meet" ? "2-digit" : undefined, minute: KINDS[kind].mode === "Meet" ? "2-digit" : undefined });
  return (
    <>
      <button
        type="button"
        onClick={() => { haptic.tick(); setOpen(true); }}
        className={`group flex w-full items-center gap-2.5 rounded-xl text-left text-[14px] text-ink-2 hover:text-ink ${className}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="flex-1">Who can move this money?</span>
        <span className="text-mute transition-transform group-hover:translate-x-0.5" aria-hidden>›</span>
      </button>
      <GlassSheet open={open} onClose={() => setOpen(false)} label="Who can move this money">
        <div className="flex flex-col gap-5 pb-3">
          <div>
            <Mark size={40} state="rest" />
            <h2 className="display mt-4 text-[30px] leading-[1.05]">Nobody can just keep it.</h2>
            <p className="mt-2 text-ink-2">These rules are written into public code on Stellar. Nobody can bend them, not {payer ? "the other side" : "the payer"}, not you, not SHAKE.</p>
          </div>
          <ul className="flex flex-col gap-4 border-t border-line pt-4">
            {rules(kind, payer, ends).map(([who, what]) => (
              <li key={who}>
                <div className="font-display text-[16px] font-medium">{cap(who)}</div>
                <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{what}</p>
              </li>
            ))}
            <li>
              <div className="font-display text-[16px] font-medium">SHAKE</div>
              <p className="mt-0.5 text-[14px] leading-snug text-ink-2">Can&apos;t touch it. The code has no owner key and can&apos;t be changed after the fact.</p>
            </li>
          </ul>
          <a href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer" className="text-center text-sm text-safe hover:underline">
            Check the rules yourself on Stellar ↗
          </a>
        </div>
      </GlassSheet>
    </>
  );
}
