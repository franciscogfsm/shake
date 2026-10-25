import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, buildOnboardTx, fund, isCurrency, isPublicKey, submitOnboardTx } from "@/lib/server/stellar";
import { isCentAmount } from "@/lib/amount";

export const runtime = "nodejs";
const MAX = 2000;

// prepare: returns an unsigned onboarding tx (new account or missing trustlines), or tops up an existing one
// submit:  takes the user-signed tx, adds channel + sponsor + issuer signatures and sends it
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, publicKey } = body ?? {};
    if (!isPublicKey(publicKey)) throw new UserError("Invalid account");
    if (action === "prepare") {
      const amount = Number(body.amount ?? body.euros ?? 0);
      const currency = body.currency ?? "EUR";
      if (!isCurrency(currency)) throw new UserError("Unsupported currency");
      if (!Number.isFinite(amount) || amount < 0 || amount > MAX) throw new UserError(`Test deals go up to ${MAX}`);
      if (!isCentAmount(amount)) throw new UserError("Enter an amount with up to two decimal places.");
      const tx = await buildOnboardTx(publicKey, amount, currency);
      if (!tx) {
        const hash = amount > 0 ? await fund(publicKey, amount, currency) : null;
        return NextResponse.json({ ready: true, hash });
      }
      return NextResponse.json({ ready: false, xdr: tx.toXDR() });
    }
    if (action === "submit") {
      if (typeof body.xdr !== "string") throw new UserError("Missing transaction");
      const hash = await submitOnboardTx(body.xdr, publicKey);
      return NextResponse.json({ ready: true, hash });
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
