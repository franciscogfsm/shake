"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { GlassSheet } from "@/components/GlassSheet";
import { BumpToShake } from "@/components/BumpToShake";
import { HoldToShake } from "@/components/HoldToShake";
import { Scanner } from "@/components/Scanner";
import { Screen, TestnetNote } from "@/components/ui";
import { currencyOfToken, formatMoney, fromUnits } from "@/lib/config";
import { useCountry } from "@/components/Money";
import { codeToHex, dealMeta, parseScan } from "@/lib/client/handshake";
import { useDeal } from "@/lib/client/useDeal";
import { ApiError, callDeal, getKeypair, sha256Hex } from "@/lib/client/wallet";

export default function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { deal, state } = useDeal(id, { interval: 4000 });
  const [me, setMe] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState("");
  const [bump, setBump] = useState(0);
  const [country] = useCountry();
  const [item, setItem] = useState<string | undefined>();

  useEffect(() => {
    setMe(getKeypair().publicKey());
    setItem(dealMeta.get(id).item);
    // opened from a phone camera: the code rides in the URL fragment
    const fromUrl = location.hash.slice(1);
    if (fromUrl) check(fromUrl.length === 10 ? fromUrl : `${location.origin}/scan/${id}#${fromUrl}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const check = async (raw: string) => {
    const parsed = parseScan(raw);
    if (!parsed) return setProblem("That's not a SHAKE code.");
    if (parsed.dealId && parsed.dealId !== id) return setProblem("That QR belongs to a different deal.");
    const hex = /^[0-9a-f]{64}$/i.test(parsed.code) ? parsed.code : codeToHex(parsed.code);
    if (deal?.hash && (await sha256Hex(hex)) !== deal.hash) return setProblem("That code is old or wrong. Ask the seller to show their QR again.");
    setProblem("");
    setCode(hex);
  };

  const release = async () => {
    try {
      await callDeal(getKeypair(), "release", { dealId: id, secret: code! });
      // let the slam play on this screen, then land on the shared "released" moment
      setTimeout(() => router.push(`/deal/${id}`), 1600);
    } catch (e) {
      setProblem(e instanceof ApiError ? e.message : "The network didn't confirm. Nothing moved. Try again.");
      setCode(null);
      throw e;
    }
  };

  if (state === "ready" && deal && me && deal.buyer !== me)
    return <Screen back={`/deal/${id}`}><Notice title="Only the buyer scans." body="Open this deal on the phone that locked the money." /></Screen>;
  // while the confirm sheet is open (code accepted) we stay here, even if polling sees the release first
  if (deal && deal.status !== "Accepted" && !code)
    return (
      <Screen back={`/deal/${id}`}>
        <Notice
          title={deal.status === "Released" ? "Already released." : deal.status === "Refunded" ? "This deal was refunded." : "The seller hasn't joined yet."}
          body={deal.status === "Locked" ? "Send them the link first. Their QR appears once they open it." : "Nothing more to do here."}
          cta={{ href: `/deal/${id}`, label: "Back to the deal" }}
        />
      </Screen>
    );

  const euros = deal ? fromUnits(deal.amount) : 0;
  const money = deal ? formatMoney(euros, currencyOfToken(deal.token).code, country.locale) : "";
  return (
    <Screen back={`/deal/${id}`}>
      <div className="flex flex-1 flex-col gap-5 pt-2">
        <div>
          <div className="eyebrow">{item ? `${item} · ` : ""}{money}</div>
          <h1 className="display mt-2 text-[34px]">Check the item. Then scan.</h1>
        </div>
        <Scanner onCode={check} paused={!!code} />
        {problem && <p className="rounded-2xl bg-white/5 px-4 py-3 text-center text-ink-2" role="alert">{problem}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            check(typed);
          }}
        >
          <label htmlFor="code" className="sr-only">Code under the QR</label>
          <input
            id="code"
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 14))}
            placeholder="Or type the code: XXXX-XXXX-XX"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 rounded-full bg-white/5 px-5 font-mono tracking-[0.1em] text-ink outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-mute focus:bg-white/8"
          />
          <Button type="submit" variant="glass" disabled={typed.replace(/[^A-Z0-9]/g, "").length < 10}>Go</Button>
        </form>
        <TestnetNote className="mt-auto" />
      </div>

      <GlassSheet open={!!code} onClose={() => setCode(null)} label="Release the money">
        <div className="flex flex-col items-center gap-6 pb-4 text-center">
          <div>
            <div className="eyebrow">Code matches ✓</div>
            <h2 className="display mt-3 text-[30px]">Release {money} to the seller?</h2>
            <p className="mt-2 text-sm text-ink-2">Only if you have the item in your hands. This is final.</p>
          </div>
          <BumpToShake armed={!!code} onBump={() => setBump((n) => n + 1)} />
          <HoldToShake onShake={release} trigger={bump} hint="or hold · about 5 seconds to final" />
        </div>
      </GlassSheet>
    </Screen>
  );
}

function Notice({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="display text-[30px]">{title}</h1>
      <p className="max-w-[30ch] text-ink-2">{body}</p>
      {cta && <Link href={cta.href} className="contents"><Button variant="glass">{cta.label}</Button></Link>}
    </div>
  );
}
