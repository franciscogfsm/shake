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
    <svg className="size-7 lg:size-10" viewBox="0 0 24 24" aria-hidden>
      <path fill="#D97757" d="m4.714 15.956 4.718-2.648.079-.23-.08-.128h-.23l-.79-.048-2.695-.073-2.337-.097-2.265-.122-.57-.121-.535-.704.055-.353.48-.321.685.06 1.518.104 2.277.157 1.651.098 2.447.255h.389l.054-.158-.133-.097-.103-.098-2.356-1.596-2.55-1.688-1.336-.972-.722-.491L2 6.223l-.158-1.008.656-.722.88.06.224.061.893.686 1.906 1.476 2.49 1.833.364.304.146-.104.018-.072-.164-.274-1.354-2.446-1.445-2.49-.644-1.032-.17-.619a3 3 0 0 1-.103-.729L6.287.133 6.7 0l.995.134.42.364.619 1.415L9.735 4.14l1.555 3.03.455.898.243.832.09.255h.159V9.01l.127-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.583.28.48.685-.067.444-.286 1.851-.558 2.903-.365 1.942h.213l.243-.242.983-1.306 1.652-2.064.728-.82.85-.904.547-.431h1.032l.759 1.129-.34 1.166-1.063 1.347-.88 1.142-1.263 1.7-.79 1.36.074.11.188-.02 2.853-.606 1.542-.28 1.84-.315.832.388.09.395-.327.807-1.967.486-2.307.462-3.436.813-.043.03.049.061 1.548.146.662.036h1.62l3.018.225.79.522.473.638-.08.485-1.213.62-1.64-.389-3.825-.91-1.31-.329h-.183v.11l1.093 1.068 2.003 1.81 2.508 2.33.127.578-.321.455-.34-.049-2.204-1.657-.85-.747-1.925-1.62h-.127v.17l.443.649 2.343 3.521.122 1.08-.17.353-.607.213-.668-.122-1.372-1.924-1.415-2.168-1.141-1.943-.14.08-.674 7.254-.316.37-.728.28-.607-.461-.322-.747.322-1.476.388-1.924.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.432 1.967-2.18 2.945-1.724 1.845-.413.164-.716-.37.066-.662.401-.589 2.386-3.036 1.439-1.882.929-1.086-.006-.158h-.055L4.138 18.56l-1.13.146-.485-.456.06-.746.231-.243 1.907-1.312Z" />
    </svg>
  );
}
function ChatGptIcon() {
  return (
    <svg className="size-7 lg:size-10" viewBox="1.68 1.75 16.65 16.5" aria-hidden>
      <path fill="#f4f4f5" d="M11.248 18.25q-.825 0-1.568-.314a4.3 4.3 0 0 1-1.32-.874 4 4 0 0 1-1.304.214 4 4 0 0 1-2.046-.544 4.27 4.27 0 0 1-1.518-1.485 4 4 0 0 1-.56-2.095q0-.48.131-1.04A4.4 4.4 0 0 1 2.04 10.71a4.07 4.07 0 0 1 .017-3.4 4.2 4.2 0 0 1 1.056-1.418 3.8 3.8 0 0 1 1.6-.842 3.9 3.9 0 0 1 .76-1.683q.593-.759 1.451-1.188a4.04 4.04 0 0 1 1.832-.429q.825 0 1.567.313.742.314 1.32.875a4 4 0 0 1 1.304-.215q1.106 0 2.046.545a4.14 4.14 0 0 1 1.501 1.485q.578.941.578 2.095 0 .48-.132 1.04.66.61 1.023 1.419.363.792.363 1.666 0 .892-.38 1.717a4.3 4.3 0 0 1-1.072 1.435 3.8 3.8 0 0 1-1.584.825 3.8 3.8 0 0 1-.775 1.683 4.06 4.06 0 0 1-1.436 1.188 4.04 4.04 0 0 1-1.832.429m-4.076-2.062q.825 0 1.435-.347l3.103-1.782a.36.36 0 0 0 .164-.313v-1.42L7.881 14.62a.67.67 0 0 1-.726 0l-3.118-1.798a.5.5 0 0 1-.017.115v.198q0 .841.396 1.551.413.693 1.139 1.089a3.2 3.2 0 0 0 1.617.412m.165-2.69a.4.4 0 0 0 .181.05q.083 0 .165-.05l1.238-.71-3.977-2.31a.7.7 0 0 1-.363-.643v-3.58q-.825.362-1.32 1.122a2.9 2.9 0 0 0-.495 1.65q0 .809.413 1.55.412.743 1.072 1.123zm3.91 3.663q.875 0 1.585-.396a2.96 2.96 0 0 0 1.534-2.64v-3.564a.32.32 0 0 0-.165-.297l-1.254-.726v4.604a.7.7 0 0 1-.363.643l-3.119 1.799a3 3 0 0 0 1.783.577m.627-6.039V8.878L10.01 7.822 8.129 8.878v2.244l1.881 1.056zM7.057 5.859a.7.7 0 0 1 .363-.644l3.119-1.798a3 3 0 0 0-1.782-.578q-.874 0-1.584.396A2.96 2.96 0 0 0 6.05 4.324a3.07 3.07 0 0 0-.396 1.551v3.547q0 .199.165.314l1.237.726zm8.383 7.887q.825-.364 1.303-1.123.495-.758.495-1.65a3.15 3.15 0 0 0-.412-1.55q-.413-.743-1.073-1.123l-3.086-1.782q-.099-.065-.181-.049a.3.3 0 0 0-.165.05l-1.238.692 3.993 2.327a.6.6 0 0 1 .264.264.64.64 0 0 1 .1.363zm-3.317-8.382a.63.63 0 0 1 .726 0l3.135 1.831v-.297q0-.792-.396-1.501a2.86 2.86 0 0 0-1.105-1.155q-.71-.43-1.65-.43-.825 0-1.436.347L8.294 5.941a.36.36 0 0 0-.165.314v1.418z" />
    </svg>
  );
}
function CursorIcon() {
  return (
    <svg className="size-7 lg:size-10" viewBox="0 0 24 24" aria-hidden>
      <path fill="#f3f5f7" d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
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
    <div className="glass p-3.5 lg:p-7">
      <div className="eyebrow">Pick one. Copy. Paste.</div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 lg:mt-5 lg:gap-3" role="group" aria-label="Choose your assistant">
        {(Object.keys(APPS) as App[]).map((name) => {
          const Icon = ICONS[name];
          const on = app === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => { haptic.tick(); setCopied(false); setApp(name); }}
              className={`flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[12px] transition-colors sm:text-[13px] lg:h-28 lg:gap-2.5 lg:rounded-3xl lg:text-[14px] ${on ? "border-safe/50 bg-safe/10 text-ink" : "border-line bg-white/3 text-ink-2 hover:bg-white/8"}`}
            >
              <motion.span animate={{ scale: on ? 1.08 : 1 }} transition={springs.snappy}><Icon /></motion.span>
              {name}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={copy} className="btn-liquid relative mt-2.5 flex h-11 w-full items-center justify-center overflow-hidden rounded-full font-display text-[16px] font-medium text-on-safe lg:mt-5 lg:h-12">
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
