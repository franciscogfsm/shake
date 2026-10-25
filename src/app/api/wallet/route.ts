import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, accountExists, buildOnboardTx, fund, isPublicKey, submitOnboardTx } from "@/lib/server/stellar";

export const runtime = "nodejs";
const MAX_EUROS = 2000;

// prepare: returns an unsigned onboarding tx for a new account, or tops up an existing one
// submit:  takes the user-signed tx, adds sponsor + issuer signatures and sends it
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, publicKey } = body ?? {};
    if (!isPublicKey(publicKey)) throw new UserError("Invalid account");
    if (action === "prepare") {
      const euros = Number(body.euros ?? 0);
      if (!Number.isFinite(euros) || euros < 0 || euros > MAX_EUROS) throw new UserError(`Test deals go up to €${MAX_EUROS}`);
      if (await accountExists(publicKey)) {
        const hash = euros > 0 ? await fund(publicKey, euros) : null;
        return NextResponse.json({ ready: true, hash });
      }
      const tx = await buildOnboardTx(publicKey, euros);
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
