"use client";
import type { SmartAccountKit } from "smart-account-kit";
import type { xdr } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE, PASSKEY, RPC_URL, type CurrencyCode } from "@/lib/config";

/**
 * The Face ID wallet: an OpenZeppelin smart account on Stellar whose only signer is a passkey.
 * No key to lose, no XLM: our /api/passkey route deploys it (fee sponsored) and funds it with test money.
 */
const KEY = "shake.passkey.v1";
type Saved = { credentialId: string; contractId: string };

let kit: SmartAccountKit | null = null;
async function getKit() {
  if (kit) return kit;
  const { SmartAccountKit, LocalStorageAdapter } = await import("smart-account-kit");
  kit = new SmartAccountKit({
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    accountWasmHash: PASSKEY.accountWasmHash,
    webauthnVerifierAddress: PASSKEY.webauthnVerifier,
    relayerUrl: `${location.origin}/api/passkey`,
    allowedOrigins: [location.origin],
    storage: new LocalStorageAdapter("shake.passkey.kit"),
  });
  return kit;
}

function saved(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

/** The smart account (C… address) on this phone, if the user made one. */
export const passkeyAddress = () => saved()?.contractId ?? null;

export const passkeySupported = () => typeof window !== "undefined" && !!window.PublicKeyCredential && window.isSecureContext;

/** Face ID once: create the passkey, deploy its smart account. Reuses the existing one if there is one. */
export async function ensurePasskeyWallet() {
  const have = saved();
  if (have) return have.contractId;
  const k = await getKit();
  const res = await k.createWallet("SHAKE", `SHAKE ${new Date().toLocaleDateString()}`, { autoSubmit: true });
  if (!res.submitResult?.success) throw new Error(res.submitResult && "error" in res.submitResult ? String(res.submitResult.error) : "Couldn't create your Face ID wallet.");
  localStorage.setItem(KEY, JSON.stringify({ credentialId: res.credentialId, contractId: res.contractId }));
  return res.contractId;
}

export async function fundPasskeyWallet(contractId: string, amount: number, currency: CurrencyCode, payIn: CurrencyCode = currency) {
  const res = await fetch("/api/passkey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "fund", contractId, amount, currency, payIn }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Couldn't add test money.");
  return json.hash as string;
}

const countCalls = (i: xdr.SorobanAuthorizedInvocation): number => 1 + i.subInvocations().reduce((n, s) => n + countCalls(s), 0);

/** Face ID signs one authorization entry. The account wants one rule id per call in the tree; rule 0 is its default (the passkey). */
export async function signWithPasskey(entry: xdr.SorobanAuthorizationEntry, expiration: number) {
  const s = saved();
  if (!s) throw new Error("No Face ID wallet on this phone");
  const k = await getKit();
  if (k.contractId !== s.contractId) await k.connectWallet({ credentialId: s.credentialId, contractId: s.contractId });
  const contextRuleIds = Array(countCalls(entry.rootInvocation())).fill(0);
  return k.signAuthEntry(entry, { credentialId: s.credentialId, expiration, contextRuleIds });
}
