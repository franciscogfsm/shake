import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { stats } from "@/lib/server/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live counts and separate currency totals from the contract's public events. */
export async function GET() {
  try {
    return NextResponse.json(await stats(), { headers: { "Cache-Control": "public, max-age=5" } });
  } catch (e) {
    return errorResponse(e);
  }
}
