"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, availableCurrencies, moneyParts, type Country, type CurrencyCode } from "@/lib/config";
import { detectCountry } from "@/lib/regions";
import { GlassSheet } from "./GlassSheet";
import { NumberTicker } from "./Ticker";

const KEY = "shake.country";

const PREFERENCES = "shake.region.v2";
const CHANGE = "shake:region";
let memoryPreference: Country | null = null;

function preference(): Country {
  if (memoryPreference) return memoryPreference;
  const detected = detectCountry(navigator.languages?.length ? navigator.languages : [navigator.language]);
  let chosen = detected;
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES) ?? "null");
    const legacy = localStorage.getItem(KEY);
    const country = COUNTRIES.find((c) => c.code === (saved?.code ?? legacy));
    if (country) {
      const locale = saved?.locale ?? (country.code === detected.code ? detected.locale : country.locale);
      new Intl.NumberFormat(locale); // Validate persisted locale data.
      chosen = { ...country, locale, currency: saved?.currency ?? country.currency };
    }
  } catch {}
  const currencies = availableCurrencies();
  return { ...chosen, currency: currencies.find((c) => c.code === chosen.currency)?.code ?? currencies[0]?.code ?? "EUR" };
}

/** The viewer's country: decides number format and default currency. Remembered on this phone. */
export function useCountry() {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  useEffect(() => {
    const sync = (event?: Event) => {
      if (event?.type === "storage") memoryPreference = null;
      setCountry(preference());
    };
    sync();
    addEventListener("storage", sync);
    addEventListener(CHANGE, sync);
    return () => { removeEventListener("storage", sync); removeEventListener(CHANGE, sync); };
  }, []);
  const choose = (c: Country) => {
    memoryPreference = c;
    setCountry(c);
    try {
      localStorage.setItem(KEY, c.code);
      localStorage.setItem(PREFERENCES, JSON.stringify(c));
    } catch {}
    dispatchEvent(new Event(CHANGE));
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

/** Region, number format and supported settlement currency are separate choices. */
export function CountryPicker({ country, onChange }: { country: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        className="glass inline-flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-[14px]"
        aria-label={`Country: ${country.name}, currency ${country.currency}. Change`}
      >
        <span className="font-mono text-xs text-mute">{country.code}</span>
        <span className="font-medium">{country.currency}</span>
      </motion.button>
      <GlassSheet open={open} onClose={() => setOpen(false)} label="Choose your country">
        <div className="pb-3">
          <h2 className="display text-[26px]">Your region and currency</h2>
          <p className="mt-1 text-sm text-ink-2">Amounts follow your number format. Everyone in a deal pays and receives the same currency.</p>
          <label className="mt-4 flex flex-col gap-2 text-sm">
            Payment currency
            <select value={country.currency} onChange={(e) => onChange({ ...country, currency: e.target.value as CurrencyCode })} className="h-11 rounded-xl bg-bg px-3 text-ink border border-line">
              {availableCurrencies().map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name} · test money</option>)}
            </select>
          </label>
          <label className="mt-3 flex flex-col gap-2 text-sm">
            Number format
            <select value={country.locale} onChange={(e) => onChange({ ...country, locale: e.target.value })} className="h-11 rounded-xl border border-line bg-bg px-3">
              {[...new Set([country.locale, "en-US", "en-GB", "pt-PT", "pt-BR", "es-ES", "es-MX", "fr-FR", "de-DE", "it-IT", "nl-NL", "pl-PL", "tr-TR", "en-IN", "hi-IN", "bn-BD", "ar-EG", "ar-SA", "fa-IR", "he-IL", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "id-ID", "th-TH", "vi-VN", "en-ZA"])].map((locale) => <option key={locale} value={locale}>{locale} · {new Intl.NumberFormat(locale).format(1234.56)}</option>)}
            </select>
          </label>
          <input aria-label="Find country or region" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find your country or region" className="mt-4 h-11 w-full rounded-xl border border-line bg-transparent px-3" />
          <ul className="mt-3 grid max-h-[32dvh] grid-cols-1 gap-1 overflow-y-auto">
            {COUNTRIES.filter((c) => `${c.name} ${c.code}`.toLowerCase().includes(search.trim().toLowerCase())).map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => {
                    onChange({ ...c, locale: country.locale, currency: country.currency });
                    setOpen(false);
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-white/5 ${c.code === country.code ? "bg-white/8" : ""}`}
                >
                  <span className="font-mono text-xs text-mute">{c.code}</span>
                  <span className="flex-1">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-mute">Available test currencies: {availableCurrencies().map((c) => c.code).join(", ")}. Choose one even if your local currency is different. No currency conversion is applied.</p>
        </div>
      </GlassSheet>
    </>
  );
}
