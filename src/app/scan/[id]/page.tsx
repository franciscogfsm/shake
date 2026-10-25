"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { BuyerPayQR } from "@/components/OfflineShake";
import { ScanFlow } from "@/components/ScanFlow";
import { Screen } from "@/components/ui";
import { useCountry } from "@/components/Money";
import { currencyOfToken } from "@/lib/config";
import { offlineShake, useOfflineSettle, type OfflineShake } from "@/lib/client/offline";
import { useDeal } from "@/lib/client/useDeal";
import { getKeypair, isMine } from "@/lib/client/wallet";

export default function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { deal, state, refresh } = useDeal(id, { interval: 4000 });
  const [me, setMe] = useState<string | null>(null);
  const [initial, setInitial] = useState<string>();
  const [armed, setArmed] = useState(false);
  const [shaken, setShaken] = useState<OfflineShake | null>(null);
  const [country] = useCountry();

  useEffect(() => {
    setMe(getKeypair().publicKey());
    setShaken(offlineShake.get(id));
    // opened from a phone camera: the code rides in the URL fragment
    setInitial(location.hash.slice(1) || undefined);
  }, [id]);
  useOfflineSettle(deal, shaken, refresh);
  const onArmed = useCallback((a: boolean) => setArmed(a), []);
  // an offline shake landed on Stellar: show the shared "released" moment
  useEffect(() => {
    if (shaken && deal?.status === "Released") router.push(`/deal/${id}`);
  }, [shaken, deal?.status, id, router]);

  if (state === "ready" && deal && me && !isMine(deal.buyer))
    return <Screen wide fit back={`/deal/${id}`}><Notice title="Only the buyer scans." body="Open this deal on the phone that locked the money." /></Screen>;
  if (!deal)
    return <Screen wide fit back={`/deal/${id}`}><Notice title={state === "offline" ? "You're offline." : "Checking the network…"} body={state === "offline" ? "Open the deal once while you have signal. After that, the shake works without it." : ""} /></Screen>;
  if (shaken && deal.status === "Accepted")
    return <Screen wide fit back={`/deal/${id}`}><BuyerPayQR deal={deal} shaken={shaken} locale={country.locale} currency={currencyOfToken(deal.token).code} /></Screen>;
  // while the confirm sheet is open (code accepted) we stay here, even if polling sees the release first
  if (!["Accepted", "Shipped", "Delivered"].includes(deal.status) && !armed)
    return (
      <Screen wide fit back={`/deal/${id}`}>
        <Notice
          title={deal.status === "Released" ? "Already released." : deal.status === "Refunded" ? "This deal was refunded." : deal.status === "Disputed" ? "A problem is open." : deal.status === "Resolved" ? "This deal was resolved." : "The seller hasn't joined yet."}
          body={deal.status === "Locked" ? "Send them the link first. Their QR appears once they open it." : "Nothing more to do here."}
          cta={{ href: `/deal/${id}`, label: "Back to the deal" }}
        />
      </Screen>
    );

  return (
    <Screen wide fit back={`/deal/${id}`}>
      <ScanFlow
        deal={deal}
        initial={initial}
        onArmed={onArmed}
        // let the slam play on this screen, then land on the shared "released" moment
        onReleased={() => setTimeout(() => router.push(`/deal/${id}`), 1600)}
        onOffline={(s) => {
          offlineShake.set(id, s);
          setShaken(s);
        }}
      />
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
