import { account, findPayment, open, sep24Transaction, type Withdrawal } from "@/lib/server/anchor";
import { UserError } from "@/lib/server/stellar";
import { CORS, fail, json } from "../../cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SEP-24: status of one withdrawal; "completed" once the user's payment with our memo is on-chain. */
export async function GET(req: Request) {
  try {
    const acct = account(req);
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const w = open<Withdrawal>(id);
    if (w.account !== acct) throw new UserError("Not your withdrawal", 403);
    const paid = w.iban ? await findPayment(w) : null;
    return json({ transaction: sep24Transaction(new URL(req.url).origin, id, w, paid) });
  } catch (e) {
    return fail(e);
  }
}
export const OPTIONS = () => new Response(null, { headers: CORS });
