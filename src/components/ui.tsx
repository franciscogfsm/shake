"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Mark";
import { NumberTicker } from "./Ticker";
import { useCountry } from "./Money";
import { availableCurrencies, explorer, formatMoney, fromUnits } from "@/lib/config";

const PAGES = [
  ["/use-cases", "Use cases"],
  ["/extension", "Extension"],
  ["/ai", "For AI"],
] as const;

/** Phone-first page shell: safe areas, centred column, top bar with the wordmark. `fit` locks the desktop page to one screen. */
export function Screen({ children, back, right, wide, fit }: { children: React.ReactNode; back?: string; right?: React.ReactNode; wide?: boolean; fit?: boolean }) {
  const path = usePathname();
  const showNav = path === "/" || path === "/try" || path === "/use-cases" || path === "/extension" || path === "/ai";
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <main className={`pb-safe mx-auto flex w-full max-w-[480px] min-w-0 flex-col px-4 sm:px-5 ${fit ? "min-h-dvh lg:h-dvh lg:overflow-hidden" : "min-h-dvh"} ${wide ? "lg:max-w-[1240px] lg:px-10" : ""}`}>
      <header className="sticky top-0 z-30 -mx-4 pt-safe sm:-mx-5 lg:-mx-10">
        <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 border-b border-white/[0.06] bg-[#0d0f12]/70 backdrop-blur-xl transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`} />
        <div className="flex h-12 items-center justify-between gap-2 px-4 sm:px-5 lg:px-10">
          {back ? (
            <Link href={back} className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:text-ink" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <Link href="/" aria-label="SHAKE home" className="shrink-0">
              <Wordmark />
            </Link>
          )}
          <div className="flex min-w-0 items-center justify-end">{right}</div>
        </div>
        {showNav && (
          <nav aria-label="Pages" className="flex gap-1 overflow-x-auto px-2 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PAGES.map(([href, label]) => (
              <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`eyebrow shrink-0 rounded-full px-3 py-1.5 ${path === href ? "text-ink" : ""}`}>{label}</Link>
            ))}
          </nav>
        )}
      </header>
      {children}
    </main>
  );
}

export const TestnetNote = ({ className = "", compact = false }: { className?: string; compact?: boolean }) => (
  <p className={`text-center font-mono text-[11px] tracking-[0.04em] text-mute ${className}`}>{compact ? "Test mode · no cash value" : "Test mode · Stellar Testnet · assets have no cash value"}</p>
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
  if (left >= 2 * 86400) return <span className="tabular-nums">{Math.floor(left / 86400)} days</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return <span className="font-mono tabular-nums">{`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`}</span>;
}

/** The live counter: money held safe by SHAKE right now, read from the contract's events. */
export function Protected({ className = "justify-center", live }: { className?: string; live?: boolean }) {
  const [country] = useCountry();
  const [s, setS] = useState<{ openDeals: number; deals: number; totals: { token: string; protectedNow: string }[]; shakes?: Shake[] } | null>(null);
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
  const line = (
    <div className={`flex min-w-0 max-w-full items-center gap-2 text-sm text-ink-2 ${className}`}>
      <span className="pulse-dot" />
      <span className="min-w-0 truncate">
        {totals.length ? <><span className="font-medium text-ink">{totals.join(" · ")}</span> protected right now</> : <><NumberTicker value={s.openDeals ?? 0} format={(n) => new Intl.NumberFormat(country.locale, { maximumFractionDigits: 0 }).format(n)} className="font-medium text-ink" /> open deals</>} · {new Intl.NumberFormat(country.locale).format(s.deals)} deals on Stellar
      </span>
    </div>
  );
  if (!live) return line;
  return <LiveLine line={line} shakes={s.shakes ?? []} locale={country.locale} />;
}

type Shake = { type: "released" | "refunded"; amount: string; token: string; at: string; txHash: string };

/** The live counter, taking turns with real deals that just ended on Stellar (each opens its transaction): "is this real?" answered in one line. */
function LiveLine({ line, shakes, locale }: { line: React.ReactNode; shakes: Shake[]; locale: string }) {
  const reduce = useReducedMotion();
  const now = useNow(30_000);
  const [i, setI] = useState(0);
  const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  const ago = (at: string) => {
    const s = Math.max(0, now - Date.parse(at) / 1000);
    return s < 60 ? rel.format(0, "second") : s < 3600 ? rel.format(-Math.floor(s / 60), "minute") : s < 86400 ? rel.format(-Math.floor(s / 3600), "hour") : rel.format(-Math.floor(s / 86400), "day");
  };
  const deals = shakes.slice(0, 5).flatMap((x) => {
    const c = availableCurrencies().find((c) => c.token === x.token);
    return c ? [{ ...x, money: formatMoney(fromUnits(x.amount), c.code, locale) }] : [];
  });
  const slots = deals.length + 1;
  useEffect(() => {
    if (slots < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % slots), 3600);
    return () => clearInterval(t);
  }, [slots]);
  const x = i > 0 ? deals[i - 1] : undefined;
  return (
    <div className="relative h-[22px] overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={x ? x.txHash : "count"} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -12 }} transition={{ type: "spring", stiffness: 500, damping: 32 }}>
          {x ? (
            <a href={explorer.tx(x.txHash)} target="_blank" rel="noreferrer" className="flex min-w-0 max-w-full items-center justify-center gap-2 text-sm text-ink-2 hover:text-ink lg:justify-start">
              <span className={x.type === "released" ? "text-safe" : "text-mute"} aria-hidden>{x.type === "released" ? "✓" : "↩"}</span>
              <span className="min-w-0 truncate"><span className="font-medium text-ink">{x.money}</span> {x.type === "released" ? "paid on the shake" : "back to the buyer"} · {ago(x.at)}</span>
              <span className="text-mute" aria-hidden>↗</span>
            </a>
          ) : line}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

