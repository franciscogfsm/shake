"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { haptic } from "@/lib/client/sfx";
import { springs } from "./Mark";

const APPS = {
  Claude: "Settings → Connectors → paste.",
  ChatGPT: "Settings → Apps → Developer mode → paste.",
  Cursor: "Settings → MCP → paste the config.",
} as const;
type App = keyof typeof APPS;

function ClaudeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="11" y="1.5" width="2" height="6.5" rx="1" fill="#E8A087" transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}
function ChatGptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.2a3.2 3.2 0 0 1 2.8 1.7 3.2 3.2 0 0 1 3.4 1.4 3.2 3.2 0 0 1 .6 3.6 3.2 3.2 0 0 1-1.6 3.3 3.2 3.2 0 0 1-2.8 1.7 3.2 3.2 0 0 1-2.8-1.7 3.2 3.2 0 0 1-3.4-1.4 3.2 3.2 0 0 1-.6-3.6 3.2 3.2 0 0 1 1.6-3.3A3.2 3.2 0 0 1 12 3.2Z" stroke="#ececec" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.1" fill="#10a37f" />
    </svg>
  );
}
function CursorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#0b0d10" stroke="#8fd3ff" strokeOpacity="0.7" />
      <path d="M8 6.5 17 12l-5.2 1.4L9.6 18 8 6.5Z" fill="#8fd3ff" />
    </svg>
  );
}
const ICONS = { Claude: ClaudeIcon, ChatGPT: ChatGptIcon, Cursor: CursorIcon };

/** One click: copy the address for the assistant they picked. The assistant still cannot move the money. */
export function McpConnect({ url }: { url: string }) {
  const [app, setApp] = useState<App>("Claude");
  const [copied, setCopied] = useState(false);
  const cursor = JSON.stringify({ mcpServers: { shake: { url } } }, null, 2);
  const text = app === "Cursor" ? cursor : url;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      haptic.tick();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="glass p-3.5 lg:p-5">
      <div className="eyebrow">Pick one. Copy. Paste.</div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 lg:mt-3" role="group" aria-label="Choose your assistant">
        {(Object.keys(APPS) as App[]).map((name) => {
          const Icon = ICONS[name];
          const on = app === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => { haptic.tick(); setCopied(false); setApp(name); }}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-2xl border text-[12px] transition-colors sm:h-14 sm:text-[13px] ${on ? "border-safe/50 bg-safe/10 text-ink" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}
            >
              <motion.span animate={{ scale: on ? 1.08 : 1 }} transition={springs.snappy}><Icon /></motion.span>
              {name}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={copy} className="btn-liquid relative mt-2.5 flex h-11 w-full items-center justify-center overflow-hidden rounded-full font-display text-[16px] font-medium text-on-safe lg:mt-3 lg:h-12">
        <span className="relative z-10">{copied ? "Copied" : `Copy for ${app}`}</span>
      </button>
      <div className="mt-2 flex min-h-10 items-center justify-center lg:mt-2.5">
        <AnimatePresence mode="wait">
          <motion.p key={copied ? `${app}-done` : app} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={springs.snappy} className="text-center text-[12px] leading-snug text-ink-2 sm:text-[13px]">
            {copied ? `Now paste it. ${APPS[app]}` : APPS[app]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
