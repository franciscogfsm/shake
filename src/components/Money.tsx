"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, availableCurrencies, formatMoney, moneyParts, type Country, type CurrencyCode } from "@/lib/config";
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

/** Big amount display: the symbol is quieter but stays where the locale puts it ("400€", "£400", "R$ 400"). */
export function Money({ amount, currency, locale, className = "", tick }: { amount: number; currency: CurrencyCode; locale: string; className?: string; tick?: boolean }) {
  const p = moneyParts(amount, currency, locale);
  const symbol = <span className="relative top-[-0.06em] text-[0.46em] leading-none tracking-[-0.02em] text-ink-2 [text-shadow:none]">{p.symbol}</span>;
  const number = tick ? (
    <NumberTicker
      value={amount}
      format={(n) => new Intl.NumberFormat(locale, { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount % 1 ? n : Math.round(n))}
    />
  ) : (
    p.number
  );
  return (
    <span className={`amount inline-flex items-baseline ${p.before ? "gap-[0.08em]" : ""} ${className}`} aria-label={formatMoney(amount, currency, locale)}>
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
      <GlassSheet open={open} onClose={() => setOpen(false)} label="Choose your country" fill>
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="display shrink-0 text-[26px] lg:text-[32px]">Your region and currency</h2>
          <p className="mt-1 shrink-0 text-sm text-ink-2">Amounts follow your number format. Everyone in a deal pays and receives the same currency.</p>
          <div className="mt-4 grid shrink-0 gap-3 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Payment currency
              <select value={country.currency} onChange={(e) => onChange({ ...country, currency: e.target.value as CurrencyCode })} className="scheme-dark h-11 rounded-xl border border-line bg-bg px-3 text-ink">
                {availableCurrencies().map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name} · test money</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-2 text-sm">
              How {country.name} writes numbers
              <div className="flex h-11 items-center justify-between rounded-xl border border-line bg-bg px-3 text-ink">
                <span className="truncate">{country.name}</span>
                <span className="ml-3 shrink-0 font-mono text-[13px] text-safe">{new Intl.NumberFormat(country.locale).format(1234.56)}</span>
              </div>
            </div>
          </div>
          <input aria-label="Find country or region" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find your country or region" className="mt-4 h-11 w-full shrink-0 rounded-xl border border-line bg-transparent px-3" />
          <ul className="mt-3 grid min-h-0 flex-1 content-start grid-cols-1 gap-1 overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin] lg:grid-cols-2">
            {COUNTRIES.filter((c) => `${c.name} ${c.code}`.toLowerCase().includes(search.trim().toLowerCase())).map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => {
                    onChange({ ...c, currency: country.currency });
                    setOpen(false);
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-white/5 ${c.code === country.code ? "bg-white/8" : ""}`}
                >
                  <span className="w-6 shrink-0 font-mono text-xs text-mute">{c.code}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className={`shrink-0 font-mono text-[12px] ${c.code === country.code ? "text-safe" : "text-mute"}`}>{new Intl.NumberFormat(c.code === country.code ? country.locale : c.locale).format(1234.56)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 shrink-0 text-xs text-mute">Test currencies: {availableCurrencies().map((c) => c.code).join(", ")}. No conversion. Pick one even if it isn&apos;t your local currency.</p>
        </div>
      </GlassSheet>
    </>
  );
}
