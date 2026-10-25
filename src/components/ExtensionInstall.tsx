"use client";
import { useState } from "react";

export function ExtensionInstall() {
  const [browser, setBrowser] = useState<"Chrome" | "Edge">("Chrome");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const manager = browser === "Chrome" ? "chrome://extensions" : "edge://extensions";
  const copy = async () => {
    try { await navigator.clipboard.writeText(manager); setCopied(true); }
    catch { setCopied(false); }
  };
  return <div id="install" className="glass scroll-mt-6 p-5 sm:p-7">
    <div className="flex items-center justify-between gap-3">
      <div className="eyebrow">Add SHAKE · about one minute</div>
      <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 font-mono text-[10px] text-ink-2">v1.0</span>
    </div>
    <div className="mt-5 flex gap-2" role="group" aria-label="Choose your desktop browser">
      {(["Chrome", "Edge"] as const).map((name) => <button key={name} type="button" aria-pressed={browser === name} onClick={() => { setBrowser(name); setCopied(false); }} className={`min-h-10 flex-1 rounded-full border text-sm transition-colors ${browser === name ? "border-safe/50 bg-safe/12 text-safe" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}>{name}</button>)}
    </div>
    <a href="/shake-extension.zip" download onClick={() => setDownloaded(true)} className="btn-liquid relative mt-4 flex min-h-13 items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 font-display text-[16px] font-medium text-on-safe">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="relative z-10">Add SHAKE to {browser}</span>
    </a>
    <p className="mt-2.5 text-center text-xs text-mute">Downloads a ZIP. Install it with the steps below.</p>
    {downloaded && <p className="mt-3 rounded-xl border border-safe/20 bg-safe/5 px-3 py-2 text-xs text-safe" role="status">Next: find shake-extension.zip in Downloads and extract it.</p>}
    <ol className="mt-6 space-y-5">
      <li className="flex gap-3"><span className="step-dot shrink-0 !size-7 text-xs">1</span><div><h2 className="font-display text-[15px]">Extract the download</h2><p className="mt-1 text-[13px] leading-relaxed text-ink-2">In Downloads, right-click the ZIP and choose <strong className="font-medium text-ink">Extract All</strong>. On macOS, double-click it. Keep the extracted folder.</p></div></li>
      <li className="flex gap-3"><span className="step-dot shrink-0 !size-7 text-xs">2</span><div className="min-w-0 flex-1"><h2 className="font-display text-[15px]">Open your extensions</h2><p className="mt-1 text-[13px] leading-relaxed text-ink-2">Paste this address into a new tab. Switch on <strong className="font-medium text-ink">Developer mode</strong>.</p><div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-black/15 p-2 pl-3"><code className="select-all text-[11px] text-ink-2">{manager}</code><button type="button" onClick={copy} aria-label={`Copy ${manager}`} className="rounded-lg bg-white/7 px-3 py-1.5 text-xs text-safe">{copied ? "Copied" : "Copy"}</button></div></div></li>
      <li className="flex gap-3"><span className="step-dot shrink-0 !size-7 text-xs">3</span><div><h2 className="font-display text-[15px]">Load SHAKE</h2><p className="mt-1 text-[13px] leading-relaxed text-ink-2">Select <strong className="font-medium text-ink">Load unpacked</strong> and choose the extracted folder containing <code className="text-xs">manifest.json</code>. Pin SHAKE from the browser&apos;s extensions menu.</p></div></li>
    </ol>
    <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-mute">Desktop {browser}. This release installs locally; it is not in the Chrome Web Store yet. The download button cannot install an extension automatically.</p>
  </div>;
}

export function ExtensionTroubleshooting() {
  return <details className="glass p-5">
    <summary className="cursor-pointer font-display text-base">Not seeing the SHAKE button?</summary>
    <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
      <p>Refresh the listing after installing. Open an individual item, rather than the marketplace home or search results.</p>
      <p>Click the pinned SHAKE icon to open the panel manually. If the browser asks for site access, allow it for the marketplace you want to use.</p>
      <p>After downloading a newer version, replace the extracted files, select <strong className="font-medium text-ink">Reload</strong> on SHAKE in the extensions page, and refresh the listing.</p>
      <p>Missing price or currency? Enter the details you agreed with the seller. SHAKE never converts the listing price automatically.</p>
    </div>
  </details>;
}
