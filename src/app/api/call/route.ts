import { NextResponse } from "next/server";
import { DEAL_FNS, UserError, dealArgs, prepareCall, submitCall } from "@/lib/server/stellar";
import { errorResponse } from "@/lib/server/http";

export const runtime = "nodejs";

// prepare: simulate a deal call and return the auth entries the user must sign
// submit:  hand func + signed auth to OpenZeppelin Channels, which pays the fee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body?.action === "prepare") {
      if (!DEAL_FNS.includes(body.fn)) throw new UserError("Unknown action");
      const args = dealArgs(body.fn, body.args ?? {});
      return NextResponse.json(await prepareCall(body.fn, args));
    }
    if (body?.action === "submit") {
      if (typeof body.func !== "string" || !Array.isArray(body.auth)) throw new UserError("Missing call");
      return NextResponse.json(await submitCall(body.func, body.auth));
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
