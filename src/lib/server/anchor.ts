import "server-only";
import { Keypair, WebAuth } from "@stellar/stellar-sdk";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CURRENCIES, NETWORK_PASSPHRASE, TOKEN_ISSUER } from "@/lib/config";
import { UserError } from "./stellar";
import { isCentAmount } from "@/lib/amount";

/**
 * SHAKE is the issuer of its test stablecoins, so it is also their anchor (that's the Stellar model:
 * the issuer redeems its asset for fiat). Standard SEP-1 / SEP-10 / SEP-24, no database:
 * withdrawals live in signed tokens and completion is read from the chain.
 * Bank payouts are simulated on testnet and say so.
 */

const secret = () => {
  const s = process.env.SPONSOR_SECRET;
  if (!s) throw new Error("Missing env SPONSOR_SECRET");
  return s;
};
export const anchorKey = () => Keypair.fromRawEd25519Seed(createHash("sha256").update(`${secret()}:anchor-sep10`).digest());
const macKey = () => createHash("sha256").update(`${secret()}:anchor-mac`).digest();

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (data: string) => createHmac("sha256", macKey()).update(data).digest("base64url");

export function seal<T extends object>(payload: T): string {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${mac(body)}`;
}
export function open<T>(token: string): T {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) throw new UserError("Bad token", 401);
  const expected = Buffer.from(mac(body));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) throw new UserError("Bad token", 401);
  return JSON.parse(Buffer.from(body, "base64url").toString());
}

/* ---------------- SEP-10: prove you own the account ---------------- */

export const homeDomain = (req: Request) => new URL(req.url).host;

export function challenge(req: Request, account: string) {
  return WebAuth.buildChallengeTx(anchorKey(), account, homeDomain(req), 300, NETWORK_PASSPHRASE, homeDomain(req));
}

export function verify(req: Request, transaction: string) {
  const domain = homeDomain(req);
  const { clientAccountID } = WebAuth.readChallengeTx(transaction, anchorKey().publicKey(), NETWORK_PASSPHRASE, domain, domain);
  // our users' accounts have the master key as their only signer
  WebAuth.verifyChallengeTxSigners(transaction, anchorKey().publicKey(), NETWORK_PASSPHRASE, [clientAccountID], domain, domain);
  const now = Math.floor(Date.now() / 1000);
  return jwt({ iss: `https://${domain}/api/anchor/auth`, sub: clientAccountID, iat: now, exp: now + 3600 });
}

function jwt(claims: Record<string, unknown>) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(claims));
  return `${head}.${body}.${createHmac("sha256", macKey()).update(`${head}.${body}`).digest("base64url")}`;
}

export function account(req: Request): string {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const [head, body, sig] = token.split(".");
  if (!sig || createHmac("sha256", macKey()).update(`${head}.${body}`).digest("base64url") !== sig) throw new UserError("Sign in first", 401);
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  if (claims.exp < Date.now() / 1000) throw new UserError("Session expired", 401);
  return claims.sub;
}

/* ---------------- SEP-24 withdrawals ---------------- */

export type Withdrawal = { id: string; account: string; asset: string; amount: string; created: string; name?: string; iban?: string };

export const ASSET_CODES = Object.values(CURRENCIES).map((c) => c.asset);

export function newWithdrawal(acct: string, asset: string, amount: string): Withdrawal {
  if (!ASSET_CODES.includes(asset)) throw new UserError("This anchor only redeems SHAKE test currencies");
  if (!(Number(amount) > 0 && Number(amount) <= 2000)) throw new UserError("Amount must be between 0 and 2000");
  if (!isCentAmount(Number(amount))) throw new UserError("Enter an amount with up to two decimal places.");
  return { id: randomBytes(9).toString("base64url"), account: acct, asset, amount: Number(amount).toFixed(2), created: new Date().toISOString() };
}

/** The memo the user must attach when sending the money to the anchor: binds the payment to this withdrawal. */
export const memoOf = (w: Pick<Withdrawal, "id">) => createHash("sha256").update(`shake-withdraw:${w.id}`).digest();

/** IBAN check (ISO 13616 mod-97), so typos fail before any money moves. */
export function validIban(input: string) {
  const iban = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1 ? iban : null;
}
export const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;

/** Look on-chain for the user's payment to the anchor carrying this withdrawal's memo. */
export async function findPayment(w: Withdrawal) {
  const memo = memoOf(w).toString("base64");
  const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${w.account}/transactions?order=desc&limit=40`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const tx = json._embedded?.records?.find((r: { memo_type: string; memo: string; successful: boolean }) => r.memo_type === "hash" && r.memo === memo && r.successful);
  return tx ? { hash: tx.hash as string, at: tx.created_at as string } : null;
}

export function sep24Transaction(origin: string, token: string, w: Withdrawal, paid: { hash: string; at: string } | null) {
  const status = paid ? "completed" : w.iban ? "pending_user_transfer_start" : "incomplete";
  return {
    id: token,
    kind: "withdrawal",
    status,
    amount_in: w.amount,
    amount_in_asset: `stellar:${w.asset}:${TOKEN_ISSUER}`,
    amount_out: w.amount,
    amount_out_asset: `iso4217:${Object.values(CURRENCIES).find((c) => c.asset === w.asset)?.code ?? "EUR"}`,
    amount_fee: "0",
    started_at: w.created,
    completed_at: paid?.at,
    stellar_transaction_id: paid?.hash,
    withdraw_anchor_account: w.iban ? TOKEN_ISSUER : undefined,
    withdraw_memo: w.iban ? memoOf(w).toString("base64") : undefined,
    withdraw_memo_type: w.iban ? "hash" : undefined,
    external_transaction_id: paid ? `SIM-${w.id.toUpperCase()}` : undefined,
    message: paid
      ? `Sandbox payout completed for ${maskIban(w.iban!)}. No bank account was credited.`
      : w.iban
        ? `Send ${w.amount} ${w.asset} to finish`
        : "Add your bank details",
    more_info_url: `${origin}/anchor/withdraw?t=${encodeURIComponent(token)}`,
    to: w.iban ? maskIban(w.iban) : undefined,
  };
}
