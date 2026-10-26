import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, isCurrency, quoteFx } from "@/lib/server/stellar";
import { isCentAmount } from "@/lib/amount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /api/fx?from=BRL&to=EUR&amount=200 → what the buyer pays in `from` (Stellar DEX) and Reflector's rate. */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const [from, to, amount] = [q.get("from"), q.get("to"), Number(q.get("amount"))];
    if (!isCurrency(from) || !isCurrency(to) || from === to) throw new UserError("Unsupported currency");
    if (!(amount > 0 && amount <= 2000) || !isCentAmount(amount)) throw new UserError("Enter an amount between 0 and 2000.");
    const { send, rate, path } = await quoteFx(from, to, amount);
    return NextResponse.json({ send, rate, via: path.map((a) => a.code) });
  } catch (e) {
    return errorResponse(e);
  }
}
