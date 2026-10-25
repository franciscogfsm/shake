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
  return <div id="install" className="glass p-5 lg:p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="eyebrow">One minute · desktop</div>
      <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 font-mono text-[10px] text-ink-2">v1.0</span>
    </div>
    <div className="mt-4 flex gap-2" role="group" aria-label="Choose your desktop browser">
      {(["Chrome", "Edge"] as const).map((name) => <button key={name} type="button" aria-pressed={browser === name} onClick={() => { setBrowser(name); setCopied(false); }} className={`h-10 flex-1 rounded-full border text-sm transition-colors ${browser === name ? "border-safe/50 bg-safe/12 text-safe" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}>{name}</button>)}
    </div>
    <a href="/shake-extension.zip" download onClick={() => setDownloaded(true)} className="btn-liquid relative mt-3 flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-6 font-display text-[16px] font-medium text-on-safe">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="relative z-10">Add SHAKE to {browser}</span>
    </a>
    {downloaded && <p className="mt-3 text-center text-xs text-safe" role="status">In Downloads: extract shake-extension.zip.</p>}
    <ol className="mt-4 space-y-3">
      <li className="flex items-center gap-3 text-[14px]"><span className="step-dot shrink-0 !size-6 text-[11px]">1</span><span>Extract the ZIP.</span></li>
      <li className="flex items-center gap-3 text-[14px]">
        <span className="step-dot shrink-0 !size-6 text-[11px]">2</span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0">Open <code className="text-[12px] text-ink-2">{manager}</code> and turn on Developer mode.</span>
          <button type="button" onClick={copy} className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-xs text-safe">{copied ? "Copied" : "Copy"}</button>
        </span>
      </li>
      <li className="flex items-center gap-3 text-[14px]"><span className="step-dot shrink-0 !size-6 text-[11px]">3</span><span>Load unpacked, pick the folder, pin SHAKE.</span></li>
    </ol>
    <p className="mt-4 text-[11px] text-mute">Not in the Web Store yet. The button downloads a ZIP. It cannot install itself.</p>
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
