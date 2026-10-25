"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "./Mark";

type Beat =
  | { k: "you"; text: string }
  | { k: "tool"; name: string; refused?: boolean }
  | { k: "typing" }
  | { k: "shake"; text: string; link?: boolean; refused?: boolean };

// The same tools the real /api/mcp server exposes.
const BEATS: Beat[] = [
  { k: "you", text: "Vinted seller wants a €4 courier fee by link first. Safe?" },
  { k: "tool", name: "check_seller_message" },
  { k: "typing" },
  { k: "shake", text: "No. Fake courier fee is a known trick. Pay through this instead:", link: true },
  { k: "you", text: "Locked it. Now release the €60 to her." },
  { k: "tool", name: "release_payment", refused: true },
  { k: "typing" },
  { k: "shake", text: "I can’t. Nobody can. Only your phone, scanning her QR, when you meet.", refused: true },
];
const LOCKED_AT = 5; // the vault appears once the buyer says "Locked it"

/** The product in one chat: the assistant helps, then is refused the money. */
export function AiDemo() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? BEATS.length : 1);
  useEffect(() => {
    if (reduce) return;
    const done = n >= BEATS.length;
    const t = setTimeout(() => setN(done ? 1 : n + 1), done ? 3400 : BEATS[n - 1].k === "you" ? 650 : 900);
    return () => clearTimeout(t);
  }, [n, reduce]);
  const count = reduce ? BEATS.length : n;
  // a typing bubble only shows while it is the newest beat
  const shown = BEATS.map((b, i) => ({ b, i })).filter(({ b, i }) => i < count && (b.k !== "typing" || i === count - 1));
  const locked = count >= LOCKED_AT;
  const refused = count >= BEATS.length;

  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border border-line bg-white/[0.025] lg:mt-7 lg:max-w-[600px]" aria-hidden>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-white/15" /><i className="size-2.5 rounded-full bg-white/15" /><i className="size-2.5 rounded-full bg-white/15" /></span>
          <span className="ml-1.5">Your assistant</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-safe/30 bg-safe/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-safe uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-safe" />SHAKE connected
        </span>
      </div>

      <div className="flex min-h-[318px] flex-col justify-end gap-2 px-4 pt-4 pb-3 lg:min-h-[372px] lg:gap-2.5 lg:px-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map(({ b, i }) => (
            <motion.div
              key={`${i}-${b.k}`}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={springs.snappy}
              className={b.k === "you" ? "ml-auto max-w-[86%]" : "max-w-[92%]"}
            >
              {b.k === "you" && <div className="rounded-2xl rounded-br-md bg-white/12 px-3.5 py-2 text-[14px] leading-snug text-ink lg:text-[15px]">{b.text}</div>}
              {b.k === "tool" && (
                <div className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${b.refused ? "text-danger" : "text-mute"}`}>
                  <span>↳</span>{b.name}<span className={b.refused ? "" : "text-safe"}>{b.refused ? "· refused" : "· ok"}</span>
                </div>
              )}
              {b.k === "typing" && (
                <div className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-white/8 px-3.5 py-3">
                  {[0, 1, 2].map((d) => (
                    <motion.i key={d} className="size-1.5 rounded-full bg-ink-2" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
                  ))}
                </div>
              )}
              {b.k === "shake" && (
                <div className={`rounded-2xl rounded-bl-md bg-white/8 px-3.5 py-2 text-[14px] leading-snug text-ink-2 lg:text-[15px] ${b.refused ? "ring-1 ring-safe/50" : ""}`}>
                  <span className="text-safe">SHAKE · </span>{b.text}
                  {b.link && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-black/25 p-2.5">
                      <Mark size={28} state="open" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-ink">Denim jacket · €60</div>
                        <div className="truncate font-mono text-[11px] text-mute">shake · deal K3X9A2</div>
                      </div>
                      <span className="rounded-full bg-safe px-2.5 py-1 text-[11px] font-medium text-on-safe">Lock €60</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        animate={refused && !reduce ? { x: [0, -7, 6, -4, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className={`flex items-center gap-3 border-t px-4 py-3 transition-colors duration-500 ${locked ? "border-safe/25 bg-safe/[0.07]" : "border-line"}`}
      >
        <Mark size={22} state={locked ? "shut" : "open"} />
        <div className="min-w-0 flex-1 text-[13px] lg:text-[14px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={refused ? "r" : locked ? "l" : "w"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={springs.snappy} className={locked ? "text-safe" : "text-mute"}>
              {refused ? "Still locked. The AI never had the money." : locked ? "€60 locked on Stellar" : "Nothing locked yet"}
            </motion.div>
          </AnimatePresence>
        </div>
        <svg className={`size-4 shrink-0 ${locked ? "text-safe" : "text-mute"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2.5" />
          <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} />
        </svg>
      </motion.div>
    </div>
  );
}
