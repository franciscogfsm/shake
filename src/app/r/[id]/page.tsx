"use client";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LiveReceipt, type TimelineItem } from "@/components/LiveReceipt";
import { Mark, springs } from "@/components/Mark";
import { Screen } from "@/components/ui";
import { DEAL_CONTRACT_ID, currencyOfToken, dealCode, explorer, formatMoney, fromUnits } from "@/lib/config";
import { Money, useCountry } from "@/components/Money";
import { dealMeta } from "@/lib/client/handshake";
import { haptic, sfx } from "@/lib/client/sfx";
import { eventOf, useDeal, type Deal } from "@/lib/client/useDeal";
import { shortHash } from "@/components/Ticker";

const STATUS = {
  Locked: "Locked",
  Accepted: "Seller joined",
  Released: "Released",
  Refunded: "Refunded",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Disputed: "Disputed",
  Resolved: "Resolved",
} as const satisfies Record<Deal["status"], string>;

/** Public receipt: works for anyone, no wallet needed. Printed-receipt feel on glass. */
export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { deal, events, state } = useDeal(id, { interval: 5000 });
  const [country] = useCountry();
  const item = typeof window !== "undefined" ? dealMeta.get(id).item : undefined;

  if (state === "missing") return <Screen wide fit back="/"><p className="mt-24 text-center text-ink-2">No receipt for this code.</p></Screen>;
  if (!deal) return <Screen wide fit back="/"><div className="mt-24 grid place-items-center"><Mark size={64} state="open" /></div></Screen>;

  const ev = (t: Parameters<typeof eventOf>[1]) => eventOf(events, t);
  const joined = ev("accepted");
  const hold = deal.mode === "Hold";
  const items: TimelineItem[] = [{ key: "locked", title: hold ? "Deposit held by the payer" : "Money locked by the buyer", at: ev("locked")?.at, hash: ev("locked")?.txHash }];
  if (joined || deal.status === "Locked") items.push({ key: "accepted", title: hold ? "Holder confirmed" : "Seller joined with a one-time QR", at: joined?.at, hash: joined?.txHash, pending: !joined });
  if (hold) {
    const claim = ev("claimed");
    if (claim) items.push({ key: "claimed", title: `Damage claimed: ${formatMoney(fromUnits(deal.claimed), currencyOfToken(deal.token).code, country.locale)}`, at: claim.at, hash: claim.txHash });
    if (deal.status === "Resolved") items.push({ key: "resolved", title: "Claim settled, every cent paid out", at: ev("resolved")?.at, hash: ev("resolved")?.txHash });
    else items.push({ key: "refunded", title: deal.status === "Refunded" ? "Deposit returned to the payer" : `Back to the payer on ${new Date(deal.expiry * 1000).toLocaleDateString(country.locale)}`, at: ev("refunded")?.at, hash: ev("refunded")?.txHash, pending: deal.status !== "Refunded" });
  } else if (deal.status === "Refunded") items.push({ key: "refunded", title: "Refunded to the buyer", at: ev("refunded")?.at, hash: ev("refunded")?.txHash, tone: "mute" });
  else items.push({ key: "released", title: "Released when they shook", at: ev("released")?.at, hash: ev("released")?.txHash, pending: deal.status !== "Released" });

  const euros = fromUnits(deal.amount);
  return <ReceiptView id={id} deal={deal} items={items} euros={euros} item={item} locale={country.locale} />;
}

function ReceiptView({
  id, deal, items, euros, item, locale,
}: {
  id: string;
  deal: Deal;
  items: TimelineItem[];
  euros: number;
  item?: string;
  locale: string;
}) {
  const reduce = useReducedMotion();
  const currency = currencyOfToken(deal.token);
  const sealed = deal.status === "Released" || deal.status === "Resolved";
  useEffect(() => {
    if (reduce) return;
    const tick = setTimeout(() => sfx.tick(), 320);
    const stamp = setTimeout(() => {
      haptic.success();
      sfx.confirm();
    }, 560);
    return () => {
      clearTimeout(tick);
      clearTimeout(stamp);
    };
  }, [reduce]);

  const rise = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...springs.smooth, delay } };

  return (
    <Screen wide fit back="/">
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,460px)] lg:items-center lg:gap-16">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <motion.div className="eyebrow" {...rise(0.02)}>Public record</motion.div>
          <h1 className="display mt-3 text-[34px] leading-[1.02] lg:text-[64px] lg:leading-[0.96]">
            <motion.span className="block" {...rise(0.08)}>A screenshot</motion.span>
            <motion.span className="block" {...rise(0.14)}>can lie.</motion.span>
            <motion.span className="block lg:glacier-text" {...rise(0.22)}>This can&apos;t.</motion.span>
          </h1>
          <motion.p className="mx-auto mt-4 max-w-[34ch] text-ink-2 lg:mx-0 lg:text-lg" {...rise(0.3)}>
            Every line links to the public record on Stellar.
          </motion.p>
          <motion.div {...rise(0.36)}>
            <Link href="/try" className="mt-4 inline-block text-sm text-safe">Try SHAKE with a friend →</Link>
          </motion.div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[420px] lg:order-2 lg:mx-0 lg:max-w-none">
          <div className="halo" aria-hidden />
          <motion.article
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduce ? { duration: 0 } : { ...springs.smooth, delay: 0.06 }}
            className="glass overflow-hidden"
            aria-label="Receipt"
          >
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="eyebrow truncate">Receipt · {dealCode(id)}</div>
                  <div className="mt-1 truncate text-[15px] leading-5 text-ink-2">{deal.memo || item || "Second-hand deal"}</div>
                </div>
                <Mark size={40} assemble state={sealed ? "shut" : "rest"} className="shrink-0" />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Money amount={euros} currency={currency.code} locale={locale} tick className="text-[60px] leading-none sm:text-[68px]" />
                <motion.span
                  initial={reduce ? false : { opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={reduce ? { duration: 0 } : { ...springs.slam, delay: 0.42 }}
                  className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-white/8 px-3 text-[13px] leading-none"
                >
                  <span className="size-1.5 rounded-full" style={{ background: deal.status === "Refunded" ? "var(--ink-2)" : "var(--safe)" }} />
                  {STATUS[deal.status]}
                </motion.span>
              </div>
            </div>

            <div className="relative my-6 h-px">
              <motion.div
                className="absolute inset-x-6 origin-left border-t border-dashed border-white/25"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 0.45, delay: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>

            <div className="px-5 sm:px-6">
              <LiveReceipt items={items} delay={0.4} stagger={0.12} />
            </div>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 px-5 py-5 text-[13px] leading-5 sm:px-6">
              <Row label="Buyer" delay={0.62}><a className="hover:text-safe" href={explorer.account(deal.buyer)} target="_blank" rel="noreferrer">{shortHash(deal.buyer)}</a></Row>
              <Row label="Seller" delay={0.68}>{deal.seller ? <a className="hover:text-safe" href={explorer.account(deal.seller)} target="_blank" rel="noreferrer">{shortHash(deal.seller)}</a> : "—"}</Row>
              <Row label="Money" delay={0.74}>{currency.asset} · test {currency.name.toLowerCase()}</Row>
              <Row label="Held by" delay={0.8}><a className="hover:text-safe" href={explorer.contract(DEAL_CONTRACT_ID)} target="_blank" rel="noreferrer">public contract {shortHash(DEAL_CONTRACT_ID, 4)} ↗</a></Row>
            </div>
          </motion.article>
        </div>
      </div>
    </Screen>
  );
}

function Row({ label, delay, children }: { label: string; delay: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-6"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { ...springs.snappy, delay }}
    >
      <span className="text-mute">{label}</span>
      <span className="truncate text-right font-mono tabular-nums">{children}</span>
    </motion.div>
  );
}
