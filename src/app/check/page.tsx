"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark, springs } from "@/components/Mark";
import { Item, Screen, Stagger } from "@/components/ui";
import { parseDealCode } from "@/lib/config";
import { sfx } from "@/lib/client/sfx";
import { checkText, verdict, type Flag } from "@/lib/scamCheck";

type Result = { verdict: "danger" | "warn" | "clear"; flags: Flag[]; dealId?: string; note?: string };

const HEAD = {
  danger: { title: "Stop. This looks like a scam.", tone: "text-danger" },
  warn: { title: "Be careful with this one.", tone: "text-ink" },
  clear: { title: "Nothing suspicious found.", tone: "text-safe" },
} as const;

const EXAMPLES = [
  { label: "MB WAY request", text: "Accept the MB WAY request so I can pay you. It's urgent, only today. Send me the code from the SMS." },
  { label: "Fake link", text: "Click this link to receive the money: https://olx-pagamentos.com/pay" },
  { label: "Screenshot", text: "Already paid, here's the screenshot. Payment pending, please ship it right now." },
];

const CATCHES: [string, string][] = [
  ["MB WAY “request money”", "Accepting a request sends money out, never in."],
  ["“Click to receive”", "Fake checkout links that ask for your card."],
  ["Courier fees and SMS codes", "Nobody needs a code to pay you."],
  ["Screenshots and pressure", "Edited proof, and hurry so you don't check."],
  ["Look-alike links", "olx-pagamentos.com is not OLX."],
];

/** A SHAKE link or a bare deal code means the money can be checked on Stellar, not trusted. */
function findDeal(text: string) {
  const link = text.match(/\/(?:deal|r|scan)\/(\d{1,20})/);
  if (link) return link[1];
  const t = text.trim();
  return /^[0-9a-z]{6,11}$/i.test(t) && /\d/.test(t) ? parseDealCode(t) ?? undefined : undefined;
}

export default function Check() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [reading, setReading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const run = (source = text) => {
    const flags = checkText(source);
    const dealId = findDeal(source);
    setResult({ verdict: verdict(flags), flags, dealId });
    if (verdict(flags) === "danger") sfx.slam();
    else sfx.confirm();
  };

  const screenshot = async (f: File) => {
    setReading(true);
    setResult(null);
    try {
      const image = await new Promise<string>((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(",")[1]);
        r.onerror = no;
        r.readAsDataURL(f);
      });
      const res = await fetch("/api/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, type: f.type }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setResult({ verdict: j.verdict, flags: j.flags, note: "Read by AI. Even a clean-looking screenshot can never prove a payment." });
    } catch {
      setResult({
        verdict: "warn",
        flags: [{ id: "shot", level: "warn", title: "A screenshot can't prove a payment", why: "Anyone can edit one in seconds. Ask for a SHAKE link instead: you check the money on Stellar yourself." }],
        note: "Couldn't read the screenshot here. Paste the message text above for an instant check.",
      });
    } finally {
      setReading(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <Screen back="/" wide fit>
      <Stagger className="flex min-h-0 flex-1 flex-col justify-center gap-8 pt-2 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,460px)] lg:items-center lg:gap-16 lg:pt-0">
        <Item className="flex flex-col gap-5">
          <div>
            <div className="eyebrow">Scam check</div>
            <h1 className="display mt-3 text-[38px] leading-[1.02] lg:text-[60px] lg:leading-[0.98]">
              Got a weird message?<br /><span className="lg:glacier-text">Check it first.</span>
            </h1>
            <p className="mt-3 max-w-[40ch] text-ink-2 lg:text-lg">Paste the chat, a SHAKE link, or a deal code. Nothing leaves this page.</p>
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <label htmlFor="msg" className="sr-only">Message</label>
            <textarea
              id="msg"
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, 2000));
                setResult(null);
              }}
              rows={5}
              placeholder="Paste what they sent you…"
              className="min-h-36 w-full resize-none rounded-3xl bg-white/4 px-5 py-4 text-[16px] leading-relaxed text-ink outline-none placeholder:text-mute focus:shadow-[inset_0_0_0_1.5px_rgba(143,211,255,0.7)]"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={text.trim().length < 3} className="flex-1">Check message</Button>
              <Button type="button" variant="glass" loading={reading} onClick={() => file.current?.click()}>Screenshot</Button>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && screenshot(e.target.files[0])} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setText(ex.text);
                    run(ex.text);
                  }}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-white/10 hover:text-ink"
                >
                  Try: {ex.label}
                </button>
              ))}
            </div>
          </form>
        </Item>

        <Item className="relative min-h-0">
          <div className="halo hidden lg:block" aria-hidden />
          <aside className={`glass flex max-h-[min(560px,calc(100dvh-8rem))] flex-col overflow-auto p-6 lg:p-7 ${result?.verdict === "danger" ? "glass-danger" : ""}`}>
            <AnimatePresence mode="wait">
              {result ? <Verdict key={JSON.stringify(result)} result={result} /> : <Catches key="catches" />}
            </AnimatePresence>
          </aside>
        </Item>
      </Stagger>
    </Screen>
  );
}

function Catches() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springs.snappy}>
      <div className="eyebrow">What it catches</div>
      <ol className="mt-5 flex flex-col">
        {CATCHES.map(([t, d], i) => (
          <li key={t} className="flex gap-3 border-b border-white/8 py-3.5 last:border-0 last:pb-0">
            <span className="mt-0.5 font-mono text-[11px] tracking-[0.14em] text-safe">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="font-medium">{t}</div>
              <div className="mt-0.5 text-[14px] leading-snug text-ink-2">{d}</div>
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

function Verdict({ result }: { result: Result }) {
  const head = HEAD[result.verdict];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springs.smooth} className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-center gap-4">
        <Mark size={48} state={result.verdict === "clear" ? "shut" : "open"} />
        <div>
          <div className="eyebrow">{result.flags.length === 0 ? "Clear" : `${result.flags.length} ${result.flags.length === 1 ? "problem" : "problems"}`}</div>
          <h2 className={`display mt-1 text-[26px] leading-[1.05] lg:text-[32px] ${head.tone}`}>{head.title}</h2>
        </div>
      </div>
      {result.flags.map((f, i) => (
        <motion.div key={f.id + f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.snappy, delay: 0.05 + i * 0.04 }} className="border-t border-white/10 pt-3">
          <div className={`flex items-center gap-2 font-medium ${f.level === "danger" ? "text-danger" : "text-ink"}`}>
            <span className={`size-1.5 rounded-full ${f.level === "danger" ? "bg-danger" : "bg-ink-2"}`} aria-hidden />
            {f.title}
          </div>
          <p className="mt-1 text-[15px] leading-snug text-ink-2">{f.why}</p>
        </motion.div>
      ))}
      {result.dealId && (
        <Link href={`/r/${result.dealId}`} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 hover:bg-white/8">
          <span>
            <span className="block font-medium text-safe">There&apos;s a SHAKE deal in here</span>
            <span className="block text-[14px] text-ink-2">See the real money, not a picture of it.</span>
          </span>
          <span aria-hidden className="text-safe">↗</span>
        </Link>
      )}
      {result.verdict === "clear" && !result.dealId && (
        <p className="text-[15px] text-ink-2">Still meeting a stranger? Ask them to lock the money with SHAKE. You&apos;ll see it&apos;s real before you hand anything over.</p>
      )}
      {result.note && <p className="text-[13px] text-mute">{result.note}</p>}
    </motion.div>
  );
}
