"use client";
import { motion } from "motion/react";
import { explorer } from "@/lib/config";
import { shortHash } from "./Ticker";

export type TimelineItem = { key: string; title: string; at?: string; hash?: string; pending?: boolean; tone?: "safe" | "mute" };

const time = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

/** A timeline that draws itself event by event; every event links to its proof on Stellar Expert. */
export function LiveReceipt({ items, delay = 0, stagger = 0.35 }: { items: TimelineItem[]; delay?: number; stagger?: number }) {
  return (
    <ol className="relative flex flex-col">
      {items.map((it, i) => (
        <motion.li
          key={it.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * stagger, type: "spring", stiffness: 300, damping: 30 }}
          className="relative grid grid-cols-[20px_1fr_auto] items-start gap-x-3 pb-5 last:pb-0"
        >
          {i < items.length - 1 && (
            <motion.span
              className="absolute left-[9px] top-5 w-px origin-top bg-line"
              style={{ height: "calc(100% - 12px)" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + i * stagger + 0.15, duration: 0.3 }}
            />
          )}
          <span className="mt-1 grid size-5 place-items-center">
            {it.pending ? (
              <span className="size-2.5 animate-pulse rounded-full border border-mute" />
            ) : (
              <span className="size-2.5 rounded-full" style={{ background: it.tone === "mute" ? "var(--ink-2)" : "var(--safe)", boxShadow: it.tone === "mute" ? "none" : "0 0 10px var(--safe)" }} />
            )}
          </span>
          <div className="min-w-0">
            <div className={`text-[15px] font-medium ${it.pending ? "text-mute" : "text-ink"}`}>{it.title}</div>
            {it.hash && (
              <a href={explorer.tx(it.hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-mute underline-offset-4 hover:text-safe hover:underline">
                proof {shortHash(it.hash)} ↗
              </a>
            )}
          </div>
          <span className="font-mono text-xs tabular-nums text-mute">{time(it.at)}</span>
        </motion.li>
      ))}
    </ol>
  );
}
