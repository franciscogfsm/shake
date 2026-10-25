"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { COUNTRIES, CURRENCIES, DEFAULT_COUNTRY, moneyParts, type Country, type CurrencyCode } from "@/lib/config";
import { GlassSheet } from "./GlassSheet";
import { NumberTicker } from "./Ticker";

const KEY = "shake.country";

function guess(): Country {
  const langs = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  for (const l of langs) {
    const exact = COUNTRIES.find((c) => c.locale.toLowerCase() === l.toLowerCase());
    if (exact) return exact;
    const region = l.split("-")[1]?.toUpperCase();
    const byRegion = COUNTRIES.find((c) => c.code === region);
    if (byRegion) return byRegion;
    const byLang = COUNTRIES.find((c) => c.locale.startsWith(l.split("-")[0] + "-"));
    if (byLang) return byLang;
  }
  return DEFAULT_COUNTRY;
}

/** The viewer's country: decides number format and default currency. Remembered on this phone. */
export function useCountry() {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    setCountry(COUNTRIES.find((c) => c.code === saved) ?? guess());
  }, []);
  const choose = (c: Country) => {
    setCountry(c);
    try {
      localStorage.setItem(KEY, c.code);
    } catch {}
  };
  return [country, choose] as const;
}

/** Big amount display: the symbol is quieter but stays where the locale puts it ("400 €", "£400", "R$ 400"). */
export function Money({ amount, currency, locale, className = "", tick }: { amount: number; currency: CurrencyCode; locale: string; className?: string; tick?: boolean }) {
  const p = moneyParts(amount, currency, locale);
  const symbol = <span className="text-[0.5em] tracking-[-0.02em] text-ink-2 [text-shadow:none]">{p.symbol}</span>;
  const number = tick ? (
    <NumberTicker
      value={amount}
      format={(n) => new Intl.NumberFormat(locale, { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount % 1 ? n : Math.round(n))}
    />
  ) : (
    p.number
  );
  return (
    <span className={`amount inline-flex items-baseline gap-[0.08em] ${className}`} aria-label={new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)}>
      {p.before && symbol}
      <span>{number}</span>
      {!p.before && symbol}
    </span>
  );
}

/** Flag + currency chip that opens the country sheet. */
export function CountryPicker({ country, onChange }: { country: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="glass inline-flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-[14px]"
        aria-label={`Country: ${country.name}, currency ${country.currency}. Change`}
      >
        <span className="text-lg leading-none">{country.flag}</span>
        <span className="font-medium">{country.currency}</span>
      </motion.button>
      <GlassSheet open={open} onClose={() => setOpen(false)} label="Choose your country">
        <div className="pb-3">
          <h2 className="display text-[26px]">Where are you?</h2>
          <p className="mt-1 text-sm text-ink-2">Sets your currency and how amounts look.</p>
          <ul className="mt-4 grid max-h-[55dvh] grid-cols-1 gap-1 overflow-y-auto">
            {COUNTRIES.map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-white/5 ${c.code === country.code ? "bg-white/8" : ""}`}
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="font-mono text-sm text-mute">{new Intl.NumberFormat(c.locale, { style: "currency", currency: c.currency, minimumFractionDigits: 0 }).format(400)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">Each currency is a test stablecoin on Stellar ({Object.values(CURRENCIES).map((c) => c.asset).join(", ")}).</p>
        </div>
      </GlassSheet>
    </>
  );
}
