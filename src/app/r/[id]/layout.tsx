import type { Metadata } from "next";
import { dealMoney } from "@/lib/config";
import { previewStatus } from "@/lib/kinds";
import { readDeal } from "@/lib/server/stellar";

export const dynamic = "force-dynamic";


/** Titles for link previews come from the chain, not from the URL, so nobody can fake them. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = /^\d{1,16}$/.test(id) ? await readDeal(id).catch(() => null) : null;
  if (!deal) return { title: "Deal" };
  const status = previewStatus(deal);
  const title = `${dealMoney(deal.amount, deal.token)} ${status}${deal.memo ? ` · ${deal.memo}` : ""}`;
  const description = "Real money on the Stellar network, not a screenshot. Meet, scan, and it's paid.";
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default function ReceiptLayout({ children }: { children: React.ReactNode }) {
  return children;
}
