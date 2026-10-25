import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, buildAnchorPayment, isPublicKey, submitAnchorPayment } from "@/lib/server/stellar";

export const runtime = "nodejs";

// prepare: unsigned payment to the anchor (memo = withdrawal id); submit: add the channel signature and send
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isPublicKey(body?.publicKey)) throw new UserError("Invalid account");
    if (body.action === "prepare") {
      const tx = await buildAnchorPayment(body.publicKey, String(body.asset), String(body.amount), String(body.memo));
      return NextResponse.json({ xdr: tx.toXDR() });
    }
    if (body.action === "submit") return NextResponse.json({ hash: await submitAnchorPayment(String(body.xdr), body.publicKey) });
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
