"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LiveReceipt, type TimelineItem } from "@/components/LiveReceipt";
import { Mark } from "@/components/Mark";
import { Screen } from "@/components/ui";
import { DEAL_CONTRACT_ID, TOKEN_CODE, dealCode, explorer, formatEuro, fromUnits } from "@/lib/config";
import { dealMeta } from "@/lib/client/handshake";
import { eventOf, useDeal } from "@/lib/client/useDeal";
import { shortHash } from "@/components/Ticker";

const STATUS = { Locked: "Locked", Accepted: "Seller joined", Released: "Released", Refunded: "Refunded" } as const;

/** Public receipt: works for anyone, no wallet needed. Printed-receipt feel on glass. */
export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { deal, events, state } = useDeal(id, { interval: 5000 });
  const item = typeof window !== "undefined" ? dealMeta.get(id).item : undefined;

  if (state === "missing") return <Screen back="/"><p className="mt-24 text-center text-ink-2">No receipt for this code.</p></Screen>;
  if (!deal) return <Screen back="/"><div className="mt-24 grid place-items-center"><Mark size={64} state="open" /></div></Screen>;

  const ev = (t: Parameters<typeof eventOf>[1]) => eventOf(events, t);
  const joined = ev("accepted");
  const items: TimelineItem[] = [{ key: "locked", title: "Money locked by the buyer", at: ev("locked")?.at, hash: ev("locked")?.txHash }];
  if (joined || deal.status === "Locked") items.push({ key: "accepted", title: "Seller joined with a one-time QR", at: joined?.at, hash: joined?.txHash, pending: !joined });
  if (deal.status === "Refunded") items.push({ key: "refunded", title: "Refunded to the buyer", at: ev("refunded")?.at, hash: ev("refunded")?.txHash, tone: "mute" });
  else items.push({ key: "released", title: "Released when they shook", at: ev("released")?.at, hash: ev("released")?.txHash, pending: deal.status !== "Released" });

  const euros = fromUnits(deal.amount);
  return (
    <Screen back="/">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass mt-4 overflow-hidden"
        aria-label="Receipt"
      >
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">Receipt · {dealCode(id)}</div>
              <div className="mt-1 text-ink-2">{deal.memo || item || "Second-hand deal"}</div>
            </div>
            <Mark size={36} state={deal.status === "Released" ? "shut" : "rest"} />
          </div>
          <div className="amount mt-6 text-[68px]">{formatEuro(euros)}</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1 text-sm">
            <span className="size-2 rounded-full" style={{ background: deal.status === "Refunded" ? "var(--ink-2)" : "var(--safe)" }} />
            {STATUS[deal.status]}
          </div>
        </div>
        {/* perforation */}
        <div className="relative my-6 h-px">
          <div className="absolute inset-x-6 border-t border-dashed border-white/20" />
        </div>
        <div className="px-6">
          <LiveReceipt items={items} />
        </div>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line px-6 py-5 text-[13px]">
          <dt className="text-mute">Buyer</dt>
          <dd className="truncate text-right font-mono"><a className="hover:text-safe" href={explorer.account(deal.buyer)} target="_blank" rel="noreferrer">{shortHash(deal.buyer)}</a></dd>
          <dt className="text-mute">Seller</dt>
          <dd className="truncate text-right font-mono">{deal.seller ? <a className="hover:text-safe" href={explorer.account(deal.seller)} target="_blank" rel="noreferrer">{shortHash(deal.seller)}</a> : "—"}</dd>
          <dt className="text-mute">Money</dt>
          <dd className="text-right font-mono">{TOKEN_CODE} · test euro</dd>
          <dt className="text-mute">Held by</dt>
          <dd className="truncate text-right font-mono"><a className="hover:text-safe" href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer">public contract {shortHash(DEAL_CONTRACT_ID, 4)} ↗</a></dd>
        </dl>
      </motion.article>
      <p className="mt-6 text-center text-sm text-mute">A screenshot can lie. This can&apos;t. Every line links to the public record on Stellar.</p>
      <Link href="/try" className="mt-3 block text-center text-sm text-safe">Try SHAKE with a friend →</Link>
    </Screen>
  );
}
