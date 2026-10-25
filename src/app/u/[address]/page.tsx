import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Mark } from "@/components/Mark";
import { Item, Screen, Stagger } from "@/components/ui";
import { explorer } from "@/lib/config";
import { reputation } from "@/lib/server/ledger";

export const dynamic = "force-dynamic";

const valid = (a: string) => /^[GC][A-Z2-7]{55}$/.test(a);
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  if (!valid(address)) return { title: "Reputation" };
  const r = await reputation(address).catch(() => null);
  const title = r ? `${r.shaken} deals shaken · ${r.cancelled} walked away` : "Reputation";
  return { title, description: "Read from the Stellar network. Nobody can edit it, not even SHAKE." };
}

/** Public track record, counted from contract events: it can't be bought, faked or deleted. */
export default async function Reputation({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const r = valid(address) ? await reputation(address).catch(() => null) : null;
  return (
    <Screen wide fit back="/">
      <Stagger className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 pb-10 text-center lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-0 lg:text-left">
        <Item className="flex flex-col items-center gap-8 lg:items-start">
          <Mark size={88} state={r && r.shaken > 0 ? "shut" : "open"} />
        {r ? (
          <div>
            <div className="eyebrow">Track record · {short(address)}</div>
            <div className="amount mt-4 text-[96px] leading-none lg:text-[120px]">{r.shaken}</div>
            <p className="mt-2 text-lg text-ink-2">{r.shaken === 1 ? "deal shaken" : "deals shaken"}</p>
          </div>
        ) : (
          <div>
            <h1 className="display text-[30px] lg:text-[48px]">That isn&apos;t a SHAKE address.</h1>
            <p className="mt-2 text-ink-2">Check the link with the person who sent it.</p>
          </div>
        )}
        </Item>
        {r && (
          <Item className="relative flex w-full flex-col items-center gap-6 lg:items-stretch">
            <div className="halo hidden lg:block" aria-hidden />
            <div className="glass grid w-full grid-cols-2 divide-x divide-white/10 p-5 lg:p-8">
              <div><div className="amount text-[34px] lg:text-[48px]">{r.deals}</div><div className="text-[13px] text-mute">deals locked</div></div>
              <div><div className={`amount text-[34px] lg:text-[48px] ${r.cancelled ? "text-danger" : ""}`}>{r.cancelled}</div><div className="text-[13px] text-mute">walked away</div></div>
            </div>
            <p className="text-[14px] text-ink-2">Counted from the last {r.windowDays} days of Stellar network events. Nobody can edit it, not even SHAKE.</p>
            <a href={explorer.account(address)} target="_blank" rel="noreferrer" className="text-sm text-mute hover:text-safe">See this address on Stellar ↗</a>
            <Link href="/deal/new" className="contents"><Button full variant="glass">Start a safe deal</Button></Link>
          </Item>
        )}
      </Stagger>
    </Screen>
  );
}
