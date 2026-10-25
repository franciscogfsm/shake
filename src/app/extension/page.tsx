import Link from "next/link";
import Image from "next/image";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { ExtensionInstall, ExtensionTroubleshooting } from "@/components/ExtensionInstall";

export const metadata = { title: "SHAKE for marketplaces", description: "Bring a listing from Vinted, OLX, eBay and more into a safe SHAKE payment." };

export default function ExtensionPage() {
  return <Screen wide back="/" right={<span className="eyebrow">Chrome & Edge · desktop</span>}>
    <div className="grid flex-1 items-center gap-9 py-10 lg:grid-cols-[1fr_420px] lg:gap-16 lg:py-14">
      <div>
        <Mark size={54} />
        <div className="eyebrow mt-7">Your marketplace. Your handshake.</div>
        <h1 className="display mt-3 text-5xl leading-[1.02] lg:text-7xl">Found it?<br /><span className="glacier-text">Shake on it.</span></h1>
        <p className="mt-5 max-w-[38ch] text-lg text-ink-2">A listing becomes a safe payment. Bring the item and agreed price into SHAKE, then lock the funds until you inspect it.</p>
        <a href="#install" className="mt-6 inline-flex items-center gap-2 text-sm text-safe underline underline-offset-4">Add the extension <span aria-hidden="true">↗</span></a>
        <div className="mt-7 max-w-[440px] border-t border-line pt-5">
          <div className="eyebrow">Already installed? Try it now.</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Open any item on <a href="https://www.vinted.pt/" target="_blank" rel="noopener noreferrer" className="text-safe underline underline-offset-4">Vinted</a> or <a href="https://www.olx.pt/" target="_blank" rel="noopener noreferrer" className="text-safe underline underline-offset-4">OLX</a>. Refresh the listing, then select <strong className="font-medium text-ink">Pay safely with SHAKE</strong>.</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Review the title, price and currency. Select <strong className="font-medium text-ink">Continue in SHAKE</strong> to open your prefilled payment. Share the deal with the seller after you agree to use SHAKE.</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-2">{["Vinted", "OLX", "eBay", "Wallapop", "Depop", "Etsy", "+10 marketplaces"].map((name) => <span key={name} className="glass rounded-full px-3 py-1.5 text-xs text-ink-2">{name}</span>)}</div>
      </div>
      <ExtensionInstall />
    </div>
    <div className="mb-8"><ExtensionTroubleshooting /></div>
    <p className="mb-4 max-w-[90ch] text-xs leading-relaxed text-mute">SHAKE is independent of these marketplaces. Imported details need your review and do not verify the seller. EUR, USD, GBP and BRL test assets; no currency conversion. Automatic detection varies by marketplace layout and country domain.</p>
    <TestnetNote className="mb-6 text-left" />
    <div className="mb-12 overflow-hidden rounded-3xl border border-line">
      <Image src="/extension-preview.png" alt="SHAKE listing review panel showing an editable item, amount, currency and source link" width={1280} height={720} className="w-full" />
      <p className="bg-white/4 px-5 py-3 text-xs text-mute">SHAKE extension on a controlled listing fixture. Marketplace pages vary.</p>
    </div>
    <p className="mb-8 text-sm text-mute">Prefer a link? <Link href="/deal/new" className="text-safe underline underline-offset-4">Create a payment directly in SHAKE</Link>.</p>
  </Screen>;
}
