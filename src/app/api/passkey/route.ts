import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, isCurrency, mintTo, submitCall } from "@/lib/server/stellar";

export const runtime = "nodejs";

// smart-account-kit relayer protocol: body {func, auth} → {success, hash}. Deploys an OpenZeppelin
//   smart account for a new passkey, fee sponsored (submitCall only accepts our deal calls + that WASM).
// fund: mint test money into the smart account (no trustline needed for C… addresses)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body?.action === "fund") {
      const currency = body.currency ?? "EUR";
      if (!isCurrency(currency)) throw new UserError("Unsupported currency");
      return NextResponse.json({ hash: (await mintTo(String(body.contractId), Number(body.amount), currency)).hash });
    }
    if (typeof body?.func === "string" && Array.isArray(body.auth)) {
      const r = await submitCall(body.func, body.auth);
      return NextResponse.json({ success: true, hash: r.hash, status: r.status });
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
