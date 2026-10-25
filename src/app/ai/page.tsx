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
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-14">
        <div>
          <Mark size={36} />
          <h1 className="display mt-3 text-[34px] leading-[0.96] sm:text-[44px] lg:text-[56px]">Ask your AI.<br /><span className="glacier-text">It can&apos;t touch the money.</span></h1>
          <p className="mt-2 max-w-[32ch] text-[15px] text-ink-2">It checks the message and makes the link. It can never pay.</p>
          <AiDemo />
        </div>
        <McpConnect url={url} />
      </div>
      <TestnetNote compact className="shrink-0 pb-1 text-left" />
    </Screen>
  );
}
