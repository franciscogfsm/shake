import { NextResponse } from "next/server";
import { TEAM, UserError, dealArgs, prepareCall, readDeal, sha256Hex, signTeamEntries, submitCall, teamSecret } from "@/lib/server/stellar";
import { errorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

// In the pitch the SHAKE team is the seller.
// accept: the team joins the judge's deal and commits the hash of its one-time secret
// secret: the "QR" the judge would scan in person, revealed only for team deals
export async function POST(req: Request) {
  try {
    const { action, dealId } = (await req.json()) ?? {};
    if (typeof dealId !== "string" || !/^\d{1,16}$/.test(dealId)) throw new UserError("Not a deal");
    const deal = await readDeal(dealId);
    if (!deal) throw new UserError("We couldn't find this deal.", 404);

    if (action === "accept") {
      if (deal.status === "Accepted" && deal.seller === TEAM) return NextResponse.json({ ok: true });
      const hash = sha256Hex(teamSecret(dealId));
      const prepared = await prepareCall("accept", dealArgs("accept", { dealId, seller: TEAM, hash }));
      const auth = await signTeamEntries(prepared.auth, prepared.latestLedger);
      return NextResponse.json(await submitCall(prepared.func, auth));
    }
    if (action === "secret") {
      if (deal.seller !== TEAM) throw new UserError("Only SHAKE demo deals reveal their code", 403);
      return NextResponse.json({ secret: teamSecret(dealId) });
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
