"use client";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    <Screen wide fit>
      <Stagger className="flex flex-1 flex-col justify-start py-4 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,440px)] lg:items-center lg:gap-x-16 lg:gap-y-8 lg:py-0">
        <Item className="pt-6 lg:col-start-1 lg:row-start-1 lg:pt-0">
          <div className="eyebrow">Two phones · two minutes</div>
          <h1 className="display mt-3 text-[42px] leading-[1.02] lg:text-[68px] lg:leading-[0.96]">Try it with<br /><span className="lg:glacier-text">a friend.</span></h1>
          <p className="mt-3 max-w-[34ch] text-ink-2 lg:mt-4 lg:max-w-[36ch] lg:text-xl">One of you buys, one of you sells. Payments settle live on Stellar Testnet using test assets.</p>
        </Item>

        <Item className="relative mt-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0">
        <div className="halo hidden lg:block" aria-hidden />
        <div className="glass overflow-hidden p-1.5 lg:p-2.5">
          <Link href="/deal/new" onPointerDown={() => sfx.tap()} className="row group">
            <Mark size={40} state="rest" />
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
            <Mark size={40} state={selling ? "shut" : "open"} />
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
        </div>
        </Item>

        <Item className="mt-8 lg:col-start-1 lg:row-start-2 lg:mt-2">
          <How />
        </Item>

        <Item className="mt-auto flex flex-col gap-3 pb-4 pt-8 lg:col-start-1 lg:row-start-3 lg:mt-0 lg:pb-0 lg:pt-0">
          <Protected className="justify-center lg:justify-start" />
          <TestnetNote className="lg:text-left" />
        </Item>
      </Stagger>
    </Screen>
  );
}

/** Three beats. The line draws, then the last coin slams shut. */
function How() {
  const reduce = useReducedMotion();
  const [met, setMet] = useState(false);
  useEffect(() => {
    if (reduce) {
      setMet(true);
      return;
    }
    const id = setTimeout(() => setMet(true), 720);
    return () => clearTimeout(id);
  }, [reduce]);

  return (
    <div>
      <div className="eyebrow mb-4 lg:mb-6">How it works</div>
      <ol className="relative grid grid-cols-3 gap-2 lg:max-w-[520px] lg:gap-4">
        <motion.span
          className="absolute top-[22px] right-[16.6%] left-[16.6%] h-px origin-left bg-linear-to-r from-white/5 via-[rgba(143,211,255,.7)] to-white/5 lg:top-[36px]"
          aria-hidden
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            className="relative flex flex-col items-center text-center"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.snappy, delay: 0.12 + i * 0.08 }}
            whileHover={{ y: -3 }}
          >
            <span className="step-dot lg:!size-[72px]">
              <span className="grid lg:scale-[2]">
                <Mark size={22} state={i === 2 ? (met ? "shut" : "open") : s.state} />
              </span>
            </span>
            <span className="mt-3 font-mono text-[10px] tracking-[0.14em] text-mute">0{i + 1}</span>
            <span className="mt-1 font-display text-[15px] font-medium lg:text-lg">{s.title}</span>
            <span className="mt-0.5 text-[12px] leading-snug text-ink-2 lg:text-sm">{s.sub}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);
