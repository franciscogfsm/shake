"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { springs } from "./Mark";

function ChromeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="#fff" />
      <path d="M12 7.5h8.2a9 9 0 0 0-15.3-3.2L9.4 9A4.5 4.5 0 0 1 12 7.5Z" fill="#ea4335" />
      <path d="M9.4 9 4.9 4.3A9 9 0 0 0 7.6 19.2L12 12l-2.6-3Z" fill="#fbbc04" />
      <path d="M12 12l4.4 7.2A9 9 0 0 0 20.2 7.5H12A4.5 4.5 0 0 0 12 12Z" fill="#34a853" />
      <circle cx="12" cy="12" r="3.2" fill="#4285f4" />
    </svg>
  );
}
function EdgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4c4 0 8 2.6 8 7.2 0 5-4.2 8.8-9.2 8.8S3 16.4 3 12.2C3 8.6 6.2 6 9.4 6c2.4 0 3.6 1.4 3.6 1.4S11.6 4 12 4Z" fill="#0a7" />
      <path d="M8 13.5c.8 2 2.6 3.3 4.6 3.3 3 0 4.6-2.2 4.6-2.2-1.2 2.6-4 4.4-7.2 4.4C6.2 19 3 15.6 3 12.2c0-1 .3-2 .8-2.8 1.2 1.6 2.6 2.6 4.2 4.1Z" fill="#36c" />
    </svg>
  );
}

export function ExtensionInstall() {
  const [browser, setBrowser] = useState<"Chrome" | "Edge">("Chrome");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [step, setStep] = useState(0);
  const manager = browser === "Chrome" ? "chrome://extensions" : "edge://extensions";
  useEffect(() => {
    if (downloaded) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % 3), 1700);
    return () => clearTimeout(t);
  }, [step, downloaded]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(manager); setCopied(true); }
    catch { setCopied(false); }
  };
  const steps = ["Extract the ZIP.", `Open ${manager}. Developer mode on.`, "Load unpacked. Pin SHAKE."];
  return <div id="install" className="glass p-5 lg:p-6">
    <div className="flex items-center justify-between gap-3">
      <div className="eyebrow">One minute · desktop</div>
      <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 font-mono text-[10px] text-ink-2">v1.0</span>
    </div>
    <div className="mt-4 flex gap-2" role="group" aria-label="Choose your desktop browser">
      {(["Chrome", "Edge"] as const).map((name) => (
        <button key={name} type="button" aria-pressed={browser === name} onClick={() => { setBrowser(name); setCopied(false); }} className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full border text-sm transition-colors ${browser === name ? "border-safe/50 bg-safe/12 text-ink" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}>
          {name === "Chrome" ? <ChromeIcon /> : <EdgeIcon />}
          {name}
        </button>
      ))}
    </div>
    <a href="/shake-extension.zip" download onClick={() => setDownloaded(true)} className="btn-liquid relative mt-3 flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-6 font-display text-[16px] font-medium text-on-safe">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="relative z-10">Add SHAKE to {browser}</span>
    </a>
    {downloaded && <p className="mt-3 text-center text-xs text-safe" role="status">In Downloads: extract shake-extension.zip.</p>}
    <ol className="mt-4 space-y-2">
      {steps.map((label, n) => (
        <li key={n} className="flex items-center gap-3 text-[14px]">
          <motion.span animate={{ scale: step === n ? 1.08 : 1 }} transition={springs.snappy} className={`step-dot shrink-0 !size-6 text-[11px] ${step === n ? "" : "opacity-40"}`}>{n + 1}</motion.span>
          <span className={`min-w-0 flex-1 truncate ${step === n ? "text-ink" : "text-mute"}`}>{label}</span>
          {n === 1 && <button type="button" onClick={copy} className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-xs text-safe">{copied ? "Copied" : "Copy"}</button>}
        </li>
      ))}
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
