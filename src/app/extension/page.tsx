import Link from "next/link";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { ExtensionInstall } from "@/components/ExtensionInstall";
import { ExtensionDemo } from "@/components/ExtensionDemo";

export const metadata = { title: "SHAKE for marketplaces", description: "Bring a listing from Vinted, OLX, eBay and more into a safe SHAKE payment." };

export default function ExtensionPage() {
  return (
    <Screen wide fit back="/" right={<span className="eyebrow hidden sm:inline">Chrome & Edge</span>}>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-14">
        <div>
          <Mark size={36} />
          <h1 className="display mt-3 text-[34px] leading-[0.96] sm:text-[44px] lg:text-[56px]">Found it?<br /><span className="glacier-text">Shake on it.</span></h1>
          <p className="mt-2 max-w-[32ch] text-[15px] text-ink-2">On the listing, tap Pay safely with SHAKE. The money waits until you meet.</p>
          <ExtensionDemo />
          <p className="mt-3 text-[13px] text-mute">No extension? <Link href="/deal/new" className="text-safe hover:underline">Start the payment here</Link>.</p>
        </div>
        <ExtensionInstall />
      </div>
      <TestnetNote compact className="shrink-0 pb-1 text-left" />
    </Screen>
  );
}
