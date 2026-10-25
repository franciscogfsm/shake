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
    <div className="relative mt-3 h-[116px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%)] sm:mt-4 sm:h-[148px]" aria-hidden>
      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-1.5">
        <AnimatePresence mode="popLayout">
          {shown.map((line, i) => (
            <motion.div
              key={line.text}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springs.snappy}
              className={`max-w-[92%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug sm:text-[14px] ${line.you ? "ml-auto rounded-br-md bg-white/8 text-ink" : "rounded-bl-md bg-white/5 text-ink-2"} ${!line.you && i === 3 ? "ring-1 ring-safe/40" : ""}`}
            >
              {!line.you && <span className="text-safe">SHAKE · </span>}
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {refused && (
            <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-0.5 text-[12px] text-safe">
              <Mark size={18} state="rest" />
              Still locked. It never had the money.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
