"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";
import { Mark } from "@/components/Mark";
import { Seal } from "@/components/Seal";
import { SellerQR } from "@/components/SellerQR";
import { ShakeBurst } from "@/components/ShakeBurst";
import { ShakeMoment } from "@/components/ShakeMoment";
import { CashOut } from "@/components/CashOut";
import { ProofLink } from "@/components/LiveReceipt";
import { HashTyper, NumberTicker } from "@/components/Ticker";
import { Countdown, Item, Screen, Stagger, TestnetNote, useNow } from "@/components/ui";
import { currencyOfToken, formatMoney, fromUnits } from "@/lib/config";
import { Money, useCountry } from "@/components/Money";
import { codeToHex, dealMeta, newCode, qrPayload, sellerCode } from "@/lib/client/handshake";
import { useDeal, eventOf, type Deal, type DealEvent } from "@/lib/client/useDeal";
import { ApiError, callDeal, ensureAccount, getKeypair, isMine, sha256Hex } from "@/lib/client/wallet";

export default function DealPage() {
  return (
    <Suspense>
      <DealScreen />
    </Suspense>
  );
}

function DealScreen() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const { deal, events, state, refresh } = useDeal(id);
  const [me, setMe] = useState<string | null>(null);
  const [country] = useCountry();
  useEffect(() => setMe(getKeypair().publicKey()), []);
  const local = useMemo(() => ({ ...dealMeta.get(id), ...(q.get("s") ? { seller: q.get("s")! } : {}) }), [id, q]);

  if (state === "loading" || !me) return <Screen><Loading /></Screen>;
  if (state === "missing") return <Screen back="/try"><Empty title="We couldn't find this deal." body="Check the link with the person who sent it." /></Screen>;
  if (state === "offline" && !deal) return <Screen><Empty title="You're offline." body="We'll show the deal as soon as you're back." /></Screen>;
  if (!deal) return null;

  const role = isMine(deal.buyer) ? "buyer" : deal.seller && deal.seller !== me ? "other" : "seller";
  const meta = { ...local, item: deal.memo || local.item };
  const props = { deal, events, meta, me, refresh, isNew: q.get("new") === "1", replay: q.get("replay") === "1", locale: country.locale, currency: currencyOfToken(deal.token).code };
  return (
    <Screen right={<Link href={`/r/${id}`} className="eyebrow rounded-full px-3 py-2 hover:text-ink">Receipt</Link>}>
      <AnimatePresence mode="wait">
        <motion.div key={`${role}-${["Released", "Refunded", "Resolved"].includes(deal.status) ? deal.status : "open"}`} className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          {deal.status === "Released" ? (
            <Released {...props} role={role} />
          ) : deal.status === "Refunded" ? (
            <Refunded {...props} />
          ) : deal.status === "Resolved" ? (
            <Refunded {...props} resolved />
          ) : role === "buyer" ? (
            <BuyerView {...props} />
          ) : role === "seller" ? (
            <SellerView {...props} />
          ) : (
            <Empty title="This deal belongs to another phone." body="Only the buyer and the seller who joined can act on it. Anyone can see the receipt." cta={{ href: `/r/${id}`, label: "See receipt" }} />
          )}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

type ViewProps = { deal: Deal; events: DealEvent[]; meta: { item?: string; seller?: string }; me: string; refresh: () => Promise<void>; isNew: boolean; replay?: boolean; locale: string; currency: import("@/lib/config").CurrencyCode };

/* ------------------------------ buyer ------------------------------ */

function BuyerView({ deal, events, meta, refresh, isNew, locale, currency }: ViewProps) {
  const euros = fromUnits(deal.amount);
  const now = useNow();
  const ship = deal.mode === "Ship";
  const s = deal.status;
  const inBox = s === "Shipped" || s === "Delivered";
  const expired = now >= deal.expiry && (s === "Locked" || s === "Accepted");
  const joined = s !== "Locked";
  const canDispute = s === "Shipped" || (s === "Delivered" && now < deal.releaseAfter);
  const [share, setShare] = useState(isNew);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState("");
  const link = typeof window !== "undefined" ? `${location.origin}/deal/${deal.id}?${new URLSearchParams({ i: meta.item ?? "", ...(meta.seller ? { s: meta.seller } : {}) })}` : "";
  const lockEv = eventOf(events, "locked");

  const run = async (fn: "refund" | "dispute") => {
    setCancelling(true);
    setErr("");
    try {
      await callDeal(getKeypair(), fn, { dealId: deal.id });
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't reach the network right now. Try again.");
    } finally {
      setCancelling(false);
    }
  };
  const cancel = () => run("refund");
  const status = !joined
    ? "Locked. Waiting for the seller."
    : !ship
      ? "Seller joined. Meet and shake."
      : s === "Accepted"
        ? "Seller joined. They're packing it."
        : s === "Shipped"
          ? `On its way${deal.tracking ? ` · ${deal.tracking}` : ""}`
          : s === "Delivered"
            ? "Delivered. Scan the QR inside the box."
            : "Problem opened. The money is frozen.";

  return (
    <Stagger className="flex flex-1 flex-col gap-6 pt-4">
      <Item>
        <div className="eyebrow">{meta.item || "Your deal"}{meta.seller ? ` · ${meta.seller}` : ""}</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="pulse-dot" />
          <span className="text-ink-2">{status}</span>
        </div>
        {ship && <ShipSteps status={s} />}
      </Item>
      <Item className="glass p-6">
        <div className="eyebrow">Locked by you</div>
        <Money amount={euros} currency={currency} locale={locale} className="mt-3 text-[76px]" />
        {lockEv && (
          <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-3 block text-xs text-mute hover:text-safe">
            proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
          </ProofLink>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
          {s === "Delivered" ? (
            <div><div className="text-mute">Pays the seller in</div><div className="mt-0.5 text-ink">{now >= deal.releaseAfter ? "Any moment" : <Countdown to={deal.releaseAfter} />}</div></div>
          ) : s === "Shipped" || s === "Disputed" ? (
            <div><div className="text-mute">Your money</div><div className="mt-0.5 text-ink">{s === "Disputed" ? "Frozen" : "Locked until you open it"}</div></div>
          ) : (
            <div><div className="text-mute">Refund if no deal</div><div className="mt-0.5 text-ink">{expired ? "Available now" : <Countdown to={deal.expiry} />}</div></div>
          )}
          <div><div className="text-mute">Seller</div><div className="mt-0.5 text-ink">{inBox ? "Shipped ✓" : joined ? "Joined ✓" : "Not yet"}</div></div>
        </div>
      </Item>
      <div className="flex-1" />
      <Item className="flex flex-col gap-3">
        {ship && joined ? (
          <>
            {inBox && (
              <Link href={`/scan/${deal.id}`} className="contents">
                <Button full>Scan the QR in the box</Button>
              </Link>
            )}
            {canDispute && (
              <Button variant="ghost" full loading={cancelling} onClick={() => run("dispute")}>Open a problem</Button>
            )}
            {expired && <Button variant="ghost" full loading={cancelling} onClick={cancel}>Refund me now</Button>}
            <p className="text-center text-sm text-mute">
              {s === "Accepted"
                ? "Once it's shipped you can't pull the money back. Scan the QR when you open the box."
                : s === "Disputed"
                  ? "A neutral resolver looks at it. They can only split the money between you two, never keep it."
                  : "Nothing wrong? Scan the QR. Problem? Open it before the 3 days after delivery run out."}
            </p>
          </>
        ) : joined && !expired ? (
          <Link href={`/scan/${deal.id}`} className="contents">
            <Button full>Scan seller&apos;s QR</Button>
          </Link>
        ) : !joined ? (
          <Button full onClick={() => setShare(true)}>Send link to seller</Button>
        ) : null}
        {(!joined || (expired && !ship)) && (
          <Button variant="ghost" full loading={cancelling} onClick={cancel}>
            {expired ? "Refund me now" : "Cancel and refund"}
          </Button>
        )}
        {joined && !expired && !ship && <p className="text-center text-sm text-mute">Only the seller can cancel now. If you don&apos;t meet, you&apos;re refunded automatically.</p>}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>

      <GlassSheet open={share} onClose={() => setShare(false)} label="Send the link">
        <ShareSheet link={link} money={formatMoney(euros, currency, locale)} item={meta.item} />
      </GlassSheet>
    </Stagger>
  );
}

function ShareSheet({ link, money, item }: { link: string; money: string; item?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `I locked ${money} for ${item || "your item"} with SHAKE. Check it's real, then we meet and shake:`;
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title: "SHAKE", text, url: link });
    } catch {
      return;
    }
    copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div>
        <Mark size={40} state="rest" />
        <h2 className="display mt-4 text-[30px]">Your money is locked.</h2>
        <p className="mt-2 text-ink-2">Send this link in your OLX, Vinted or WhatsApp chat. The seller sees the real money, not a screenshot.</p>
      </div>
      <div className="truncate rounded-2xl bg-white/5 px-4 py-3 font-mono text-xs text-ink-2">{link}</div>
      <Button full onClick={share}>Share link</Button>
      <Button variant="glass" full onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</Button>
    </div>
  );
}

/* ------------------------------ seller ------------------------------ */

function SellerView({ deal, events, meta, me, refresh, locale, currency }: ViewProps) {
  const euros = fromUnits(deal.amount);
  const now = useNow();
  const ship = deal.mode === "Ship";
  const s = deal.status;
  const expired = now >= deal.expiry && (s === "Locked" || s === "Accepted");
  const [code, setCode] = useState<string | null>(() => sellerCode.get(deal.id));
  const mine = deal.seller === me;
  const [showQR, setShowQR] = useState(false);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState<"" | "joining" | "cancelling" | "step">("");
  const step = async (fn: "mark_shipped" | "mark_delivered" | "claim") => {
    setBusy("step");
    setErr("");
    try {
      await callDeal(getKeypair(), fn, { dealId: deal.id, tracking: tracking.trim() });
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't reach the network. Try again.");
    } finally {
      setBusy("");
    }
  };
  const [err, setErr] = useState("");
  const lockEv = eventOf(events, "locked");

  // the code on this phone must match the hash on-chain, otherwise we (re)commit a fresh one
  const [codeOk, setCodeOk] = useState(false);
  useEffect(() => {
    if (!code || !deal.hash) return setCodeOk(false);
    sha256Hex(codeToHex(code)).then((h) => setCodeOk(h === deal.hash));
  }, [code, deal.hash]);

  const join = async () => {
    setBusy("joining");
    setErr("");
    try {
      const kp = getKeypair();
      await ensureAccount(kp, 0);
      const fresh = newCode();
      const hash = await sha256Hex(codeToHex(fresh));
      await callDeal(kp, "accept", { dealId: deal.id, seller: kp.publicKey(), hash });
      sellerCode.set(deal.id, fresh);
      setCode(fresh);
      await refresh();
      setShowQR(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't reach the network. Try again.");
    } finally {
      setBusy("");
    }
  };

  const cancel = async () => {
    setBusy("cancelling");
    try {
      await callDeal(getKeypair(), "refund", { dealId: deal.id });
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't cancel right now.");
    } finally {
      setBusy("");
    }
  };

  const ready = mine && code && codeOk;
  return (
    <Stagger className="flex flex-1 flex-col gap-6 pt-4">
      <Item>
        <div className="eyebrow">{meta.item || "A deal"}{meta.seller ? ` · for ${meta.seller}` : ""}</div>
        <h1 className="display mt-3 text-[34px]">
          {s === "Shipped" ? "It's on its way." : s === "Delivered" ? "Delivered. Almost yours." : s === "Disputed" ? "The buyer opened a problem." : "Someone locked money for you."}
        </h1>
        {ship && <ShipSteps status={s} />}
      </Item>
      <Item className="glass p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Locked for you</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        </div>
        <Money amount={euros} currency={currency} locale={locale} tick className="mt-3 text-[84px]" />
        <div className="mt-4 flex items-center gap-2 text-[15px] font-medium text-safe">
          <span className="pulse-dot" /> Verified on the Stellar network
        </div>
        {lockEv && (
          <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-2 block text-xs text-mute hover:text-safe">
            see proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
          </ProofLink>
        )}
        <p className="mt-5 border-t border-line pt-4 text-[14px] text-ink-2">
          {ship
            ? s === "Delivered"
              ? <>It&apos;s yours when the buyer scans the QR in the box, or automatically in <Countdown to={deal.releaseAfter} /> if they stay silent.</>
              : s === "Disputed"
                ? "A neutral resolver splits it between you two. Nobody can keep it."
                : "This is real money held by public code, not a screenshot. Put your QR in the box: it's yours when the buyer scans it."
            : "This is real money held by public code, not a screenshot. It's yours the moment the buyer scans your QR."}
        </p>
      </Item>
      <div className="flex-1" />
      <Item className="flex flex-col gap-3">
        {ship && mine && ready && s === "Accepted" && !expired ? (
          <>
            <Button variant="glass" full onClick={() => setShowQR(true)}>Show the QR for the box</Button>
            <label htmlFor="tracking" className="sr-only">Tracking number</label>
            <input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value.slice(0, 40))}
              placeholder="Tracking number (optional)"
              autoComplete="off"
              className="w-full rounded-2xl border border-line bg-white/3 px-4 py-3 text-ink outline-none placeholder:text-white/25 focus:border-safe"
            />
            <Button full loading={busy === "step"} onClick={() => step("mark_shipped")}>I&apos;ve shipped it</Button>
          </>
        ) : ship && mine && s === "Shipped" ? (
          <>
            <Button full loading={busy === "step"} onClick={() => step("mark_delivered")}>It was delivered</Button>
            <p className="text-center text-sm text-mute">The buyer then has 3 days to scan the QR or open a problem.</p>
          </>
        ) : ship && s === "Delivered" ? (
          now >= deal.releaseAfter ? (
            <Button full loading={busy === "step"} onClick={() => step("claim")}>Release my money</Button>
          ) : (
            <p className="text-center text-ink-2">Waiting for the buyer to open the box.</p>
          )
        ) : ship && s === "Disputed" ? null : expired ? (
          <p className="text-center text-ink-2">This deal expired. The buyer can take the money back.</p>
        ) : ready ? (
          <Button full onClick={() => setShowQR(true)}>Show my QR</Button>
        ) : (
          <Button full loading={busy === "joining"} onClick={join}>{mine ? "Make a new QR" : ship ? "I'll ship it, make my QR" : "I'm meeting them, show my QR"}</Button>
        )}
        {mine && !expired && (s === "Locked" || s === "Accepted") && (
          <Button variant="ghost" full loading={busy === "cancelling"} onClick={cancel}>Cancel deal and refund buyer</Button>
        )}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>

      <GlassSheet open={showQR && !!ready} onClose={() => setShowQR(false)} label="Your QR">
        <div className="flex flex-col items-center gap-5 pb-3">
          <div className="text-center">
            <h2 className="display text-[28px]">{ship ? "Put this in the box." : "Let the buyer scan this."}</h2>
            <p className="mt-1.5 text-sm text-ink-2">
              {ship ? "Print it or write the code on a note inside the package. The buyer scans it when they open it." : "Hand over the item once your screen says released. Turn your brightness up."}
            </p>
          </div>
          {code && <SellerQR payload={qrPayload(location.origin, deal.id, code)} code={code} />}
        </div>
      </GlassSheet>
    </Stagger>
  );
}

/* ------------------------------ endings ------------------------------ */

function Released({ deal, events, role, locale, currency, replay }: ViewProps & { role: string }) {
  const euros = fromUnits(deal.amount);
  const rel = eventOf(events, "released");
  // play the full shake on both phones when the release just happened (or this phone just shook)
  const [fresh] = useState(() => replay || !rel || Date.now() - new Date(rel.at).getTime() < 90_000);
  const [burst, setBurst] = useState(!fresh);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <ShakeMoment play={fresh} onDone={() => setBurst(true)} />
      <Stagger className="flex flex-1 flex-col items-center justify-center gap-8" delay={0.05} key={String(burst)}>
      <Item className="relative grid size-56 place-items-center">
        <ShakeBurst fire={burst} size={224} />
        <Mark size={128} state={burst ? "shut" : "open"} />
      </Item>
      <Item>
        <div className="eyebrow">{role === "seller" ? "Paid to you" : "Released to the seller"}</div>
        <Money amount={euros} currency={currency} locale={locale} className="mt-3 text-[80px]" />
        <p className="mx-auto mt-4 max-w-[26ch] text-lg text-ink-2">Final. No chargebacks. No screenshots.</p>
      </Item>
      <Item>{burst && <Seal />}</Item>
      <Item className="flex w-full flex-col gap-3">
        {role === "seller" && <CashOut amount={euros} currency={currency} locale={locale} />}
        <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
        {rel && <ProofLink hash={rel.txHash} at={rel.at} className="text-sm text-mute hover:text-safe">Proof on Stellar ↗</ProofLink>}
      </Item>
      </Stagger>
    </div>
  );
}

function Refunded({ deal, locale, currency, resolved }: ViewProps & { resolved?: boolean }) {
  if (resolved)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <Mark size={110} state="shut" />
        <div>
          <div className="eyebrow">Problem resolved</div>
          <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[72px]" />
          <p className="mx-auto mt-4 max-w-[30ch] text-ink-2">The resolver split the money between the buyer and the seller. Every cent went to one of you.</p>
        </div>
        <Seal label="Resolved" sub="Split on Stellar" tone="mute" />
        <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
      </div>
    );
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <Mark size={110} state="open" />
      <div>
        <div className="eyebrow">Refunded</div>
        <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[72px] text-ink-2 [text-shadow:none]" />
        <p className="mx-auto mt-4 max-w-[28ch] text-ink-2">No deal, no problem. The money went back to the buyer.</p>
      </div>
      <Seal label="Refunded" sub="Back to buyer" tone="mute" />
      <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
    </div>
  );
}

/** Ship mode progress: the shake travels in the box. */
function ShipSteps({ status }: { status: Deal["status"] }) {
  const order = ["Locked", "Accepted", "Shipped", "Delivered"] as const;
  const at = status === "Disputed" ? 3 : Math.max(0, order.indexOf(status as (typeof order)[number]));
  const labels = ["Locked", "Packing", "Shipped", status === "Disputed" ? "Problem" : "Delivered"];
  return (
    <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Shipping progress">
      {labels.map((l, i) => (
        <li key={l} aria-current={i === at ? "step" : undefined}>
          <div className={`h-1 rounded-full ${i <= at ? (status === "Disputed" && i === 3 ? "bg-danger" : "bg-safe") : "bg-white/10"}`} />
          <div className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${i === at ? "text-ink" : "text-mute"}`}>{l}</div>
        </li>
      ))}
    </ol>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5" aria-live="polite">
      <Mark size={72} state="open" />
      <p className="text-mute">Checking the network…</p>
    </div>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <Mark size={72} state="open" />
      <h1 className="display text-[30px]">{title}</h1>
      <p className="max-w-[30ch] text-ink-2">{body}</p>
      {cta && <Link href={cta.href} className="contents"><Button variant="glass">{cta.label}</Button></Link>}
    </div>
  );
}
