import type { Metadata } from "next";
import { readDeal } from "@/lib/server/stellar";

export const dynamic = "force-dynamic";

const euro = (units: string) => {
  const n = Number(BigInt(units)) / 1e7;
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
};

/** Titles for link previews come from the chain, not from the URL, so nobody can fake them. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const deal = /^\d{1,16}$/.test(id) ? await readDeal(id).catch(() => null) : null;
  if (!deal) return { title: "Deal" };
  const status = deal.status === "Released" ? "released ✓" : deal.status === "Refunded" ? "refunded" : "locked for you ✓";
  const title = `${euro(deal.amount)} ${status}${deal.memo ? ` · ${deal.memo}` : ""}`;
  const description = "Real money on the Stellar network, not a screenshot. Meet, scan, and it's paid.";
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default function DealLayout({ children }: { children: React.ReactNode }) {
  return children;
}
