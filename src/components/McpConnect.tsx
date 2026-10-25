"use client";
import { useState } from "react";
import { haptic } from "@/lib/client/sfx";

const APPS = {
  Claude: ["Open Settings → Connectors.", "Choose Add custom connector and paste the address.", "Ask: “Is this seller's message safe?”"],
  ChatGPT: ["Open Settings → Apps & Connectors → Advanced, and turn on Developer mode.", "Create a connector and paste the address.", "Start a chat, add SHAKE from the + menu, and ask."],
  Cursor: ["Open Settings → MCP → Add new server.", "Paste the config below.", "Ask the agent to protect a purchase."],
} as const;
type App = keyof typeof APPS;

/** The one thing a person needs: the address, copied, plus three steps for their assistant. Menu names drift; keep these short. */
export function McpConnect({ url }: { url: string }) {
  const [app, setApp] = useState<App>("Claude");
  const [copied, setCopied] = useState<string | null>(null);
  const cursor = JSON.stringify({ mcpServers: { shake: { url } } }, null, 2);
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); haptic.tick(); setCopied(what); }
    catch { setCopied(null); }
  };
  return <div id="connect" className="glass scroll-mt-6 p-5 sm:p-7">
    <div className="flex items-center justify-between gap-3">
      <div className="eyebrow">Connect · about 30 seconds</div>
      <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 font-mono text-[10px] text-ink-2">No login</span>
    </div>
    <div className="mt-5 flex items-center justify-between gap-2 rounded-2xl border border-line bg-black/20 p-2 pl-4">
      <code className="min-w-0 truncate select-all font-mono text-[13px] text-ink">{url}</code>
      <button type="button" onClick={() => copy("url", url)} aria-label="Copy the SHAKE address" className="shrink-0 rounded-xl bg-safe/12 px-4 py-2 text-sm text-safe hover:bg-safe/20">{copied === "url" ? "Copied ✓" : "Copy"}</button>
    </div>
    <div className="mt-5 flex gap-2" role="group" aria-label="Choose your assistant">
      {(Object.keys(APPS) as App[]).map((name) => <button key={name} type="button" aria-pressed={app === name} onClick={() => { haptic.tick(); setApp(name); }} className={`min-h-10 flex-1 rounded-full border text-sm transition-colors ${app === name ? "border-safe/50 bg-safe/12 text-safe" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}>{name}</button>)}
    </div>
    <ol className="mt-6 space-y-4">
      {APPS[app].map((step, i) => <li key={app + i} className="flex gap-3"><span className="step-dot shrink-0 !size-7 text-xs">{i + 1}</span><p className="pt-1 text-[14px] leading-relaxed text-ink-2">{step}</p></li>)}
    </ol>
    {app === "Cursor" && <div className="relative mt-4 rounded-xl border border-line bg-black/20 p-3">
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-ink-2">{cursor}</pre>
      <button type="button" onClick={() => copy("cursor", cursor)} className="absolute right-2 top-2 rounded-lg bg-white/7 px-3 py-1.5 text-xs text-safe">{copied === "cursor" ? "Copied ✓" : "Copy"}</button>
    </div>}
    <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-mute">Menu names change between versions. If you can&apos;t find one, look for “connectors” or “MCP” in your assistant&apos;s settings.</p>
  </div>;
}
