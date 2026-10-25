"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "./Mark";

const LISTINGS = [
  { market: "Vinted", item: "Wool jacket", price: "60€" },
  { market: "OLX", item: "City bike", price: "180€" },
  { market: "eBay", item: "Camera", price: "240€" },
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
    <div className="mt-3 max-w-[420px] lg:mt-5">
      <div className="relative flex h-[132px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] px-3.5 py-3 sm:h-[164px] sm:rounded-[24px] sm:px-4 sm:py-3.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {LISTINGS.map((l, n) => (
            <span key={l.market} className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors sm:px-3 sm:text-[12px] ${n === i ? "border-safe/40 bg-safe/10 text-ink" : "border-white/10 text-mute"}`}>{l.market}</span>
          ))}
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-mute sm:px-3 sm:text-[12px]">+ more</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={listing.market} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springs.snappy} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-display text-[18px] sm:text-[20px]">{listing.item}</span>
              <span className="amount shrink-0 text-[20px] sm:text-[22px]">{listing.price}</span>
            </div>
            <div className="mt-auto">
              <AnimatePresence mode="wait">
                {!pressed ? (
                  <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative flex h-11 items-center justify-center rounded-full bg-safe font-display text-[15px] text-on-safe">
                    <span className="pr-7">Pay safely with SHAKE</span>
                    {!reduce && (
                      <motion.span
                        aria-hidden
                        className="absolute top-2 right-3.5 size-7 rounded-full border-2 border-white/90 bg-white/30"
                        animate={{ scale: [1, 0.82, 1], opacity: [0.9, 1, 0.9] }}
                        transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="locked" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.smooth} className="flex h-11 items-center gap-2 text-[14px] text-safe">
                    <Mark size={22} state="rest" />
                    <span className="min-w-0">Locked. Pays when you meet.</span>
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
