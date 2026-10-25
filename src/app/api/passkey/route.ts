import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { UserError, isCurrency, mintTo, submitCall } from "@/lib/server/stellar";

export const runtime = "nodejs";

// deploy: submit the kit's signed deployment of an OpenZeppelin smart account (fee sponsored, zero XLM)
// fund:   mint test money into the smart account (no trustline needed for C… addresses)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body?.action === "deploy") {
      if (typeof body.func !== "string" || !Array.isArray(body.auth)) throw new UserError("Missing deployment");
      return NextResponse.json(await submitCall(body.func, body.auth));
    }
    if (body?.action === "fund") {
      const currency = body.currency ?? "EUR";
      if (!isCurrency(currency)) throw new UserError("Unsupported currency");
      return NextResponse.json({ hash: (await mintTo(String(body.contractId), Number(body.amount), currency)).hash });
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
