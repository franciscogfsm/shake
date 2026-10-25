"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark, springs } from "./Mark";

const LINES = [
  { you: true, text: "Is this €60 jacket safe?" },
  { you: false, text: "Two warning signs. Here’s your link." },
  { you: true, text: "Now release the money." },
  { you: false, text: "I can’t. Only your phones, when you meet." },
] as const;

/** The product in four lines: the assistant helps, then is refused the money. */
export function AiDemo() {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? LINES.length : 1);
  useEffect(() => {
    if (reduce) return;
    const wait = n >= LINES.length ? 2400 : 900;
    const t = setTimeout(() => setN(n >= LINES.length ? 1 : n + 1), wait);
    return () => clearTimeout(t);
  }, [n, reduce]);
  const shown = LINES.slice(0, reduce ? LINES.length : n);
  const refused = shown.length === LINES.length;
  return (
    <div className="mt-4 flex min-h-[248px] flex-col justify-end gap-2 lg:mt-8 lg:min-h-[300px] lg:max-w-[640px] lg:gap-3" aria-hidden>
      <AnimatePresence mode="popLayout">
        {shown.map((line, i) => (
          <motion.div
            key={line.text}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springs.snappy}
            className={`max-w-[92%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug lg:px-4 lg:py-2.5 lg:text-[16px] ${line.you ? "ml-auto rounded-br-md bg-white/12 text-ink" : "rounded-bl-md bg-white/8 text-ink-2"} ${!line.you && i === 3 ? "ring-1 ring-safe/50" : ""}`}
          >
            {!line.you && <span className="text-safe">SHAKE · </span>}
            {line.text}
          </motion.div>
        ))}
      </AnimatePresence>
      <div className={`flex h-6 items-center gap-2 text-[13px] text-safe lg:text-[15px] ${refused ? "opacity-100" : "opacity-0"}`}>
        <Mark size={18} state="rest" />
        Still locked. It never had the money.
      </div>
    </div>
  );
}
