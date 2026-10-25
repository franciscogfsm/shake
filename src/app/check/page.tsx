"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark } from "@/components/Mark";
import { Item, Screen, Stagger } from "@/components/ui";
import { parseDealCode } from "@/lib/config";
import { checkText, verdict, type Flag } from "@/lib/scamCheck";

type Result = { verdict: "danger" | "warn" | "clear"; flags: Flag[]; dealId?: string; note?: string };

const HEAD = {
  danger: { title: "Stop. This looks like a scam.", tone: "text-danger" },
  warn: { title: "Be careful with this one.", tone: "text-ink" },
  clear: { title: "Nothing suspicious found.", tone: "text-safe" },
} as const;

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

  const run = () => {
    const flags = checkText(text);
    const dealId = findDeal(text);
    setResult({ verdict: verdict(flags), flags, dealId });
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
    <Screen back="/" wide>
      <Stagger className="flex min-h-0 flex-1 flex-col justify-center gap-6 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pt-0">
        <Item className="flex flex-col gap-6">
          <div>
            <div className="eyebrow">Scam check</div>
            <h1 className="display mt-3 text-[38px] leading-[1.02] lg:text-[60px] lg:leading-[0.98]">
              Got a weird message?<br /><span className="lg:glacier-text">Check it first.</span>
            </h1>
            <p className="mt-3 max-w-[38ch] text-ink-2 lg:text-lg">Paste what the buyer or seller sent you, or a SHAKE link or deal code. The check runs on your phone.</p>
          </div>
          <div className="relative">
          <div className="halo hidden lg:block" aria-hidden />
          <form
            className="glass flex flex-col gap-3 p-3 lg:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <label htmlFor="msg" className="sr-only">Message</label>
            <textarea
              id="msg"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="“Sent you an MB WAY request, just accept it to receive the money”"
              className="field min-h-32 resize-none py-3"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={text.trim().length < 3} className="flex-1">Check message</Button>
              <Button type="button" variant="glass" loading={reading} onClick={() => file.current?.click()}>Screenshot</Button>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && screenshot(e.target.files[0])} />
            </div>
          </form>
          </div>
        </Item>

        <Item className="flex flex-col gap-4 lg:pt-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key={JSON.stringify(result)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4" aria-live="polite">
                <div className="flex items-center gap-4">
                  <Mark size={44} state={result.verdict === "clear" ? "shut" : "open"} />
                  <h2 className={`display text-[26px] lg:text-[32px] ${HEAD[result.verdict].tone}`}>{HEAD[result.verdict].title}</h2>
                </div>
                {result.flags.map((f) => (
                  <div key={f.id + f.title} className="glass p-4">
                    <div className={`flex items-center gap-2 font-medium ${f.level === "danger" ? "text-danger" : "text-ink"}`}>
                      <span aria-hidden>{f.level === "danger" ? "⛔" : "⚠️"}</span> {f.title}
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">{f.why}</p>
                  </div>
                ))}
                {result.dealId && (
                  <Link href={`/r/${result.dealId}`} className="glass flex items-center justify-between p-4 hover:border-safe/30">
                    <span>
                      <span className="block font-medium text-safe">There&apos;s a SHAKE deal in here</span>
                      <span className="block text-[14px] text-ink-2">See the real money on Stellar, not a picture of it.</span>
                    </span>
                    <span aria-hidden className="text-safe">↗</span>
                  </Link>
                )}
                {result.verdict === "clear" && !result.dealId && (
                  <p className="text-[15px] text-ink-2">Still meeting a stranger? Ask them to lock the money with SHAKE. You&apos;ll see it&apos;s real before you hand anything over.</p>
                )}
                {result.note && <p className="text-[13px] text-mute">{result.note}</p>}
              </motion.div>
            ) : (
              <motion.div key="tips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                <div className="eyebrow">What it catches</div>
                {[
                  ["MB WAY “request money”", "Accepting a request sends money out, never in."],
                  ["“Click to receive”", "Fake checkout links that ask for your card."],
                  ["Courier fees and SMS codes", "Nobody needs a code to pay you."],
                  ["Screenshots and pressure", "Edited proof, and hurry so you don't check."],
                  ["Look-alike links", "olx-pagamentos.com is not OLX."],
                ].map(([t, d]) => (
                  <div key={t} className="flex gap-3 border-b border-line pb-3 last:border-0">
                    <span className="pulse-dot mt-2 shrink-0" />
                    <div>
                      <div className="font-medium">{t}</div>
                      <div className="text-[14px] text-ink-2">{d}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Item>
      </Stagger>
    </Screen>
  );
}
