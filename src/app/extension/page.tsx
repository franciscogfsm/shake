import Link from "next/link";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { ExtensionInstall } from "@/components/ExtensionInstall";
import { ExtensionDemo } from "@/components/ExtensionDemo";

export const metadata = { title: "SHAKE for marketplaces", description: "Bring a listing from Vinted, OLX, eBay and more into a safe SHAKE payment." };

export default function ExtensionPage() {
  return (
    <Screen wide fit back="/" right={<span className="eyebrow hidden sm:inline">Chrome & Edge</span>}>
      <div className="flex flex-1 flex-col justify-start gap-3 py-3 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-14 lg:py-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3 lg:block">
            <Mark size={32} className="shrink-0 lg:hidden" />
            <Mark size={36} className="hidden lg:block" />
            <h1 className="display text-[30px] leading-[0.95] sm:text-[44px] lg:mt-3 lg:text-[56px]">Found it?<br /><span className="glacier-text">Shake on it.</span></h1>
          </div>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-2 lg:mt-2 lg:max-w-[36ch] lg:text-[15px]">On the listing, tap Pay safely with SHAKE. The money waits until you meet.</p>
          <ExtensionDemo />
          <p className="mt-3 hidden text-[13px] text-mute lg:block">No extension? <Link href="/deal/new" className="text-safe hover:underline">Start the payment here</Link>.</p>
        </div>
        <ExtensionInstall />
      </div>
      <TestnetNote compact className="shrink-0 pt-2 pb-1 text-left lg:pt-0" />
    </Screen>
  );
}
