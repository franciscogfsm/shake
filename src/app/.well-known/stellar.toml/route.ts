import { CURRENCIES, NETWORK_PASSPHRASE, TOKEN_ISSUER } from "@/lib/config";
import { anchorKey } from "@/lib/server/anchor";

export const runtime = "nodejs";

/** SEP-1: how wallets discover SHAKE's anchor (SEP-10 auth + SEP-24 withdrawals) and its test currencies. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const currencies = Object.values(CURRENCIES)
    .map(
      (c) => `[[CURRENCIES]]
code = "${c.asset}"
issuer = "${TOKEN_ISSUER}"
display_decimals = 2
name = "SHAKE test ${c.name.toLowerCase()}"
desc = "Test stablecoin used by SHAKE on the Stellar test network. No real value."
is_asset_anchored = true
anchor_asset_type = "fiat"
anchor_asset = "${c.code}"
status = "test"
`,
    )
    .join("\n");
  const toml = `NETWORK_PASSPHRASE = "${NETWORK_PASSPHRASE}"
SIGNING_KEY = "${anchorKey().publicKey()}"
WEB_AUTH_ENDPOINT = "${origin}/api/anchor/auth"
TRANSFER_SERVER_SEP0024 = "${origin}/api/anchor/sep24"
ACCOUNTS = ["${TOKEN_ISSUER}"]

[DOCUMENTATION]
ORG_NAME = "SHAKE (HackMeridian 2026 test anchor)"
ORG_URL = "${origin}"
ORG_DESCRIPTION = "The safe way to pay a stranger. Test network only."

${currencies}`;
  return new Response(toml, { headers: { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" } });
}
