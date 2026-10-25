"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Mark } from "@/components/Mark";
import { Item, Screen, Stagger, TestnetNote } from "@/components/ui";
import { parseDealCode } from "@/lib/config";

/** "Try it with a friend": a real two-phone deal, guided. */
export default function Try() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <Screen>
      <Stagger className="flex flex-1 flex-col gap-6 pt-6">
        <Item>
          <div className="eyebrow">Two phones · two minutes</div>
          <h1 className="display mt-3 text-[42px]">Try it with a friend.</h1>
          <p className="mt-3 text-ink-2">One of you buys, one of you sells. Real money moves on the test network.</p>
        </Item>
        <Item className="glass p-6">
          <div className="flex items-center gap-4">
            <Mark size={44} state="rest" />
            <div>
              <div className="font-display text-xl font-medium">I&apos;m buying</div>
              <p className="text-sm text-ink-2">Lock the money, send the link.</p>
            </div>
          </div>
          <Link href="/deal/new" className="contents"><Button full className="mt-5">Start a deal</Button></Link>
        </Item>
        <Item className="glass p-6">
          <div className="flex items-center gap-4">
            <Mark size={44} state="open" />
            <div>
              <div className="font-display text-xl font-medium">I&apos;m selling</div>
              <p className="text-sm text-ink-2">Open the link your friend sent, or type the deal code.</p>
            </div>
          </div>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const id = parseDealCode(code);
              if (id) router.push(`/deal/${id}`);
              else setBad(true);
            }}
          >
            <label htmlFor="deal-code" className="sr-only">Deal code</label>
            <input
              id="deal-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setBad(false);
              }}
              placeholder="Deal code"
              autoCapitalize="characters"
              className="h-14 min-w-0 flex-1 rounded-full bg-white/5 px-5 font-mono tracking-[0.12em] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-mute"
              aria-invalid={bad}
            />
            <Button type="submit" variant="glass" disabled={code.length < 4}>Open</Button>
          </form>
          {bad && <p className="mt-2 text-sm text-ink-2" role="alert">That code doesn&apos;t look right.</p>}
        </Item>
        <div className="flex-1" />
        <TestnetNote />
      </Stagger>
    </Screen>
  );
}
