import { OG_SIZE, dealCard } from "@/lib/server/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Money locked with SHAKE";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return dealCard((await params).id);
}
