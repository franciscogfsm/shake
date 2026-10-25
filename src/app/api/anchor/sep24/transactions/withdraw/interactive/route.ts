import { account, newWithdrawal, seal } from "@/lib/server/anchor";
import { CORS, fail, json } from "../../../../cors";

export const runtime = "nodejs";

/** SEP-24: start an interactive withdrawal; the wallet opens `url` for the user's bank details. */
export async function POST(req: Request) {
  try {
    const acct = account(req);
    const ct = req.headers.get("content-type") ?? "";
    const body = ct.includes("json") ? await req.json() : Object.fromEntries(await req.formData());
    const w = newWithdrawal(acct, String(body.asset_code), String(body.amount ?? ""));
    const token = seal(w);
    const url = `${new URL(req.url).origin}/anchor/withdraw?t=${encodeURIComponent(token)}`;
    return json({ type: "interactive_customer_info_needed", url, id: token });
  } catch (e) {
    return fail(e);
  }
}
export const OPTIONS = () => new Response(null, { headers: CORS });
