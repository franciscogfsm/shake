"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "./Mark";

const LISTINGS = [
  { market: "Vinted", item: "Wool jacket", price: "€60" },
  { market: "OLX", item: "City bike", price: "€180" },
  { market: "eBay", item: "Camera", price: "€240" },
] as const;

/** A listing, the SHAKE button, then the money locked. The chips follow the same item. */
export function ExtensionDemo() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [pressed, setPressed] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      if (!pressed) setPressed(true);
      else {
        setPressed(false);
        setI((n) => (n + 1) % LISTINGS.length);
      }
    }, pressed ? 2200 : 1400);
    return () => clearTimeout(t);
  }, [pressed, i, reduce]);
  const listing = LISTINGS[i];
  return (
    <div className="mt-5 max-w-[420px]">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LISTINGS.map((l, n) => (
          <span key={l.market} className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${n === i ? "border-safe/40 bg-safe/10 text-ink" : "border-white/10 text-mute"}`}>{l.market}</span>
        ))}
        <span className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-mute">+ more</span>
      </div>
      <div className="relative h-[148px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <AnimatePresence mode="wait">
          <motion.div key={listing.market} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springs.snappy} className="flex h-full flex-col">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[20px]">{listing.item}</span>
              <span className="amount text-[22px]">{listing.price}</span>
            </div>
            <div className="mt-auto">
              <AnimatePresence mode="wait">
                {!pressed ? (
                  <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex h-11 items-center justify-center rounded-full bg-safe font-display text-[15px] text-on-safe">
                    Pay safely with SHAKE
                  </motion.div>
                ) : (
                  <motion.div key="locked" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.smooth} className="flex h-11 items-center gap-2 text-[14px] text-safe">
                    <Mark size={22} state="rest" />
                    Locked on {listing.market}. Pays when you meet.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
