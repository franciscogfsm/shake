import { CURRENCIES } from "@/lib/config";
import { CORS, json } from "../../cors";

export const runtime = "nodejs";

export function GET() {
  const withdraw = Object.fromEntries(Object.values(CURRENCIES).map((c) => [c.asset, { enabled: true, min_amount: 0.01, max_amount: 2000, fee_fixed: 0 }]));
  const deposit = Object.fromEntries(Object.values(CURRENCIES).map((c) => [c.asset, { enabled: false }]));
  return json({ deposit, withdraw, fee: { enabled: false }, features: { account_creation: false, claimable_balances: false } });
}
export const OPTIONS = () => new Response(null, { headers: CORS });
