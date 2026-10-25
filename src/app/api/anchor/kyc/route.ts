import { open, seal, sep24Transaction, validIban, type Withdrawal } from "@/lib/server/anchor";
import { UserError } from "@/lib/server/stellar";
import { fail, json } from "../cors";

export const runtime = "nodejs";

/** The interactive page posts the bank details here; the signed token from the URL is the authorization. */
export async function POST(req: Request) {
  try {
    const { t, name, iban } = await req.json();
    const w = open<Withdrawal>(t);
    if (Date.now() - new Date(w.created).getTime() > 60 * 60 * 1000) throw new UserError("This withdrawal expired. Start again.");
    const clean = validIban(String(iban ?? ""));
    if (!clean) throw new UserError("That IBAN doesn't look right.");
    if (String(name ?? "").trim().length < 2) throw new UserError("Add the account holder's name.");
    const next: Withdrawal = { ...w, name: String(name).trim().slice(0, 60), iban: clean };
    const token = seal(next);
    return json({ transaction: sep24Transaction(new URL(req.url).origin, token, next, null) });
  } catch (e) {
    return fail(e);
  }
}
