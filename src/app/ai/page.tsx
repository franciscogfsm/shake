import { headers } from "next/headers";
import { Screen, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { McpConnect } from "@/components/McpConnect";
import { AiDemo } from "@/components/AiDemo";

export const metadata = { title: "SHAKE in your AI", description: "Add SHAKE to Claude, ChatGPT or Cursor. Your assistant checks the deal and makes the link. It can never move the money." };

export default async function AiPage() {
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "shake-lake.vercel.app"}/api/mcp`;
  return (
    <Screen wide fit back="/" right={<span className="eyebrow hidden sm:inline">Claude · ChatGPT · Cursor</span>}>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 py-2 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Mark size={26} />
            <span className="eyebrow">SHAKE, inside your AI</span>
          </div>
          <h1 className="display mt-3 text-[34px] leading-[0.95] sm:text-[48px] lg:text-[60px]">Ask your AI.<br /><span className="glacier-text">It can&apos;t touch the money.</span></h1>
          <p className="mt-3 max-w-[44ch] text-[15px] leading-snug text-ink-2 lg:text-[17px]">It spots the scam, finds a safe place to meet and makes the link. Releasing the money takes your two phones, in the same place. No AI, no server, not even us.</p>
          <AiDemo />
        </div>
        <McpConnect url={url} />
      </div>
      <TestnetNote compact className="shrink-0 pt-2 pb-1 text-left lg:pt-0" />
    </Screen>
  );
}
