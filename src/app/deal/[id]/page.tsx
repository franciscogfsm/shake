"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";
import { Mark } from "@/components/Mark";
import { Seal } from "@/components/Seal";
import { SellerQR } from "@/components/SellerQR";
import { Plane, BuyerPayQR, SellerPaidOffline } from "@/components/OfflineShake";
import { ScanFlow } from "@/components/ScanFlow";
import { Scanner, preloadScanner } from "@/components/Scanner";
import { ShakeBurst } from "@/components/ShakeBurst";
import { ShakeMoment } from "@/components/ShakeMoment";
import { CashOut } from "@/components/CashOut";
import { ProofLink } from "@/components/LiveReceipt";
import { SafeSpots } from "@/components/SafeSpots";
import { SafetyPromise } from "@/components/SafetyPromise";
import { HashTyper } from "@/components/Ticker";
import { Countdown, Item, Screen, Stagger, TestnetNote, useNow } from "@/components/ui";
import { currencyOfToken, formatMoney, fromUnits, toUnits } from "@/lib/config";
import { KINDS, kindOf, type Kind } from "@/lib/kinds";
import { Money, useCountry } from "@/components/Money";
import { codeToHex, dealMeta, newCode, qrPayload, sellerCode } from "@/lib/client/handshake";
import { useDeal, eventOf, type Deal, type DealEvent } from "@/lib/client/useDeal";
import { checkPay, offlineShake, useOfflineSettle, type OfflineShake } from "@/lib/client/offline";
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
  const [shaken, setShaken] = useState<OfflineShake | null>(null);
  useEffect(() => {
    setMe(getKeypair().publicKey());
    setShaken(offlineShake.get(id));
  }, [id]);
  const local = useMemo(() => ({ ...dealMeta.get(id), ...(q.get("s") ? { seller: q.get("s")! } : {}) }), [id, q]);
  // a shake with no signal: whichever phone gets signal first puts it on Stellar
  useOfflineSettle(deal, shaken, refresh);
  const onShaken = useCallback((s: OfflineShake) => {
    offlineShake.set(id, s);
    setShaken(s);
  }, [id]);
  // fetch the QR reader while there's signal, so the meetup works with none
  useEffect(() => {
    if (deal?.key) preloadScanner();
  }, [deal?.key]);
  // the buyer's half opened with the phone camera instead of the in-app scanner: same check
  useEffect(() => {
    if (!deal || !me || isMine(deal.buyer) || !location.hash.startsWith("#paid=")) return;
    const url = location.href;
    history.replaceState(null, "", location.pathname + location.search);
    checkPay(deal, sellerCode.get(deal.id), url).then((r) => typeof r !== "string" && onShaken(r));
  }, [deal, me, onShaken]);

  if (state === "loading" || !me) return <Screen wide fit><Loading /></Screen>;
  if (state === "missing") return <Screen wide fit back="/try"><Empty title="We couldn't find this deal." body="Check the link with the person who sent it." /></Screen>;
  if (state === "offline" && !deal) return <Screen wide fit><Empty title="You're offline." body="We'll show the deal as soon as you're back." /></Screen>;
  if (!deal) return null;

  const role = isMine(deal.buyer) ? "buyer" : deal.seller && deal.seller !== me ? "other" : "seller";
  const meta = { ...local, item: deal.memo || local.item };
  const kind = kindOf(deal.mode, q.get("k") ?? local.kind);
  const props = { kind, deal, events, meta, me, refresh, isNew: q.get("new") === "1", replay: q.get("replay") === "1", locale: country.locale, currency: currencyOfToken(deal.token).code, shaken, onShaken };
  const paidOffline = !!shaken && deal.status === "Accepted" && role !== "other";
  return (
    <Screen wide fit right={<Link href={`/r/${id}`} className="eyebrow rounded-full px-3 py-2 hover:text-ink">Receipt</Link>}>
      <AnimatePresence mode="wait">
        <motion.div key={`${role}-${paidOffline ? "offline" : ["Released", "Refunded", "Resolved"].includes(deal.status) ? deal.status : "open"}`} className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          {deal.status === "Released" ? (
            <Released {...props} role={role} />
          ) : paidOffline ? (
            role === "buyer" ? <BuyerPayQR deal={deal} shaken={shaken} locale={props.locale} currency={props.currency} /> : <SellerPaidOffline deal={deal} shaken={shaken} locale={props.locale} currency={props.currency} />
          ) : deal.status === "Refunded" ? (
            <Refunded {...props} />
          ) : deal.status === "Resolved" ? (
            <Refunded {...props} resolved />
          ) : role === "buyer" ? (
            deal.mode === "Hold" ? <HoldPayer {...props} /> : <BuyerView {...props} />
          ) : role === "seller" ? (
            deal.mode === "Hold" ? <HoldHolder {...props} /> : <SellerView {...props} />
          ) : (
            <Empty title="This deal belongs to another phone." body="Only the buyer and the seller who joined can act on it. Anyone can see the receipt." cta={{ href: `/r/${id}`, label: "See receipt" }} />
          )}
        </motion.div>
      </AnimatePresence>
    </Screen>
  );
}

type ViewProps = { kind: Kind; deal: Deal; events: DealEvent[]; meta: { item?: string; seller?: string; kind?: string }; me: string; refresh: () => Promise<void>; isNew: boolean; replay?: boolean; locale: string; currency: import("@/lib/config").CurrencyCode; shaken: OfflineShake | null; onShaken: (s: OfflineShake) => void };

/* ------------------------------ buyer ------------------------------ */

function BuyerView({ kind, deal, events, meta, refresh, isNew, locale, currency, onShaken }: ViewProps) {
  const job = kind === "service";
  const euros = fromUnits(deal.amount);
  const now = useNow();
  const ship = deal.mode === "Ship";
  const s = deal.status;
  const inBox = s === "Shipped" || s === "Delivered";
  const expired = now >= deal.expiry && (s === "Locked" || s === "Accepted");
  const joined = s !== "Locked";
  const canDispute = s === "Shipped" || (s === "Delivered" && now < deal.releaseAfter);
  const [share, setShare] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState("");
  const link = useDealLink(deal.id, meta, kind, isNew, setShare);
  const lockEv = eventOf(events, "locked");
  // scanning stays on this page, so it works even if the signal is already gone
  const [scan, setScan] = useState(false);

  const run = async (fn: "refund" | "dispute" | "approve") => {
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
        ? job ? "They joined. The work hasn't started yet." : "Seller joined. They're packing it."
        : s === "Shipped"
          ? job ? "Work in progress." : `On its way${deal.tracking ? ` · ${deal.tracking}` : ""}`
          : s === "Delivered"
            ? job ? "Marked done. Check the work." : "Delivered. Check it, then scan the QR in the box."
            : "Problem opened. The money is frozen.";

  if (scan && joined && !ship && !expired) return <ScanFlow deal={deal} onBack={() => setScan(false)} onReleased={refresh} onOffline={onShaken} />;
  return (
    <Stagger className="flex min-h-0 flex-1 flex-col gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-center lg:gap-x-16 lg:gap-y-6 lg:pt-0">
      <Item className="lg:col-start-1">
        <div className="eyebrow"><span className="lg:hidden">{meta.item || "Your deal"}{meta.seller ? ` · ${meta.seller}` : ""}</span><span className="hidden lg:inline">Your deal</span></div>
        <h1 className="display mt-3 hidden text-[52px] leading-[0.98] lg:block">{meta.item || "Your deal"}</h1>
        <div className="mt-3 flex items-center gap-3">
          <span className="pulse-dot" />
          <span className="text-ink-2">{status}</span>
        </div>
        {ship && <ShipSteps status={s} job={job} />}
      </Item>
      <Item className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass p-6 lg:p-8">
        <div className="eyebrow">Locked by you</div>
        <Money amount={euros} currency={currency} locale={locale} className="mt-3 text-[76px] lg:text-[88px]" />
        {lockEv && (
          <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-3 block text-xs text-mute hover:text-safe">
            proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
          </ProofLink>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
          {s === "Delivered" ? (
            <div><div className="text-mute">Pays the seller in</div><div className="mt-0.5 text-ink">{now >= deal.releaseAfter ? "Any moment" : <Countdown to={deal.releaseAfter} />}</div></div>
          ) : s === "Shipped" || s === "Disputed" ? (
            <div><div className="text-mute">Your money</div><div className="mt-0.5 text-ink">{s === "Disputed" ? "Frozen" : job ? "Locked until it's done" : "Locked until you open it"}</div></div>
          ) : (
            <div><div className="text-mute">Refund if no deal</div><div className="mt-0.5 text-ink">{expired ? "Available now" : <Countdown to={deal.expiry} />}</div></div>
          )}
          <div><div className="text-mute">{job ? "Pro" : "Seller"}</div><div className="mt-0.5 text-ink">{inBox ? (job ? "Working ✓" : "Shipped ✓") : joined ? "Joined ✓" : "Not yet"}{deal.seller && <Link href={`/u/${deal.seller}`} className="ml-2 text-mute underline-offset-4 hover:text-safe hover:underline">track record</Link>}</div></div>
        </div>
        <SafetyPromise kind={kind} payer expiry={deal.expiry} locale={locale} className="mt-4 border-t border-line pt-4" />
        </div>
      </Item>
      <div className="flex-1 lg:hidden" />
      <Item className="flex flex-col gap-3 lg:col-start-1 lg:max-w-[420px]">
        {ship && joined ? (
          <>
            {inBox && job && <Button full loading={cancelling} onClick={() => run("approve")}>Approve and pay</Button>}
            {inBox && !job && (
              <Link href={`/scan/${deal.id}`} className="contents">
                <Button full>Scan the QR in the box</Button>
              </Link>
            )}
            {canDispute && (
              <Button variant="ghost" full loading={cancelling} onClick={() => run("dispute")}>{job ? "Open a problem" : "It didn't arrive, or it's wrong"}</Button>
            )}
            {expired && <Button variant="ghost" full loading={cancelling} onClick={cancel}>Refund me now</Button>}
            <p className="text-center text-sm text-mute">
              {s === "Accepted"
                ? job ? "Once they start you can't pull the money back. You approve when it's done." : "Once it's shipped you can't pull the money back. Check the item first: scanning the QR in the box pays the seller."
                : s === "Disputed"
                  ? "A neutral resolver looks at it. They can only split the money between you two, never keep it."
                  : job ? "Happy with it? Approve. Problem? Open it before the 3 days after they mark it done run out." : "Nothing wrong? Scan the QR. Problem? Open it before the 3 days after delivery run out."}
            </p>
          </>
        ) : joined && !expired ? (
          <Button full onClick={() => setScan(true)}>Scan seller&apos;s QR</Button>
        ) : !joined ? (
          <>
            <div className="hidden lg:block">
              <ShareLink link={link} money={formatMoney(euros, currency, locale)} item={meta.item} kind={kind} />
            </div>
            <Button className="lg:hidden" full onClick={() => setShare(true)}>Send link to seller</Button>
          </>
        ) : null}
        {(!joined || (expired && !ship)) && (
          <Button variant="ghost" full loading={cancelling} onClick={cancel}>
            {expired ? "Refund me now" : "Cancel and refund"}
          </Button>
        )}
        {joined && !expired && !ship && <SafeSpots />}
        {joined && !expired && !ship && <p className="text-center text-sm text-mute">Only the seller can cancel now. If you don&apos;t meet, you&apos;re refunded automatically.</p>}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>

      <div className="contents lg:hidden">
        <GlassSheet open={share} onClose={() => setShare(false)} label="Send the link">
          <ShareSheet link={link} money={formatMoney(euros, currency, locale)} item={meta.item} kind={kind} />
        </GlassSheet>
      </div>
    </Stagger>
  );
}

function shareLink(id: string, meta: ViewProps["meta"], kind: Kind) {
  const q = new URLSearchParams({ i: meta.item ?? "", k: kind, ...(meta.seller ? { s: meta.seller } : {}) });
  return `${location.origin}/deal/${id}?${q}`;
}

/** Filled after mount so the server and the phone agree. Opens the sheet only on a phone. */
function useDealLink(id: string, meta: ViewProps["meta"], kind: Kind, isNew: boolean, openSheet: (v: boolean) => void) {
  const [link, setLink] = useState("");
  const item = meta.item;
  const seller = meta.seller;
  useEffect(() => {
    setLink(shareLink(id, { item, seller }, kind));
  }, [id, item, seller, kind]);
  useEffect(() => {
    if (isNew && matchMedia("(max-width: 1023px)").matches) openSheet(true);
  }, [isNew, openSheet]);
  return link;
}

const SHARE_TEXT: Record<Kind, (money: string, item: string) => string> = {
  meet: (m, i) => `I locked ${m} for ${i} with SHAKE. Check it's real, then we meet and shake:`,
  ship: (m, i) => `I locked ${m} for ${i} with SHAKE. Check it's real, then ship it with the QR in the box:`,
  service: (m, i) => `I locked ${m} for ${i} with SHAKE. Check it's real: it's yours when the job is done:`,
  order: (m, i) => `I locked ${m} for ${i} with SHAKE. Check it's real and start making it: it's yours when I get it:`,
  deposit: (m, i) => `I'm holding the ${m} deposit for ${i} with SHAKE. Check it's real and confirm you're the landlord:`,
  booking: (m, i) => `I'm holding the ${m} deposit for ${i} with SHAKE. Check it's real and confirm the booking:`,
};

function useLinkShare(link: string, text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const share = async () => {
    try {
      if (navigator.share) return await navigator.share({ title: "SHAKE", text, url: link });
    } catch {
      return;
    }
    copy();
  };
  return { copied, copy, share };
}

function shareBlurb(kind: Kind) {
  return `Send this link on WhatsApp, by email or in your OLX or Vinted chat. The ${KINDS[kind].payee} sees the real money, not a screenshot.`;
}

/** Desktop: the link lives in the column beside the amount. The phone keeps the sheet. */
function ShareLink({ link, money, item, kind }: { link: string; money: string; item?: string; kind: Kind }) {
  const { copied, copy, share } = useLinkShare(link, SHARE_TEXT[kind](money, item || "it"));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed text-ink-2">{shareBlurb(kind)}</p>
      <div className="flex items-center gap-2 rounded-2xl bg-white/5 py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{link || "Preparing your link…"}</span>
        <button type="button" onClick={copy} className="h-10 shrink-0 rounded-full bg-white/10 px-4 text-sm font-medium text-ink hover:bg-white/15">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <Button full onClick={share}>Share link</Button>
    </div>
  );
}

function ShareSheet({ link, money, item, kind }: { link: string; money: string; item?: string; kind: Kind }) {
  const { copied, copy, share } = useLinkShare(link, SHARE_TEXT[kind](money, item || "it"));
  return (
    <div className="flex flex-col gap-5 pb-2">
      <div>
        <Mark size={40} state="rest" />
        <h2 className="display mt-4 text-[30px]">{KINDS[kind].mode === "Hold" ? "Your deposit is held." : "Your money is locked."}</h2>
        <p className="mt-2 text-ink-2">{shareBlurb(kind)}</p>
      </div>
      <div className="truncate rounded-2xl bg-white/5 px-4 py-3 font-mono text-xs text-ink-2">{link}</div>
      <Button full onClick={share}>Share link</Button>
      <Button variant="glass" full onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</Button>
    </div>
  );
}

/* ------------------------------ seller ------------------------------ */

function SellerView({ kind, deal, events, meta, me, refresh, locale, currency, onShaken }: ViewProps) {
  const job = kind === "service";
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
  // no signal at the meetup: read the buyer's half from their screen instead
  const [scanPay, setScanPay] = useState(false);
  const [payErr, setPayErr] = useState("");
  const took = useRef(false);
  const onPay = async (text: string) => {
    if (took.current) return;
    const r = await checkPay(deal, code, text);
    if (typeof r === "string") return setPayErr(r);
    took.current = true;
    setShowQR(false);
    onShaken(r);
  };
  const closeQR = () => {
    setShowQR(false);
    setScanPay(false);
  };
  return (
    <Stagger className="flex min-h-0 flex-1 flex-col gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-center lg:gap-x-16 lg:gap-y-6 lg:pt-0">
      <Item className="lg:col-start-1">
        <div className="eyebrow">{meta.item || "A deal"}{meta.seller ? ` · for ${meta.seller}` : ""}</div>
        <h1 className="display mt-3 text-[34px] lg:text-[52px] lg:leading-[0.98]">
          {s === "Shipped" ? (job ? "Work in progress." : "It's on its way.") : s === "Delivered" ? (job ? "Done. Almost yours." : "Delivered. Almost yours.") : s === "Disputed" ? `The ${job ? "client" : "buyer"} opened a problem.` : "Someone locked money for you."}
        </h1>
        {ship && <ShipSteps status={s} job={job} />}
      </Item>
      <Item className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Locked for you</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>
        </div>
        <Money amount={euros} currency={currency} locale={locale} tick className="mt-3 text-[84px]" />
        <div className="mt-4 flex items-center gap-2 text-[15px] font-medium text-safe">
          <span className="pulse-dot" /> Verified on the Stellar network
        </div>
        <Link href={`/u/${deal.buyer}`} className="mt-1 block text-xs text-mute hover:text-safe">buyer&apos;s track record ↗</Link>
        {lockEv && (
          <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-2 block text-xs text-mute hover:text-safe">
            see proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
          </ProofLink>
        )}
        <p className="mt-5 border-t border-line pt-4 text-[14px] text-ink-2">
          {job
            ? s === "Delivered"
              ? <>It&apos;s yours when the client approves, or automatically in <Countdown to={deal.releaseAfter} /> if they stay silent.</>
              : s === "Disputed"
                ? "A neutral resolver splits it between you two. Nobody can keep it."
                : "This is real money held by public code, not a screenshot. It's yours when the client approves the work."
            : ship
            ? s === "Delivered"
              ? <>It&apos;s yours when the buyer scans the QR in the box, or automatically in <Countdown to={deal.releaseAfter} /> if they stay silent.</>
              : s === "Disputed"
                ? "A neutral resolver splits it between you two. Nobody can keep it."
                : "This is real money held by public code, not a screenshot. Put your QR in the box: it's yours when the buyer scans it."
            : "This is real money held by public code, not a screenshot. It's yours the moment the buyer scans your QR."}
        </p>
        <SafetyPromise kind={kind} payer={false} expiry={deal.expiry} locale={locale} className="mt-4" />
        </div>
      </Item>
      <div className="flex-1 lg:hidden" />
      <Item className="flex flex-col gap-3 lg:col-start-1 lg:max-w-[420px]">
        {job && mine && s === "Accepted" && !expired ? (
          <Button full loading={busy === "step"} onClick={() => step("mark_shipped")}>I&apos;ve started the work</Button>
        ) : job && mine && s === "Shipped" ? (
          <>
            <Button full loading={busy === "step"} onClick={() => step("mark_delivered")}>It&apos;s done</Button>
            <p className="text-center text-sm text-mute">The client then has 3 days to approve or open a problem. Silence pays you.</p>
          </>
        ) : ship && mine && ready && s === "Accepted" && !expired ? (
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
            <p className="text-center text-ink-2">{job ? "Waiting for the client to check the work." : "Waiting for the buyer to open the box."}</p>
          )
        ) : ship && s === "Disputed" ? null : expired ? (
          <p className="text-center text-ink-2">This deal expired. The buyer can take the money back.</p>
        ) : ready ? (
          <>
            <Button full onClick={() => setShowQR(true)}>Show my QR</Button>
            <SafeSpots />
          </>
        ) : (
          <Button full loading={busy === "joining"} onClick={join}>{mine ? "Make a new QR" : job ? "I'm doing the job" : ship ? "I'll ship it, make my QR" : "I'm meeting them, show my QR"}</Button>
        )}
        {mine && !expired && (s === "Locked" || s === "Accepted") && (
          <Button variant="ghost" full loading={busy === "cancelling"} onClick={cancel}>Cancel deal and refund buyer</Button>
        )}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>

      <GlassSheet open={showQR && !!ready} onClose={closeQR} label="Your QR">
        <div className="flex flex-col items-center gap-5 pb-3">
          <div className="text-center">
            <h2 className="display text-[28px]">{scanPay ? "Scan the buyer's screen." : ship ? "Put this in the box." : "Let the buyer scan this."}</h2>
            <p className="mt-1.5 text-sm text-ink-2">
              {scanPay
                ? "After they scan your QR and hold, their phone shows their half of the key. No signal needed."
                : ship ? "Print it or write the code on a note inside the package. The buyer scans it when they open it." : "Hand over the item once your screen says released. Turn your brightness up."}
            </p>
          </div>
          {scanPay ? (
            <>
              <Scanner onCode={onPay} hint="Point at the buyer's screen" className="max-w-[320px]" />
              {payErr && <p className="text-center text-sm text-ink-2" role="alert">{payErr}</p>}
              <button type="button" onClick={() => setScanPay(false)} className="text-sm text-mute underline-offset-4 hover:text-safe hover:underline">Show my QR again</button>
            </>
          ) : (
            <>
              {code && <SellerQR payload={qrPayload(location.origin, deal.id, code)} code={code} />}
              {deal.key && !ship && (
                <button type="button" onClick={() => { setPayErr(""); setScanPay(true); }} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-2 hover:text-safe">
                  <Plane className="text-safe" /> No signal? Scan the buyer&apos;s phone
                </button>
              )}
            </>
          )}
        </div>
      </GlassSheet>
    </Stagger>
  );
}

/* ------------------------------ endings ------------------------------ */

function Released({ deal, events, role, locale, currency, replay, shaken }: ViewProps & { role: string }) {
  const euros = fromUnits(deal.amount);
  const rel = eventOf(events, "released");
  // play the full shake on both phones when the release just happened (or this phone just shook);
  // a seller paid with no signal already saw it at the meetup
  const [fresh] = useState(() => replay || (!(shaken && role === "seller") && (!rel || Date.now() - new Date(rel.at).getTime() < 90_000)));
  const clock = (t: number | string) => new Date(t).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const [burst, setBurst] = useState(!fresh);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <ShakeMoment play={fresh} onDone={() => setBurst(true)} />
      <Stagger className="flex w-full flex-1 flex-col items-center justify-center gap-8 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:gap-y-4 lg:text-left" delay={0.05} key={String(burst)}>
      <Item className="relative grid size-56 place-items-center lg:col-start-1 lg:row-span-3 lg:justify-self-end">
        <ShakeBurst fire={burst} size={224} />
        <Mark size={128} state={burst ? "shut" : "open"} />
      </Item>
      <Item className="lg:col-start-2">
        <div className="eyebrow">{role === "seller" ? "Paid to you" : "Released to the seller"}</div>
        <Money amount={euros} currency={currency} locale={locale} className="mt-3 text-[80px] lg:text-[96px]" />
        <p className="mx-auto mt-4 max-w-[26ch] text-lg text-ink-2 lg:mx-0">Final. No chargebacks. No screenshots.</p>
        {shaken && rel && (
          <p className="mx-auto mt-3 inline-flex items-center gap-2 text-sm text-mute lg:mx-0">
            <Plane className="text-safe" /> Shaken with no signal at {clock(shaken.at)} · on Stellar at {clock(rel.at)}
          </p>
        )}
      </Item>
      <Item className="lg:col-start-2">{burst && <Seal />}</Item>
      <Item className="flex w-full max-w-[420px] flex-col gap-3 lg:col-start-2 lg:justify-self-start">
        {role === "seller" && <CashOut amount={euros} currency={currency} locale={locale} />}
        <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
        {rel && <ProofLink hash={rel.txHash} at={rel.at} className="text-sm text-mute hover:text-safe">Proof on Stellar ↗</ProofLink>}
      </Item>
      </Stagger>
    </div>
  );
}

function Refunded({ deal, locale, currency, resolved }: ViewProps & { resolved?: boolean }) {
  const hold = deal.mode === "Hold";
  if (resolved)
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center lg:grid lg:grid-cols-2 lg:gap-16 lg:text-left">
        <Mark size={110} state="shut" />
        <div className="flex max-w-[440px] flex-col items-center gap-8 lg:items-start">
        <div>
          <div className="eyebrow">Problem resolved</div>
          <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[72px] lg:text-[88px]" />
          <p className="mx-auto mt-4 max-w-[30ch] text-ink-2 lg:mx-0">{deal.mode === "Hold" ? "The claim was settled. Every cent of the deposit went to one of you." : "The resolver split the money between the buyer and the seller. Every cent went to one of you."}</p>
        </div>
        <Seal label="Resolved" sub="Split on Stellar" tone="mute" />
        <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
        </div>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center lg:grid lg:grid-cols-2 lg:gap-16 lg:text-left">
      <Mark size={110} state="open" />
      <div className="flex max-w-[440px] flex-col items-center gap-8 lg:items-start">
      <div>
        <div className="eyebrow">{hold ? "Deposit returned" : "Refunded"}</div>
        <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[72px] text-ink-2 lg:text-[88px] [text-shadow:none]" />
        <p className="mx-auto mt-4 max-w-[28ch] text-ink-2 lg:mx-0">{hold ? "The whole deposit went back to the payer. Every cent." : "No deal, no problem. The money went back to the buyer."}</p>
      </div>
      <Seal label={hold ? "Returned" : "Refunded"} sub={hold ? "Back to payer" : "Back to buyer"} tone="mute" />
      <Link href={`/r/${deal.id}`} className="contents"><Button full variant="glass">See receipt</Button></Link>
      </div>
    </div>
  );
}

/** Ship mode progress: the shake travels in the box. */
function ShipSteps({ status, job }: { status: Deal["status"]; job?: boolean }) {
  const order = ["Locked", "Accepted", "Shipped", "Delivered"] as const;
  const at = status === "Disputed" ? 3 : Math.max(0, order.indexOf(status as (typeof order)[number]));
  const labels = job ? ["Locked", "Joined", "Working", status === "Disputed" ? "Problem" : "Done"] : ["Locked", "Packing", "Shipped", status === "Disputed" ? "Problem" : "Delivered"];
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

/* ------------------------------ deposits (hold mode) ------------------------------ */

const dateOf = (t: number, locale: string) => new Date(t * 1000).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

/** One deal call with the shared busy and error handling of the deposit screens. */
function useStep(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const go = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't reach the network right now. Try again.");
    } finally {
      setBusy("");
    }
  };
  return { busy, err, go };
}

/** The tenant (or renter): the deposit comes back on the end date by itself. */
function HoldPayer({ kind, deal, events, meta, refresh, isNew, locale, currency }: ViewProps) {
  const k = KINDS[kind];
  const now = useNow();
  const s = deal.status;
  const joined = s !== "Locked";
  const due = now >= deal.expiry;
  const claimed = fromUnits(deal.claimed);
  const money = (n: number) => formatMoney(n, currency, locale);
  const [share, setShare] = useState(false);
  const link = useDealLink(deal.id, meta, kind, isNew, setShare);
  const { busy, err, go } = useStep(refresh);
  const call = (fn: "refund" | "agree") => go(fn, () => callDeal(getKeypair(), fn, { dealId: deal.id }));
  const lockEv = eventOf(events, "locked");
  const ends = dateOf(deal.expiry, locale);

  return (
    <Stagger className="flex min-h-0 flex-1 flex-col gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-center lg:gap-x-16 lg:gap-y-6 lg:pt-0">
      <Item className="lg:col-start-1">
        <div className="eyebrow">{k.label}{meta.seller ? ` · ${meta.seller}` : ""}</div>
        <h1 className="display mt-3 text-[34px] lg:text-[52px] lg:leading-[0.98]">{meta.item || "Your deposit"}</h1>
        <div className="mt-3 flex items-center gap-3">
          <span className="pulse-dot" />
          <span className="text-ink-2">
            {!joined ? `Held. Waiting for the ${k.payee} to confirm.` : s === "Disputed" ? `The ${k.payee} claims ${money(claimed)}.` : due ? "The end date passed. It's yours again." : `Held safely. Back to you on ${ends}.`}
          </span>
        </div>
      </Item>
      <Item className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass p-6 lg:p-8">
          <div className="eyebrow">Your deposit</div>
          <Money amount={fromUnits(deal.amount)} currency={currency} locale={locale} className="mt-3 text-[76px] lg:text-[88px]" />
          {lockEv && (
            <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-3 block text-xs text-mute hover:text-safe">
              proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
            </ProofLink>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
            <div><div className="text-mute">Back to you</div><div className="mt-0.5 text-ink">{s === "Disputed" ? "Frozen by a claim" : due ? "Now" : <>in <Countdown to={deal.expiry} /></>}</div></div>
            <div><div className="text-mute">{k.payee[0].toUpperCase() + k.payee.slice(1)}</div><div className="mt-0.5 text-ink">{joined ? "Confirmed ✓" : "Not yet"}{deal.seller && <Link href={`/u/${deal.seller}`} className="ml-2 text-mute underline-offset-4 hover:text-safe hover:underline">track record</Link>}</div></div>
          </div>
          <SafetyPromise kind={kind} payer expiry={deal.expiry} locale={locale} className="mt-4 border-t border-line pt-4" />
        </div>
      </Item>
      <div className="flex-1 lg:hidden" />
      <Item className="flex flex-col gap-3 lg:col-start-1 lg:max-w-[420px]">
        {!joined ? (
          <>
            <div className="hidden lg:block">
              <ShareLink link={link} money={formatMoney(fromUnits(deal.amount), currency, locale)} item={meta.item} kind={kind} />
            </div>
            <Button className="lg:hidden" full onClick={() => setShare(true)}>Send link to the {k.payee}</Button>
            <Button variant="ghost" full loading={busy === "refund"} onClick={() => call("refund")}>Cancel and get it back</Button>
          </>
        ) : s === "Disputed" ? (
          <>
            <Button full loading={busy === "agree"} onClick={() => call("agree")}>
              Accept: {money(claimed)} to them, {money(fromUnits(deal.amount) - claimed)} back to me
            </Button>
            <p className="text-center text-sm text-mute">Don&apos;t agree? Do nothing. A neutral resolver looks at it and splits it between you two. Nobody can keep it.</p>
          </>
        ) : due ? (
          <Button full loading={busy === "refund"} onClick={() => call("refund")}>Get my deposit back</Button>
        ) : (
          <p className="text-center text-sm text-mute">The {k.payee} can&apos;t spend it, and neither can you. Only they can return it early or claim damage. If they do nothing, it comes back to you on {ends}.</p>
        )}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>

      <div className="contents lg:hidden">
        <GlassSheet open={share} onClose={() => setShare(false)} label="Send the link">
          <ShareSheet link={link} money={formatMoney(fromUnits(deal.amount), currency, locale)} item={meta.item} kind={kind} />
        </GlassSheet>
      </div>
    </Stagger>
  );
}

/** The landlord (or owner): sees the real deposit, can return it or claim damage, never just keep it. */
function HoldHolder({ kind, deal, events, meta, me, refresh, locale, currency }: ViewProps) {
  const k = KINDS[kind];
  const now = useNow();
  const s = deal.status;
  const mine = deal.seller === me;
  const due = now >= deal.expiry;
  const total = fromUnits(deal.amount);
  const money = (n: number) => formatMoney(n, currency, locale);
  const [claim, setClaim] = useState("");
  const amount = Number(claim.replace(",", "."));
  const okClaim = amount > 0 && amount <= total;
  const { busy, err, go } = useStep(refresh);
  const lockEv = eventOf(events, "locked");
  const ends = dateOf(deal.expiry, locale);

  const join = () =>
    go("join", async () => {
      const kp = getKeypair();
      await ensureAccount(kp, 0);
      // deposits never use the QR: the committed secret is thrown away
      const hash = await sha256Hex(codeToHex(newCode()));
      await callDeal(kp, "accept", { dealId: deal.id, seller: kp.publicKey(), hash });
    });

  return (
    <Stagger className="flex min-h-0 flex-1 flex-col gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-center lg:gap-x-16 lg:gap-y-6 lg:pt-0">
      <Item className="lg:col-start-1">
        <div className="eyebrow">{meta.item || k.label}</div>
        <h1 className="display mt-3 text-[34px] lg:text-[52px] lg:leading-[0.98]">
          {!mine ? "A deposit is held for you." : s === "Disputed" ? `You claimed ${money(fromUnits(deal.claimed))}.` : due ? "The deposit goes back." : "The deposit is held."}
        </h1>
      </Item>
      <Item className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Deposit held</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7" /></svg>
          </div>
          <Money amount={total} currency={currency} locale={locale} tick className="mt-3 text-[84px]" />
          <div className="mt-4 flex items-center gap-2 text-[15px] font-medium text-safe">
            <span className="pulse-dot" /> Verified on the Stellar network
          </div>
          <Link href={`/u/${deal.buyer}`} className="mt-1 block text-xs text-mute hover:text-safe">payer&apos;s track record ↗</Link>
          {lockEv && (
            <ProofLink hash={lockEv.txHash} at={lockEv.at} className="mt-2 block text-xs text-mute hover:text-safe">
              see proof <HashTyper text={lockEv.txHash.slice(0, 24)} /> ↗
            </ProofLink>
          )}
          <p className="mt-5 border-t border-line pt-4 text-[14px] text-ink-2">
            {s === "Disputed"
              ? "Frozen until the payer accepts your claim, or a neutral resolver splits it. Nobody can keep it."
              : `Real money held by public code, not a promise. It goes back to the payer on ${ends} unless you claim damage before then.`}
          </p>
          <SafetyPromise kind={kind} payer={false} expiry={deal.expiry} locale={locale} className="mt-4" />
        </div>
      </Item>
      <div className="flex-1 lg:hidden" />
      <Item className="flex flex-col gap-3 lg:col-start-1 lg:max-w-[420px]">
        {!mine ? (
          <Button full loading={busy === "join"} onClick={join}>Confirm I&apos;m the {k.payee}</Button>
        ) : s === "Disputed" ? (
          <Button variant="ghost" full loading={busy === "refund"} onClick={() => go("refund", () => callDeal(getKeypair(), "refund", { dealId: deal.id }))}>Drop my claim, return it all</Button>
        ) : due ? (
          <p className="text-center text-ink-2">The end date passed. The deposit goes back to the payer.</p>
        ) : (
          <>
            <div className="glass flex items-center gap-2 rounded-2xl px-4 py-1">
              <label htmlFor="claim" className="shrink-0 text-[15px] text-ink-2">Claim for damage</label>
              <input
                id="claim"
                value={claim}
                onChange={(e) => setClaim(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
                inputMode="decimal"
                placeholder={money(0)}
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent py-3 text-right font-mono text-ink outline-none placeholder:text-white/25"
              />
            </div>
            <Button full disabled={!okClaim} loading={busy === "claim"} onClick={() => go("claim", () => callDeal(getKeypair(), "claim_damage", { dealId: deal.id, amount: toUnits(amount).toString() }))}>
              {okClaim ? `Claim ${money(amount)}` : amount > total ? `Up to ${money(total)}` : "Claim damage"}
            </Button>
            <Button variant="ghost" full loading={busy === "refund"} onClick={() => go("refund", () => callDeal(getKeypair(), "refund", { dealId: deal.id }))}>Return the deposit now</Button>
          </>
        )}
        {err && <p className="text-center text-sm text-ink-2" role="alert">{err}</p>}
        <TestnetNote />
      </Item>
    </Stagger>
  );
}
