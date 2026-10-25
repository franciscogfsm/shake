import { NextResponse } from "next/server";
import { readDeal, readEvents } from "@/lib/server/stellar";
import { errorResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^\d{1,16}$/.test(id)) return NextResponse.json({ error: "Not a deal" }, { status: 400 });
    const deal = await readDeal(id);
    if (!deal) return NextResponse.json({ deal: null, events: [] }, { status: 404 });
    const events = await readEvents(id, deal.expiry).catch((e) => (console.error("events", e), []));
    return NextResponse.json({ deal, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
