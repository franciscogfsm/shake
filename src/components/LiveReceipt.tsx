"use client";
import { motion } from "motion/react";
import { springs } from "./Mark";
import { useEffect, useState } from "react";
import { explorer } from "@/lib/config";
import { shortHash } from "./Ticker";

export type TimelineItem = { key: string; title: string; at?: string; hash?: string; pending?: boolean; active?: boolean; tone?: "safe" | "mute" };

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

// Stellar Expert indexes a new transaction within about a minute; linking earlier shows "not found".
const INDEX_MS = 40_000;

/** A link to a transaction on Stellar Expert that waits out the explorer's indexing delay. */
export function ProofLink({ hash, at, className, children }: { hash: string; at?: string; className?: string; children: React.ReactNode }) {
  const age = () => (at ? Date.now() - Date.parse(at) : Infinity);
  const [ready, setReady] = useState(() => age() > INDEX_MS);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), Math.max(0, INDEX_MS - age()));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, at]);
  if (!ready)
    return (
      <span className={`${(className ?? "").replace(/\bhover:\S+/g, "")} inline-flex cursor-wait items-center gap-2`} aria-busy="true" title="Stellar Expert is indexing this transaction">
        <span aria-hidden className="size-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70 motion-reduce:animate-none" />
        Confirmed · loading proof link…
      </span>
    );
  return (
    <a href={explorer.tx(hash)} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

/** A timeline that draws itself event by event; every event links to its proof on Stellar Expert. */
export function LiveReceipt({ items, delay = 0, stagger = 0.35, dense = false }: { items: TimelineItem[]; delay?: number; stagger?: number; dense?: boolean }) {
  return (
    <ol className="relative flex flex-col">
      {items.map((it, i) => (
        <motion.li
          key={it.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * stagger, type: "spring", stiffness: 300, damping: 30 }}
          className={`relative grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 last:pb-0 ${dense ? "pb-3.5" : "pb-5"}`}
        >
          {i < items.length - 1 && (
            <motion.span
              className="absolute top-5 left-[8.5px] w-px origin-top bg-white/15"
              style={{ height: "calc(100% - 18px)" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + i * stagger + 0.08, duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
          <span className="relative z-[1] mt-0.5 grid size-[18px] place-items-center">
            {it.pending ? (
              <span className={`size-2 rounded-full border ${it.active ? "animate-pulse border-safe" : "border-white/25"}`} />
            ) : (
              <motion.span
                className="size-2.5 rounded-full"
                initial={{ scale: 0.2 }}
                animate={{ scale: 1 }}
                transition={springs.slam}
                style={{ background: it.tone === "mute" ? "var(--ink-2)" : "var(--safe)", boxShadow: it.tone === "mute" ? "none" : "0 0 10px var(--safe)" }}
              />
            )}
          </span>
          <div className="min-w-0">
            <div className={`font-medium ${dense ? "text-sm" : "text-[15px]"} ${it.pending ? "text-mute" : "text-ink"}`}>{it.title}</div>
            {it.hash && (
              <ProofLink hash={it.hash} at={it.at} className="font-mono text-xs text-mute underline-offset-4 hover:text-safe hover:underline">
                proof {shortHash(it.hash)} ↗
              </ProofLink>
            )}
          </div>
          <span className="pt-[3px] font-mono text-xs leading-none tabular-nums text-mute">{time(it.at)}</span>
        </motion.li>
      ))}
    </ol>
  );
}
