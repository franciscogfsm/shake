import Link from "next/link";
import Image from "next/image";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";

export const metadata = { title: "SHAKE for marketplaces", description: "Bring a listing from Vinted, OLX, eBay and more into a safe SHAKE payment." };

export default function ExtensionPage() {
  return <Screen wide back="/" right={<span className="eyebrow">Chrome & Edge · desktop</span>}>
    <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
      <div>
        <Mark size={54} />
        <div className="eyebrow mt-8">SHAKE goes where you shop</div>
        <h1 className="display mt-3 text-5xl leading-[1.02] lg:text-7xl">Found it?<br /><span className="glacier-text">Shake on it.</span></h1>
        <p className="mt-5 max-w-[38ch] text-lg text-ink-2">A listing becomes a safe payment. Bring the item and agreed price into SHAKE, then lock the funds until you inspect it.</p>
        <a href="/shake-extension.zip" download className="mt-7 inline-flex min-h-13 items-center justify-center rounded-full bg-safe px-7 py-3 font-medium text-on-safe">Download SHAKE for Chrome</a>
        <p className="mt-3 text-sm text-mute">Install locally with Developer mode. No Web Store listing yet.</p>
        <div className="mt-7 flex flex-wrap gap-2">{["Vinted", "OLX", "eBay", "Wallapop", "Depop", "Etsy", "+10 marketplaces"].map((name) => <span key={name} className="glass rounded-full px-3 py-1.5 text-xs text-ink-2">{name}</span>)}</div>
      </div>
      <div className="glass p-6 lg:p-8">
        <div className="eyebrow">From listing to locked funds</div>
        <ol className="mt-6 space-y-6">
          {[
            ["Install once", "Extract the ZIP. Open chrome://extensions, enable Developer mode, then choose Load unpacked and select the folder containing manifest.json. Edge works through edge://extensions."],
            ["Open a listing", "Refresh a supported listing and select Pay safely with SHAKE. On another shop, click the pinned SHAKE toolbar icon."],
            ["Check, then continue", "Review the title, currency and price. Continue in SHAKE to create a payment. Nothing is paid automatically; share the deal with the seller and agree to use SHAKE."],
          ].map(([title, body], index) => <li key={title} className="flex gap-4"><span className="step-dot shrink-0">{index + 1}</span><div><h2 className="font-display text-lg">{title}</h2><p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p></div></li>)}
        </ol>
        <p className="mt-7 border-t border-line pt-5 text-xs leading-relaxed text-mute">Independent of the marketplaces. Imported details need your review and do not verify the seller. EUR, USD, GBP and BRL test assets; no currency conversion. Automatic detection varies by marketplace layout and country domain.</p>
        <TestnetNote className="mt-5" />
      </div>
    </div>
    <div className="mb-12 overflow-hidden rounded-3xl border border-line">
      <Image src="/extension-preview.png" alt="SHAKE listing review panel showing an editable item, amount, currency and source link" width={1280} height={720} className="w-full" />
      <p className="bg-white/4 px-5 py-3 text-xs text-mute">SHAKE extension on a controlled listing fixture. Marketplace pages vary.</p>
    </div>
    <p className="mb-8 text-sm text-mute">Prefer a link? <Link href="/deal/new" className="text-safe underline underline-offset-4">Create a payment directly in SHAKE</Link>.</p>
  </Screen>;
}
