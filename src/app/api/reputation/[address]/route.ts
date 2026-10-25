import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { reputation } from "@/lib/server/ledger";
import { isPublicKey } from "@/lib/server/stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params;
    if (!isPublicKey(address) && !/^C[A-Z2-7]{55}$/.test(address)) return NextResponse.json({ error: "Not an address" }, { status: 400 });
    return NextResponse.json(await reputation(address), { headers: { "Cache-Control": "public, max-age=10" } });
  } catch (e) {
    return errorResponse(e);
  }
}
