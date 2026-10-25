import { challenge, verify } from "@/lib/server/anchor";
import { NETWORK_PASSPHRASE } from "@/lib/config";
import { isPublicKey, UserError } from "@/lib/server/stellar";
import { CORS, fail, json } from "../cors";

export const runtime = "nodejs";

/** SEP-10 step 1: a challenge transaction for the account to sign. */
export async function GET(req: Request) {
  try {
    const acct = new URL(req.url).searchParams.get("account");
    if (!isPublicKey(acct)) throw new UserError("account must be a G… address");
    return json({ transaction: challenge(req, acct), network_passphrase: NETWORK_PASSPHRASE });
  } catch (e) {
    return fail(e);
  }
}

/** SEP-10 step 2: verify the signed challenge, return a JWT. */
export async function POST(req: Request) {
  try {
    const { transaction } = await req.json();
    return json({ token: verify(req, transaction) });
  } catch (e) {
    return fail(e);
  }
}

export const OPTIONS = () => new Response(null, { headers: CORS });
