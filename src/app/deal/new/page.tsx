"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark, springs } from "@/components/Mark";
import { PaySheet } from "@/components/PaySheet";
import { NumberTicker } from "@/components/Ticker";
import { Item, Screen, Stagger, TestnetNote } from "@/components/ui";
import { CURRENCIES, formatMoney, moneyParts, newDealId, toUnits, type CurrencyCode } from "@/lib/config";
import { listingSource } from "@/lib/listingImport";
import { SafetyPromise } from "@/components/SafetyPromise";
import { parseAmount } from "@/lib/amount";
import { CountryPicker, useCountry } from "@/components/Money";
import { ApiError, callDeal, ensureAccount, getKeypair } from "@/lib/client/wallet";
import { dealMeta } from "@/lib/client/handshake";
import { buyerKey } from "@/lib/client/offline";
import { fundPasskeyWallet, passkeySupported } from "@/lib/client/passkey";
import { nidoAddress, nidoStatus } from "@/lib/client/nido";
import { NidoMark, NidoSheet } from "@/components/NidoSheet";
import { KIND_ORDER, KINDS, type Kind } from "@/lib/kinds";
import { haptic, sfx } from "@/lib/client/sfx";

const MAX = 2000;
const DAY = 24 * 60 * 60;
type Phase = "form" | "locking" | "failed";
type Wallet = "key" | "nido";
const steps = (wallet: Wallet, via: string) => [
  { key: "account", label: wallet === "nido" ? `Nido wallet · paying with ${via || "test money"}` : via ? `Paying with ${via} · test money` : "Setting up your money" },
  { key: "preparing", label: "Preparing the lock" },
  { key: "signing", label: wallet === "nido" ? "Face ID signs for your Nido account" : "Signing on this phone" },
  { key: "confirming", label: "Confirming on the network" },
];

const dayInput = (days: number) => new Date(Date.now() + days * DAY * 1000).toISOString().slice(0, 10);

export default function NewDealPage() {
  return (
    <Suspense>
      <NewDeal />
    </Suspense>
  );
}

function NewDeal() {
  const router = useRouter();
  const q = useSearchParams();
  const source = listingSource(q.get("source"));
  // A payment request link (?r=1) comes from the one getting paid: everything is filled in, the payer checks and locks.
  const request = q.get("r") === "1" && !!q.get("s");
  const [item, setItem] = useState(() => (q.get("i") ?? "").slice(0, 40));
  const [price, setPrice] = useState("");
  const [seller, setSeller] = useState(() => (q.get("s") ?? "").slice(0, 32));
  // The one getting paid makes a reusable link instead of locking; every customer who opens it gets their own deal.
  const [asking, setAsking] = useState(false);
  const [linkState, setLinkState] = useState("");
  const [kind, setKindState] = useState<Kind>(() => (KINDS[q.get("k") as Kind] ? (q.get("k") as Kind) : "meet"));
  const k = KINDS[kind];
  const hold = k.mode === "Hold";
  const [ends, setEnds] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(q.get("e") ?? "") && q.get("e")! > dayInput(0) ? q.get("e")! : dayInput(k.days)));
  const setKind = (v: Kind) => {
    setKindState(v);
    setEnds(dayInput(KINDS[v].days));
  };
  const [from, setFrom] = useState("");
  const autofill = async (url: string) => {
    setFrom("Reading the listing…");
    try {
      const r = await fetch(`/api/listing?url=${encodeURIComponent(url)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.title) setItem(j.title);
      // Do not silently reinterpret a listing's price in a different currency.
      if (j.currency === currency && j.price && j.price <= MAX) setPrice(new Intl.NumberFormat(country.locale, { useGrouping: false, maximumFractionDigits: 2 }).format(j.price));
      setFrom(`Filled from ${j.source}. Check it matches.`);
    } catch (e) {
      setFrom(e instanceof Error && e.message ? `${e.message}. Type the item instead.` : "Couldn’t read that link. Type the item instead.");
    }
  };
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const [faceIdOk, setFaceIdOk] = useState(false);
  const [wallet, setWallet] = useState<Wallet>("key");
  /** The pay sheet is open for that wallet, and the method picked in it. */
  const [paying, setPaying] = useState<Wallet | null>(null);
  const [nidoOpen, setNidoOpen] = useState(false);
  // Nido approved: pick how to pay, then lock from the Nido account
  const onNidoReady = useCallback(() => {
    setNidoOpen(false);
    setPaying("nido");
  }, []);
  const [via, setVia] = useState("");
  useEffect(() => setFaceIdOk(passkeySupported()), []);
  const [country, setCountry] = useCountry();
  const currency = country.currency;
  const sym = moneyParts(1, currency, country.locale);
  // the request is in the payee's currency: switch to it rather than reinterpret the amount
  const asked = { p: q.get("p") ?? "", c: q.get("c") as CurrencyCode };
  const askedOk = /^\d{1,4}(\.\d{1,2})?$/.test(asked.p) && !!CURRENCIES[asked.c]?.token;
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => setPreferencesReady(true), []);
  const imported = useRef("");
  useEffect(() => {
    const key = `${asked.p}:${asked.c}`;
    if (!preferencesReady || !askedOk || imported.current === key) return;
    imported.current = key;
    if (country.currency !== asked.c) setCountry({ ...country, currency: asked.c });
    setPrice(new Intl.NumberFormat(country.locale, { useGrouping: false, maximumFractionDigits: 2 }).format(Number(asked.p)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesReady, country, asked.p, asked.c, askedOk]);

  const amount = parseAmount(price, country.locale);
  const endsAt = Math.floor(new Date(`${ends}T23:59:00`).getTime() / 1000);
  const valid = item.trim().length > 1 && amount >= 1 && amount <= MAX && (!hold || endsAt > Date.now() / 1000 + 600) && (!asking || seller.trim().length > 1);

  const askLink = async () => {
    const params = new URLSearchParams({ r: "1", k: kind, i: item.trim(), p: String(amount), c: currency, s: seller.trim(), ...(hold ? { e: ends } : {}) });
    const url = `${location.origin}/deal/new?${params}`;
    const text = `Pay ${money(amount)} for ${item.trim()} with SHAKE. ${hold ? "It comes back to you at the end, unless there's damage." : "It stays safe until you get what you paid for."}`;
    try {
      if (navigator.share) return await navigator.share({ text, url });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setLinkState("Link copied. Paste it in your chat, bio or invoice. It works for every customer.");
    } catch {
      setLinkState(url);
    }
  };
  const money = (n: number) => formatMoney(n, currency, country.locale);

  const lock = async (using = wallet) => {
    if (!valid || busy.current) return;
    setWallet(using);
    busy.current = true;
    setPhase("locking");
    setError("");
    try {
      const kp = getKeypair();
      setStep("account");
      // Face ID: the buyer is the person's Nido smart account (C… address); otherwise the invisible key
      let buyer = kp.publicKey();
      if (using === "nido") {
        buyer = nidoAddress()!;
        await fundPasskeyWallet(buyer, amount, currency);
      } else await ensureAccount(kp, amount, currency);
      const dealId = newDealId();
      // deposits end on the chosen day; shipping and jobs need time; refund stays possible until the seller marks it shipped
      const expiry = String(hold ? endsAt : Math.floor(Date.now() / 1000) + k.days * DAY);
      // the memo is public on-chain: it is what the link preview and receipt show
      const memo = (seller.trim() ? `${item.trim()} · for ${seller.trim()}` : item.trim()).slice(0, 60);
      // meet deals also commit the buyer's half of the key, so the shake works with no signal
      const args: Record<string, string> = { buyer, token: CURRENCIES[currency].token, amount: toUnits(amount).toString(), dealId, expiry, memo };
      if (k.fn === "lock") args.key = await buyerKey(kp, dealId);
      await callDeal(kp, k.fn, args, setStep);
      dealMeta.set(dealId, { item: item.trim(), seller: seller.trim(), kind, ...(source ? { listingUrl: source.url } : {}) });
      const link = new URLSearchParams({ i: item.trim(), k: kind, ...(seller.trim() ? { s: seller.trim() } : {}) });
      router.replace(`/deal/${dealId}?${link}&new=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The network didn't answer in time. Your money is safe; nothing was locked.");
      setPhase("failed");
    } finally {
      busy.current = false;
    }
  };

  return (
    <Screen wide fit back="/try" right={phase === "form" && !request ? <CountryPicker country={country} onChange={(next) => {
      if (Number.isFinite(amount)) setPrice(new Intl.NumberFormat(next.locale, { useGrouping: false, maximumFractionDigits: 2 }).format(amount));
      setCountry(next);
    }} /> : undefined}>
      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.form
            key="form"
            exit={{ opacity: 0, scale: 0.98 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (asking) askLink();
              else if (!valid) return;
              else if (!faceIdOk) setPaying("key");
              else if (nidoStatus(currency) === "ready") setPaying("nido");
              else setNidoOpen(true);
            }}
            className="flex flex-1 flex-col"
          >
            <Stagger className="flex min-h-0 flex-1 flex-col gap-8 pt-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,440px)] lg:items-center lg:gap-16 lg:pt-0">
              <Item className="flex flex-col gap-8">
              <div>
                <div className="eyebrow">{request ? `${seller} asks for a safe payment` : asking ? "Ask for a safe payment" : "New safe payment"}</div>
                {source && <div className="glass mt-4 max-w-[480px] p-4">
                  <div className="eyebrow text-safe">From your marketplace listing</div>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-sm text-ink underline underline-offset-4">{source.host} · view original listing ↗</a>
                  <p className="mt-2 text-sm text-ink-2">Check the item and agree the amount with the seller. SHAKE is independent of this marketplace; importing a listing does not verify its seller.</p>
                </div>}
                {!request && <div className="relative mt-3 w-fit max-w-full">
                  <select
                    aria-label="What is it for?"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as Kind)}
                    className="max-w-full appearance-none rounded-full border border-safe/30 bg-safe/10 py-2 pl-4 pr-10 text-[14px] font-medium text-safe outline-none focus-visible:ring-2 focus-visible:ring-safe"
                  >
                    {KIND_ORDER.map((v) => <option key={v} value={v} className="bg-[#101419] text-white">{KINDS[v].label}</option>)}
                  </select>
                  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-safe"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>}
                <h1 className="display mt-5 text-[40px] lg:text-[64px] lg:leading-[0.96]">{k.ask}</h1>
              </div>
              <div>
                <label htmlFor="item" className="sr-only">Item</label>
                <input
                  id="item"
                  value={item}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (/^https:\/\/\S+$/.test(v)) return autofill(v);
                    setItem(e.target.value.slice(0, 40));
                  }}
                  placeholder={k.placeholder}
                  autoComplete="off"
                  aria-describedby="item-hint"
                  className="w-full border-b border-line bg-transparent pb-3 font-display text-2xl tracking-[-0.02em] text-ink outline-none focus-visible:outline-none placeholder:text-white/25 focus:border-safe"
                />
                <p id="item-hint" className="mt-2 text-[13px] text-mute" aria-live="polite">{from || (k.mode === "Hold" || kind === "service" ? "Works for anything: rooms, cars, venues, gear, jobs." : "Or paste the OLX or Vinted link")}</p>
              </div>
              <div>
                <label htmlFor="price" className="eyebrow">{hold ? "Deposit" : kind === "service" ? "Agreed price" : "Price"}</label>
                <div className={`mt-2 flex items-baseline ${sym.before ? "gap-2" : ""}`}>
                  {sym.before && <span className="amount text-[44px] text-ink-2 [text-shadow:none]">{sym.symbol}</span>}
                  <input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.slice(0, 32))}
                    readOnly={request && askedOk}
                    inputMode="decimal"
                    placeholder="0"
                    autoComplete="off"
                    className="amount max-w-full bg-transparent text-[88px] text-ink outline-none focus-visible:outline-none placeholder:text-white/20 [text-shadow:none]"
                    aria-describedby="price-hint"
                    aria-invalid={!!price && (!Number.isFinite(amount) || amount < 1 || amount > MAX)}
                    style={{ width: `${Math.max(1, price.length || 1) * 0.62 + 0.2}em` }}
                  />
                  {!sym.before && <span className="amount text-[44px] text-ink-2 [text-shadow:none]">{sym.symbol}</span>}
                </div>
                <p id="price-hint" className="mt-1 text-sm text-ink-2">{price && !Number.isFinite(amount) ? "Enter a valid amount with up to two decimal places." : `Test deals: ${money(1)} to ${money(MAX)}. Payment stays in ${currency}; no conversion.`}</p>
              </div>
              </Item>
              <Item className="relative flex flex-col gap-6 lg:gap-7">
              <div className="halo hidden lg:block" aria-hidden />
              <div className="flex flex-col gap-6 lg:glass lg:gap-7 lg:p-7">
              <div>
                <label htmlFor="seller" className="eyebrow">{asking ? "Your name or business" : `${k.payee[0].toUpperCase() + k.payee.slice(1)}${request ? "" : " (optional)"}`}</label>
                <input
                  id="seller"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value.slice(0, 32))}
                  readOnly={request}
                  placeholder={k.payeeHint}
                  autoComplete="off"
                  className="mt-2 w-full border-b border-line bg-transparent pb-2 text-lg text-ink outline-none focus-visible:outline-none placeholder:text-white/25 focus:border-safe"
                />
              </div>
              {hold && (
                <div>
                  <label htmlFor="ends" className="eyebrow">{kind === "deposit" ? "Move-out day" : "Ends on"}</label>
                  <input
                    id="ends"
                    type="date"
                    value={ends}
                    min={dayInput(1)}
                    onChange={(e) => setEnds(e.target.value)}
                    className="mt-2 w-full border-b border-line bg-transparent pb-2 text-lg text-ink outline-none [color-scheme:dark] focus-visible:outline-none focus:border-safe"
                  />
                </div>
              )}
              <div className="flex flex-col gap-3">
                <p className="text-center text-[15px] text-ink-2 lg:text-left">{k.blurb}</p>
                <SafetyPromise kind={kind} payer={!asking} expiry={hold ? endsAt : Math.floor(Date.now() / 1000) + k.days * DAY} locale={country.locale} className="justify-center lg:justify-start" />
                <Button type="submit" full disabled={!valid}>
                  {faceIdOk && !asking && <FaceIdIcon />}
                  {asking ? (valid ? `Share a ${money(amount)} payment link` : "Add the details and your name") : valid ? `${hold ? "Hold" : "Lock"} ${money(amount)}${faceIdOk ? " with Face ID" : ""}` : hold ? "Hold deposit" : "Lock"}
                </Button>
                {faceIdOk && valid && !asking && (
                  <a href="https://test.nido.fyi" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs text-mute lg:justify-start">
                    <NidoMark size={14} />Face ID wallet by Nido · a smart account on Stellar
                  </a>
                )}
                {linkState && <p className="break-all text-center text-sm text-safe lg:text-left" role="status">{linkState}</p>}
                {!request && (
                  <button type="button" onClick={() => { setAsking(!asking); setLinkState(""); }} className="text-sm text-mute underline-offset-4 hover:underline">
                    {asking ? "I'm the one paying" : "Getting paid? Send your customer a payment link"}
                  </button>
                )}
                {faceIdOk && valid && !asking && (
                  <button type="button" onClick={() => setPaying("key")} className="text-sm text-mute underline-offset-4 hover:underline">
                    Lock without Face ID
                  </button>
                )}
                <TestnetNote className="lg:text-left" />
              </div>
              </div>
              </Item>
            </Stagger>
          </motion.form>
        )}

        {phase !== "form" && (
          <LockMoment
            item={item}
            amount={amount}
            currency={currency}
            locale={country.locale}
            phase={phase}
            step={step}
            wallet={wallet}
            via={via}
            error={error}
            onRetry={() => lock()}
            onEdit={() => setPhase("form")}
          />
        )}
      </AnimatePresence>
      <PaySheet
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={`${hold ? "Hold" : "Lock"} ${money(amount)}`}
        money={money(amount)}
        currency={currency}
        country={country.code}
        onPay={(m) => {
          const using = paying ?? "key";
          setPaying(null);
          setVia(m);
          void lock(using);
        }}
      />
      <NidoSheet open={nidoOpen} onClose={() => setNidoOpen(false)} currency={currency} onReady={onNidoReady} />
    </Screen>
  );
}

function LockMoment({
  item, amount, currency, locale, phase, step, wallet, via, error, onRetry, onEdit,
}: {
  item: string;
  amount: number;
  currency: CurrencyCode;
  locale: string;
  phase: "locking" | "failed";
  step: string | null;
  wallet: Wallet;
  via: string;
  error: string;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const reduce = useReducedMotion();
  const sym = moneyParts(amount || 0, currency, locale);
  const failed = phase === "failed";
  const list = steps(wallet, via);
  const active = list.find((s) => s.key === step);

  return (
    <motion.div
      key="locking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex min-h-0 w-full max-w-[400px] flex-1 flex-col items-center justify-center gap-8 lg:max-w-[860px] lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-x-14"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative grid size-32 place-items-center lg:size-40">
          <div className="halo" aria-hidden />
          {!reduce && !failed &&
            [0, 0.75].map((delay) => (
              <motion.span
                key={delay}
                aria-hidden
                className="absolute inset-3 rounded-full border border-[rgba(143,211,255,0.5)]"
                animate={{ scale: [0.7, 1.5], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={springs.slam}>
            <Mark size={84} assemble={!failed} state={failed ? "open" : "rest"} />
          </motion.div>
        </div>
        <motion.div className="mt-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.1 }}>
          <div className="eyebrow">{item}</div>
          <div className={`amount mt-2 flex items-baseline justify-center text-[68px] leading-none lg:text-[92px] ${sym.before ? "gap-2" : ""}`}>
            {sym.before && <span className="text-[0.42em] text-ink-2 [text-shadow:none]">{sym.symbol}</span>}
            <NumberTicker value={amount} format={(n) => new Intl.NumberFormat(locale, { maximumFractionDigits: amount % 1 ? 2 : 0 }).format(n)} />
            {!sym.before && <span className="text-[0.42em] text-ink-2 [text-shadow:none]">{sym.symbol}</span>}
          </div>
          <p className="mt-3 text-sm text-mute">{failed ? "Nothing was locked" : active?.label ?? "Locking on Stellar"}</p>
        </motion.div>
      </div>

      <div className="relative w-full">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass w-full p-6">
          {failed ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-ink-2" role="alert">{error}</p>
              <Button full onClick={onRetry}>Try again</Button>
              <Button variant="ghost" onClick={onEdit}>Edit deal</Button>
            </div>
          ) : (
            <LockSteps list={list} current={step} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LockSteps({ list, current }: { list: { key: string; label: string }[]; current: string | null }) {
  const reduce = useReducedMotion();
  const found = list.findIndex((s) => s.key === current);
  const idx = found < 0 ? 0 : found;
  const prev = useRef(idx);
  useEffect(() => {
    if (idx > prev.current) {
      haptic.tap();
      sfx.tick();
    }
    prev.current = idx;
  }, [idx]);
  const fill = list.length < 2 ? 1 : idx / (list.length - 1);

  return (
    <ol className="relative flex flex-col gap-5" aria-live="polite">
      <span className="absolute top-2.5 bottom-2.5 left-[9px] w-px bg-white/10" aria-hidden />
      <motion.span
        className="absolute top-2.5 left-[9px] w-px origin-top bg-safe"
        style={{ height: "calc(100% - 20px)", boxShadow: "0 0 12px var(--safe)" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: fill }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
        aria-hidden
      />
      {list.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        return (
          <motion.li
            key={s.key}
            className="relative flex items-center gap-3"
            initial={reduce ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springs.snappy, delay: 0.07 * i }}
          >
            <span className="z-[1] grid size-5 place-items-center rounded-full bg-[#14171b]">
              {done ? (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.slam} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </motion.svg>
              ) : active ? (
                <span className="pulse-dot" />
              ) : (
                <span className="size-2 rounded-full bg-white/25" />
              )}
            </span>
            <span className={done ? "text-ink-2" : active ? "font-medium text-ink" : "text-mute"}>{s.label}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}

function FaceIdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a4 4 0 0 0 5 0" />
    </svg>
  );
}
