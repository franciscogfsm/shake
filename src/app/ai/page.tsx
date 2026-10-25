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
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-20">
        <div className="min-w-0">
          <div className="flex items-center gap-3 lg:block">
            <Mark size={32} className="shrink-0 lg:hidden" />
            <Mark size={36} className="hidden lg:block" />
            <h1 className="display text-[30px] leading-[0.95] sm:text-[44px] lg:mt-3 lg:text-[56px]">Ask your AI.<br /><span className="glacier-text sm:hidden">It can&apos;t pay.</span><span className="glacier-text hidden sm:inline">It can&apos;t touch the money.</span></h1>
          </div>
          <p className="mt-1.5 text-[14px] leading-snug text-ink-2 lg:mt-2 lg:max-w-[36ch] lg:text-[15px]">It checks the message and makes the link. You lock the money.</p>
          <AiDemo />
        </div>
        <McpConnect url={url} />
      </div>
      <TestnetNote compact className="shrink-0 pt-2 pb-1 text-left lg:pt-0" />
    </Screen>
  );
}
