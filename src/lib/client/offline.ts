"use client";
// Paying with no signal. Each phone holds half of the key: the seller's QR secret, and the buyer's half,
// whose sha256 went on-chain at lock. At the meetup the buyer's phone shows its half as a QR; the seller's
// phone checks both against the deal it already loaded and keeps them. `settle` needs no signature, so
// whichever phone gets signal first submits it. Until the deal expires, only the seller can cancel.
import type { Keypair } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { DEAL_CONTRACT_ID } from "@/lib/config";
import { codeToHex } from "./handshake";
import type { Deal } from "./useDeal";
import { ApiError, callDeal, getKeypair, sha256Hex } from "./wallet";

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** The buyer's half. Derived from this phone's key (ed25519 signatures are deterministic), so it needs no storage. */
export async function buyerHalf(kp: Keypair, dealId: string) {
  const sig = kp.sign(new TextEncoder().encode(`SHAKE half ${DEAL_CONTRACT_ID}:${dealId}`) as Buffer);
  return hex(await crypto.subtle.digest("SHA-256", new Uint8Array(sig)));
}

/** What `lock` commits: sha256 of the buyer's half. */
export const buyerKey = async (kp: Keypair, dealId: string) => sha256Hex(await buyerHalf(kp, dealId));

export type OfflineShake = { secret: string; half: string; at: number };

/** Both halves, kept on the phone until the network has them (and after, for the "shaken with no signal" note). */
export const offlineShake = {
  get: (dealId: string): OfflineShake | null => {
    try {
      return JSON.parse(localStorage.getItem(`shake.offline.${dealId}`) ?? "null");
    } catch {
      return null;
    }
  },
  set: (dealId: string, v: OfflineShake) => {
    try {
      localStorage.setItem(`shake.offline.${dealId}`, JSON.stringify(v));
    } catch {}
  },
};

export const payPayload = (origin: string, dealId: string, half: string) => `${origin}/deal/${dealId}#paid=${half}`;

/**
 * The seller's phone checks the buyer's QR against the deal it loaded while online. Returns the kept
 * halves, or why not. Nothing here needs the network.
 */
export async function checkPay(deal: Deal, code: string | null, text: string): Promise<OfflineShake | string> {
  const m = /\/deal\/(\d+)#paid=([0-9a-f]{64})/i.exec(text);
  if (!m) return "That's not a SHAKE payment QR.";
  if (m[1] !== deal.id) return "That payment is for a different deal.";
  if (!deal.key || deal.status !== "Accepted") return "This deal can't be paid without signal.";
  if (Date.now() / 1000 >= deal.expiry) return "This deal has expired.";
  if (!code || (await sha256Hex(codeToHex(code))) !== deal.hash) return "Your QR changed. Show the new one to the buyer first.";
  const half = m[2].toLowerCase();
  if ((await sha256Hex(half)) !== deal.key) return "That payment QR doesn't match this deal.";
  return { secret: codeToHex(code), half, at: Date.now() };
}

const subscribe = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => {
    removeEventListener("online", cb);
    removeEventListener("offline", cb);
  };
};
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

/** Submits a kept offline shake as soon as this phone has signal. Either phone may win; the other just sees it paid. */
export function useOfflineSettle(deal: Deal | null, shaken: OfflineShake | null, refresh: () => Promise<void>) {
  const online = useOnline();
  const busy = useRef(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const id = deal?.id;
  const pending = !!id && !!shaken && deal.status === "Accepted";
  const send = useCallback(async () => {
    if (!id || !shaken || busy.current) return;
    busy.current = true;
    try {
      await callDeal(getKeypair(), "settle", { dealId: id, secret: shaken.secret, half: shaken.half });
      await refreshRef.current();
    } catch (e) {
      // the other phone got there first, or the deal moved on: the refresh shows it
      if (e instanceof ApiError) await refreshRef.current();
    } finally {
      busy.current = false;
    }
  }, [id, shaken]);
  useEffect(() => {
    if (!pending || !online) return;
    send();
    const t = setInterval(send, 8000);
    return () => clearInterval(t);
  }, [pending, online, send]);
  return { pending, online };
}
