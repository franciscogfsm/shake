"use client";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "@/lib/config";

/**
 * A standard SEP-1 → SEP-10 → SEP-24 wallet client. It talks to the anchor only through
 * what the anchor publishes in its stellar.toml, so it works with any SEP-24 anchor.
 */
export type AnchorInfo = { auth: string; transfer: string; signingKey: string };
export type Sep24Tx = {
  id: string;
  status: string;
  amount_in: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  message?: string;
  to?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
};

export async function discover(domainOrigin: string): Promise<AnchorInfo> {
  const toml = await (await fetch(`${domainOrigin}/.well-known/stellar.toml`)).text();
  const get = (k: string) => new RegExp(`^${k}\\s*=\\s*"([^"]+)"`, "m").exec(toml)?.[1];
  const auth = get("WEB_AUTH_ENDPOINT");
  const transfer = get("TRANSFER_SERVER_SEP0024");
  const signingKey = get("SIGNING_KEY");
  if (!auth || !transfer || !signingKey) throw new Error("This anchor doesn't support SEP-24");
  return { auth, transfer, signingKey };
}

/** SEP-10: sign the anchor's challenge with our key, receive a JWT. */
export async function authenticate(a: AnchorInfo, kp: Keypair) {
  const ch = await (await fetch(`${a.auth}?account=${kp.publicKey()}`)).json();
  if (!ch.transaction) throw new Error(ch.error ?? "Anchor sign-in failed");
  const tx = TransactionBuilder.fromXDR(ch.transaction, NETWORK_PASSPHRASE);
  // the challenge must be signed by the anchor's published key before we co-sign it
  const signedByAnchor = tx.signatures.some((s) => Keypair.fromPublicKey(a.signingKey).verify(tx.hash(), s.signature()));
  if (!signedByAnchor) throw new Error("Anchor challenge has the wrong signature");
  tx.sign(kp);
  const res = await (await fetch(a.auth, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transaction: tx.toXDR() }) })).json();
  if (!res.token) throw new Error(res.error ?? "Anchor sign-in failed");
  return res.token as string;
}

export async function startWithdraw(a: AnchorInfo, jwt: string, asset: string, amount: string, account: string) {
  const body = new FormData();
  body.set("asset_code", asset);
  body.set("amount", amount);
  body.set("account", account);
  const res = await (await fetch(`${a.transfer}/transactions/withdraw/interactive`, { method: "POST", headers: { authorization: `Bearer ${jwt}` }, body })).json();
  if (!res.url) throw new Error(res.error ?? "Anchor refused the withdrawal");
  return res as { url: string; id: string };
}

export async function getTransaction(a: AnchorInfo, jwt: string, id: string): Promise<Sep24Tx> {
  const res = await (await fetch(`${a.transfer}/transaction?id=${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${jwt}` }, cache: "no-store" })).json();
  if (!res.transaction) throw new Error(res.error ?? "Anchor status unavailable");
  return res.transaction;
}
