import { headers } from "next/headers";
import { Item, Screen, Stagger, TestnetNote } from "@/components/ui";
import { Mark } from "@/components/Mark";
import { McpConnect } from "@/components/McpConnect";

export const metadata = { title: "SHAKE in your AI", description: "Add SHAKE to Claude, ChatGPT or Cursor. Your assistant checks the deal and makes the link. It can never move the money." };

// Plain-words version of the tools in src/app/api/mcp/route.ts. Keep in sync.
const CAN = [
  ["Checks the message", "Spots the usual scam tricks in what the seller or buyer sent you."],
  ["Makes the payment link", "Item, price and seller filled in. You lock the money on your phone."],
  ["Tells you if you were paid", "Read straight from Stellar, not from a screenshot."],
  ["Finds a safe place to meet", "Public spots near the address you give it."],
] as const;

export default async function AiPage() {
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "shake-lake.vercel.app"}/api/mcp`;
  return <Screen wide back="/" right={<span className="eyebrow">Claude · ChatGPT · Cursor</span>}>
    <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_440px] lg:gap-16 lg:py-14">
      <div>
        <Mark size={54} />
        <div className="eyebrow mt-7">SHAKE inside your assistant</div>
        <h1 className="display mt-3 text-5xl leading-[1.02] lg:text-7xl">Ask your AI.<br /><span className="glacier-text">It can&apos;t touch the money.</span></h1>
        <p className="mt-5 max-w-[40ch] text-lg text-ink-2">Your assistant checks the deal and makes the link. Only your phone, next to theirs, can release it.</p>

        <Stagger delay={0.3} className="mt-8 flex max-w-[460px] flex-col gap-2.5">
          <Item className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/8 px-4 py-2.5 text-[14px] text-ink">Someone on Vinted wants €60 for a jacket. Is this message safe?</Item>
          <Item className="glass max-w-[90%] rounded-2xl rounded-bl-md px-4 py-2.5 text-[14px] text-ink-2"><span className="text-safe">SHAKE · </span>Two warning signs. Here&apos;s a safe link: you lock the €60, they see it&apos;s real, it pays when you meet.</Item>
          <Item className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/8 px-4 py-2.5 text-[14px] text-ink">Ok. Now release the money.</Item>
          <Item className="glass max-w-[90%] rounded-2xl rounded-bl-md border-safe/30 px-4 py-2.5 text-[14px] text-ink"><span className="text-safe">SHAKE · </span>I can&apos;t, and neither can any AI or server. That&apos;s the point of SHAKE. Scan their QR when you meet.</Item>
        </Stagger>

        <ul className="mt-9 grid max-w-[560px] gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
          {CAN.map(([title, what]) => <li key={title}><div className="font-display text-[16px] font-medium">{title}</div><p className="mt-0.5 text-[14px] leading-snug text-ink-2">{what}</p></li>)}
        </ul>
      </div>
      <McpConnect url={url} />
    </div>
    <TestnetNote className="mb-8" />
  </Screen>;
}
