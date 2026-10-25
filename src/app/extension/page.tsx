import Link from "next/link";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { ExtensionInstall } from "@/components/ExtensionInstall";

export const metadata = { title: "SHAKE for marketplaces", description: "Bring a listing from Vinted, OLX, eBay and more into a safe SHAKE payment." };

const MARKETS = ["Vinted", "OLX", "eBay", "Wallapop", "Depop", "Etsy"];

export default function ExtensionPage() {
  return (
    <Screen wide fit back="/" right={<span className="eyebrow hidden sm:inline">Chrome & Edge</span>}>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-16 lg:py-0">
        <div>
          <Mark size={44} />
          <h1 className="display mt-5 text-[44px] leading-[0.96] lg:text-[64px]">Found it?<br /><span className="glacier-text">Shake on it.</span></h1>
          <p className="mt-4 max-w-[34ch] text-[17px] leading-snug text-ink-2 lg:text-lg">On a listing, SHAKE takes the item and the price. You lock the money until you meet.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {MARKETS.map((name) => <span key={name} className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-ink-2">{name}</span>)}
          </div>
          <p className="mt-5 text-[13px] text-mute">
            Already in? Open the item and tap <span className="text-ink">Pay safely with SHAKE</span>.
            {" "}Or <Link href="/deal/new" className="text-safe hover:underline">start the payment here</Link>.
          </p>
        </div>
        <ExtensionInstall />
      </div>
      <TestnetNote compact className="shrink-0 pb-2 text-left lg:text-left" />
    </Screen>
  );
}
