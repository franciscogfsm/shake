"use client";
import { Address, Keypair, TransactionBuilder, authorizeEntry, xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, type CurrencyCode } from "@/lib/config";

const KEY = "shake.key.v1";

/** The invisible wallet: a key that lives only in this browser. */
export function getKeypair(): Keypair {
  let secret: string | null = null;
  try {
    secret = localStorage.getItem(KEY);
  } catch {}
  if (secret) return Keypair.fromSecret(secret);
  const kp = Keypair.random();
  try {
    localStorage.setItem(KEY, kp.secret());
  } catch {}
  return kp;
}

export const hasWallet = () => {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
};

export class ApiError extends Error {}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? "Something went wrong. Try again.");
  return json as T;
}

/** Opens the account (sponsored, zero XLM, a trustline per currency) or tops it up with test money. */
export async function ensureAccount(kp: Keypair, amount: number, currency: CurrencyCode = "EUR") {
  const prep = await post<{ ready: boolean; xdr?: string; hash?: string | null }>("/api/wallet", {
    action: "prepare",
    publicKey: kp.publicKey(),
    amount,
    currency,
  });
  if (prep.ready) return prep.hash ?? null;
  const tx = TransactionBuilder.fromXDR(prep.xdr!, NETWORK_PASSPHRASE);
  tx.sign(kp);
  const done = await post<{ hash: string }>("/api/wallet", { action: "submit", publicKey: kp.publicKey(), xdr: tx.toXDR() });
  return done.hash;
}

export type CallStep = "preparing" | "signing" | "confirming";

/** Prepare → sign only our own authorization → OpenZeppelin Channels submits and pays the fee. */
export async function callDeal(
  kp: Keypair,
  fn: "lock" | "accept" | "release" | "refund",
  args: Record<string, string>,
  onStep?: (s: CallStep) => void,
) {
  onStep?.("preparing");
  const prep = await post<{ func: string; auth: string[]; latestLedger: number }>("/api/call", { action: "prepare", fn, args });
  onStep?.("signing");
  const me = kp.publicKey();
  const auth = await Promise.all(
    prep.auth.map(async (b64) => {
      const entry = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
      const cred = entry.credentials();
      if (cred.switch().name !== "sorobanCredentialsAddress") return b64;
      if (Address.fromScAddress(cred.address().address()).toString() !== me) return b64;
      const signed = await authorizeEntry(entry, kp, prep.latestLedger + 100, NETWORK_PASSPHRASE);
      return signed.toXDR("base64");
    }),
  );
  onStep?.("confirming");
  return post<{ hash: string; status: string }>("/api/call", { action: "submit", func: prep.func, auth });
}

export const pitchApi = {
  accept: (dealId: string) => post<{ hash?: string }>("/api/pitch", { action: "accept", dealId }),
  secret: (dealId: string) => post<{ secret: string }>("/api/pitch", { action: "secret", dealId }),
  refund: (dealId: string) => post<{ hash?: string }>("/api/pitch", { action: "refund", dealId }),
};

export async function sha256Hex(hex: string) {
  const bytes = new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomSecretHex() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
