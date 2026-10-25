"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark, springs, type MarkState } from "@/components/Mark";
import { Item, Protected, Screen, Stagger, TestnetNote } from "@/components/ui";
import { parseDealCode } from "@/lib/config";
import { sfx } from "@/lib/client/sfx";

const STEPS: { state: MarkState; title: string; sub: string }[] = [
  { state: "rest", title: "Lock", sub: "Buyer locks the money" },
  { state: "open", title: "Meet", sub: "Seller sees it's real" },
  { state: "shut", title: "Shake", sub: "Scan, and it's paid" },
];

/** "Try it with a friend": a real two-phone deal, guided. */
export default function Try() {
  const router = useRouter();
  const [selling, setSelling] = useState(false);
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <Screen>
      <Stagger className="flex flex-1 flex-col gap-8 pt-6">
        <Item>
          <div className="eyebrow">Two phones · two minutes</div>
          <h1 className="display mt-3 text-[42px] leading-[1.02]">Try it with a friend.</h1>
          <p className="mt-3 text-ink-2">One of you buys, one of you sells. Real money moves on the test network.</p>
        </Item>

        <Item className="glass overflow-hidden p-1.5">
          <Link href="/deal/new" onPointerDown={() => sfx.tap()} className="row group">
            <Mark size={34} state="rest" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-medium">I&apos;m buying</span>
              <span className="block text-[13px] text-ink-2">Lock the money, send the link</span>
            </span>
            <span className="chev chev-solid" aria-hidden>
              <Arrow />
            </span>
          </Link>

          <div className="mx-4 h-px bg-white/10" />

          <button
            type="button"
            className="row group w-full text-left"
            aria-expanded={selling}
            onPointerDown={() => sfx.tap()}
            onClick={() => {
              setSelling((s) => !s);
              setTimeout(() => input.current?.focus(), 220);
            }}
          >
            <Mark size={34} state={selling ? "shut" : "open"} />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-medium">I&apos;m selling</span>
              <span className="block text-[13px] text-ink-2">Got a link or a deal code?</span>
            </span>
            <motion.span className="chev" animate={{ rotate: selling ? 90 : 0 }} transition={springs.snappy} aria-hidden>
              <Arrow />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {selling && (
              <motion.form
                key="code"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={springs.smooth}
                className="overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  const id = parseDealCode(code);
                  if (id) router.push(`/deal/${id}`);
                  else setBad(true);
                }}
              >
                <div className="flex gap-2 px-2.5 pb-2.5 pt-1">
                  <label htmlFor="deal-code" className="sr-only">Deal code</label>
                  <input
                    ref={input}
                    id="deal-code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setBad(false);
                      sfx.tick();
                    }}
                    placeholder="Deal code"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    className="field h-12 min-w-0 flex-1"
                    aria-invalid={bad}
                  />
                  <Button type="submit" disabled={code.length < 4} className="h-12! px-6!">Open</Button>
                </div>
                {bad && <p className="px-4 pb-3 text-sm text-ink-2" role="alert">That code doesn&apos;t look right.</p>}
              </motion.form>
            )}
          </AnimatePresence>
        </Item>

        <Item>
          <div className="eyebrow mb-4">How it works</div>
          <ol className="relative grid grid-cols-3 gap-2">
            <span className="absolute left-[16.6%] right-[16.6%] top-5.5 h-px bg-linear-to-r from-white/5 via-[rgba(143,211,255,.5)] to-white/5" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex flex-col items-center text-center">
                <span className="step-dot">
                  <Mark size={22} state={s.state} />
                </span>
                <span className="mt-3 font-mono text-[10px] tracking-[0.14em] text-mute">0{i + 1}</span>
                <span className="mt-1 font-display text-[15px] font-medium">{s.title}</span>
                <span className="mt-0.5 text-[12px] leading-snug text-ink-2">{s.sub}</span>
              </li>
            ))}
          </ol>
        </Item>

        <div className="flex-1" />
        <Item className="flex flex-col gap-3 pb-4">
          <Protected />
          <TestnetNote />
        </Item>
      </Stagger>
    </Screen>
  );
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);
