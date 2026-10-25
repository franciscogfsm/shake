"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark } from "@/components/Mark";
import { Item, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { CURRENCIES, formatMoney, moneyParts, newDealId, toUnits } from "@/lib/config";
import { parseAmount } from "@/lib/amount";
import { CountryPicker, useCountry } from "@/components/Money";
import { ApiError, callDeal, ensureAccount, getKeypair } from "@/lib/client/wallet";
import { dealMeta } from "@/lib/client/handshake";
import { ensurePasskeyWallet, fundPasskeyWallet, passkeySupported } from "@/lib/client/passkey";

const MAX = 2000;
const DAY = 24 * 60 * 60;
type Phase = "form" | "locking" | "failed";
const steps = (faceId: boolean) => [
  { key: "account", label: faceId ? "Creating your Face ID wallet" : "Setting up your money" },
  { key: "preparing", label: "Preparing the lock" },
  { key: "signing", label: "Signing on this phone" },
  { key: "confirming", label: "Confirming on the network" },
];

export default function NewDeal() {
  const router = useRouter();
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [seller, setSeller] = useState("");
  const [ship, setShip] = useState(false);
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
  const [faceId, setFaceId] = useState(false);
  useEffect(() => setFaceIdOk(passkeySupported()), []);
  const [country, setCountry] = useCountry();
  const currency = country.currency;
  const sym = moneyParts(1, currency, country.locale);

  const amount = parseAmount(price, country.locale);
  const valid = item.trim().length > 1 && amount >= 1 && amount <= MAX;
  const money = (n: number) => formatMoney(n, currency, country.locale);

  const lock = async (withFaceId = faceId) => {
    if (!valid || busy.current) return;
    setFaceId(withFaceId);
    busy.current = true;
    setPhase("locking");
    setError("");
    try {
      const kp = getKeypair();
      setStep("account");
      // Face ID: an OpenZeppelin smart account (C… address) is the buyer; otherwise the invisible key
      let buyer = kp.publicKey();
      if (withFaceId) {
        buyer = await ensurePasskeyWallet();
        await fundPasskeyWallet(buyer, amount, currency);
      } else await ensureAccount(kp, amount, currency);
      const dealId = newDealId();
      // shipping needs time to post the box; refund stays possible until the seller marks it shipped
      const expiry = String(Math.floor(Date.now() / 1000) + (ship ? 14 : 1) * DAY);
      // the memo is public on-chain: it is what the link preview and receipt show
      const memo = (seller.trim() ? `${item.trim()} · for ${seller.trim()}` : item.trim()).slice(0, 60);
      await callDeal(kp, ship ? "lock_ship" : "lock", { buyer, token: CURRENCIES[currency].token, amount: toUnits(amount).toString(), dealId, expiry, memo }, setStep);
      dealMeta.set(dealId, { item: item.trim(), seller: seller.trim() });
      const q = new URLSearchParams({ i: item.trim(), ...(seller.trim() ? { s: seller.trim() } : {}) });
      router.replace(`/deal/${dealId}?${q}&new=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The network didn't answer in time. Your money is safe; nothing was locked.");
      setPhase("failed");
    } finally {
      busy.current = false;
    }
  };

  return (
    <Screen wide fit back="/try" right={phase === "form" ? <CountryPicker country={country} onChange={(next) => {
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
              lock(faceIdOk);
            }}
            className="flex flex-1 flex-col"
          >
            <Stagger className="flex min-h-0 flex-1 flex-col gap-8 pt-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,440px)] lg:items-center lg:gap-16 lg:pt-0">
              <Item className="flex flex-col gap-8">
              <div>
                <div className="eyebrow">New safe payment</div>
                <h1 className="display mt-3 text-[40px] lg:text-[64px] lg:leading-[0.96]">What are you<br className="hidden lg:block" /> buying?</h1>
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
                  placeholder="iPhone 13, 128GB"
                  autoComplete="off"
                  aria-describedby="item-hint"
                  className="w-full border-b border-line bg-transparent pb-3 font-display text-2xl tracking-[-0.02em] text-ink outline-none focus-visible:outline-none placeholder:text-white/25 focus:border-safe"
                />
                <p id="item-hint" className="mt-2 text-[13px] text-mute" aria-live="polite">{from || "Or paste the OLX or Vinted link"}</p>
              </div>
              <div>
                <label htmlFor="price" className="eyebrow">Price</label>
                <div className="mt-2 flex items-baseline gap-2">
                  {sym.before && <span className="amount text-[44px] text-ink-2 [text-shadow:none]">{sym.symbol}</span>}
                  <input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.slice(0, 32))}
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
                <label htmlFor="seller" className="eyebrow">Seller (optional)</label>
                <input
                  id="seller"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value.slice(0, 32))}
                  placeholder="@rita on OLX"
                  autoComplete="off"
                  className="mt-2 w-full border-b border-line bg-transparent pb-2 text-lg text-ink outline-none focus-visible:outline-none placeholder:text-white/25 focus:border-safe"
                />
              </div>
              <div>
                <div className="eyebrow">How does it reach you?</div>
                <div role="radiogroup" aria-label="How does it reach you?" className="glass mt-3 grid grid-cols-2 gap-1 rounded-full p-1">
                  {([[false, "We’ll meet"], [true, "It’s shipped"]] as const).map(([v, label]) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={ship === v}
                      onClick={() => setShip(v)}
                      className={`rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${ship === v ? "bg-safe text-on-safe" : "text-ink-2 hover:text-ink"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-center text-[15px] text-ink-2">
                  {ship
                    ? "The shake travels in the box: scan the QR inside when you open it. Released 3 days after delivery unless you open a problem."
                    : "Held safely until you shake. Refunded if you don’t."}
                </p>
                <Button type="submit" full disabled={!valid}>
                  {faceIdOk && <FaceIdIcon />}
                  {valid ? `Lock ${money(amount)}${faceIdOk ? " with Face ID" : ""}` : "Lock"}
                </Button>
                {faceIdOk && valid && (
                  <button type="button" onClick={() => lock(false)} className="text-sm text-mute underline-offset-4 hover:underline">
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
          <motion.div key="locking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 lg:grid lg:grid-cols-2 lg:gap-20">
            <div className="flex flex-col items-center gap-10 lg:items-start">
            <Mark size={96} state={phase === "failed" ? "open" : "rest"} />
            <div className="text-center lg:text-left">
              <div className="eyebrow">{item}</div>
              <div className="amount mt-3 text-[64px] lg:text-[96px]">{money(amount)}</div>
            </div>
            </div>
            {phase === "locking" ? (
              <div className="relative w-full">
              <div className="halo hidden lg:block" aria-hidden />
              <div className="glass p-6">
                <Steps steps={steps(faceId)} current={step} />
              </div>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-4 text-center">
                <p className="max-w-[30ch] text-ink-2" role="alert">{error}</p>
                <Button full onClick={() => lock()}>Try again</Button>
                <Button variant="ghost" onClick={() => setPhase("form")}>Edit deal</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

function FaceIdIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a4 4 0 0 0 5 0" />
    </svg>
  );
}
