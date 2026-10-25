"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "./Mark";
import { NumberTicker } from "./Ticker";
import { useCountry } from "./Money";
import { availableCurrencies, formatMoney, fromUnits } from "@/lib/config";

/** Phone-first page shell: safe areas, centred column, top bar with the wordmark. `fit` locks the desktop page to one screen. */
export function Screen({ children, back, right, wide, fit }: { children: React.ReactNode; back?: string; right?: React.ReactNode; wide?: boolean; fit?: boolean }) {
  return (
    <main className={`pt-safe pb-safe mx-auto flex w-full max-w-[480px] flex-col px-5 ${fit ? "min-h-dvh lg:h-dvh lg:overflow-hidden" : "min-h-dvh"} ${wide ? "lg:max-w-[1240px] lg:px-10" : ""}`}>
      <header className="flex h-12 items-center justify-between">
        {back ? (
          <Link href={back} className="-ml-2 grid size-11 place-items-center rounded-full text-ink-2 hover:text-ink" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        ) : (
          <Link href="/" aria-label="SHAKE home">
            <Wordmark />
          </Link>
        )}
        {right}
      </header>
      {children}
    </main>
  );
}

export const TestnetNote = ({ className = "" }: { className?: string }) => (
  <p className={`text-center font-mono text-[11px] tracking-[0.04em] text-mute ${className}`}>test network · no real money</p>
);

/** Staggered entrance for a screen's blocks. */
export const Stagger = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="show"
    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
  >
    {children}
  </motion.div>
);
export const Item = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    className={className}
    variants={{ hidden: { opacity: 0, y: 14, filter: "blur(0px)" }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 30 } } }}
  >
    {children}
  </motion.div>
);

export function Steps({ steps, current }: { steps: { key: string; label: string }[]; current: string | null }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {steps.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        return (
          <li key={s.key} className="flex items-center gap-3">
            <span className="grid size-5 place-items-center">
              {done ? (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--safe)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </motion.svg>
              ) : active ? (
                <span className="pulse-dot" />
              ) : (
                <span className="size-2 rounded-full bg-white/20" />
              )}
            </span>
            <span className={done ? "text-ink-2" : active ? "text-ink" : "text-mute"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Countdown({ to }: { to: number }) {
  const left = Math.max(0, to - useNow());
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return <span className="font-mono tabular-nums">{`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`}</span>;
}

/** The live counter: money held safe by SHAKE right now, read from the contract's events. */
export function Protected({ className = "justify-center" }: { className?: string }) {
  const [country] = useCountry();
  const [s, setS] = useState<{ openDeals: number; deals: number; totals: { token: string; protectedNow: string }[] } | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((j) => j && setS(j)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <div className="h-[22px]" />;
  const totals = (s.totals ?? []).flatMap((t) => {
    const currency = availableCurrencies().find((c) => c.token === t.token);
    return currency && BigInt(t.protectedNow) > 0n ? [formatMoney(fromUnits(t.protectedNow), currency.code, country.locale)] : [];
  });
  return (
    <div className={`flex items-center gap-2 text-sm text-ink-2 ${className}`}>
      <span className="pulse-dot" />
      <span>
        {totals.length ? <><span className="font-medium text-ink">{totals.join(" · ")}</span> protected right now</> : <><NumberTicker value={s.openDeals ?? 0} format={(n) => new Intl.NumberFormat(country.locale, { maximumFractionDigits: 0 }).format(n)} className="font-medium text-ink" /> open deals</>} · {new Intl.NumberFormat(country.locale).format(s.deals)} deals on Stellar
      </span>
    </div>
  );
}

