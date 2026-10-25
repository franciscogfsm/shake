"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { TOKEN_CONTRACT_ID, newDealId, toUnits } from "@/lib/config";
import { ApiError, callDeal, ensureAccount, getKeypair, pitchApi } from "./wallet";
import type { Deal, DealEvent } from "./useDeal";

/**
 * The hidden product inside the pitch: pressing Start silently creates a wallet,
 * funds it with €5 of test money and locks it in a deal where the SHAKE team is the seller.
 * Everything is recorded (time + tx hash) for the reveal, and persisted so a refresh keeps it.
 */
export type Step = { at: string; hash?: string | null };
export type PitchSession = {
  status: "idle" | "working" | "ready" | "failed" | "done";
  dealId?: string;
  wallet?: Step;
  locked?: Step;
  joined?: Step;
  outcome?: "released" | "refunded";
  settled?: Step;
  error?: string;
};

const KEY = "shake.pitch.v1";
const EUROS = 5;
const load = (): PitchSession => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "") as PitchSession;
  } catch {
    return { status: "idle" };
  }
};

export function usePitchSession() {
  const [s, setS] = useState<PitchSession>({ status: "idle" });
  const ref = useRef(s);
  const running = useRef(false);
  const settlingRef = useRef(false);
  const [settling, setSettling] = useState(false);

  const update = useCallback((patch: Partial<PitchSession>) => {
    ref.current = { ...ref.current, ...patch };
    setS(ref.current);
    try {
      localStorage.setItem(KEY, JSON.stringify(ref.current));
    } catch {}
  }, []);

  const now = () => new Date().toISOString();

  // localStorage can outlive a transaction response, a tab, or a deployment.
  // Always use the chain to decide whether the demo can still be settled.
  const reconcile = useCallback(async () => {
    const id = ref.current.dealId;
    if (!id) throw new ApiError("Start a demo before shaking.");
    const res = await fetch(`/api/deal/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.deal) throw new ApiError(json.error ?? "We couldn't load this deal. Try again.");
    const deal = json.deal as Deal;
    if (deal.status === "Released" || deal.status === "Refunded") {
      const outcome = deal.status === "Released" ? "released" : "refunded";
      const event = (json.events as DealEvent[] | undefined)?.find((e) => e.type === outcome);
      update({
        status: "done", outcome, error: undefined,
        settled: event ? { at: event.at, hash: event.txHash } : ref.current.settled,
      });
    }
    return deal;
  }, [update]);

  /** Idempotent: resumes from whatever step a previous attempt (or a refresh) reached. */
  const start = useCallback(async () => {
    if (running.current) return;
    const cur = ref.current;
    if (cur.status === "ready" || cur.status === "done") return;
    running.current = true;
    update({ status: "working", error: undefined });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const kp = getKeypair();
        if (!ref.current.wallet) {
          const at = now();
          const hash = await ensureAccount(kp, EUROS);
          update({ wallet: { at, hash } });
        }
        if (!ref.current.locked) {
          const dealId = ref.current.dealId ?? newDealId();
          update({ dealId });
          const at = now();
          const expiry = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
          const res = await callDeal(kp, "lock", { buyer: kp.publicKey(), token: TOKEN_CONTRACT_ID, amount: toUnits(EUROS).toString(), dealId, expiry, memo: "SHAKE pitch" }).catch((e) => {
            // a retry after a timeout may find the deal already locked
            if (e instanceof ApiError && /already exists/.test(e.message)) return { hash: null };
            throw e;
          });
          update({ locked: { at, hash: res.hash } });
        }
        if (!ref.current.joined) {
          const res = await pitchApi.accept(ref.current.dealId!);
          update({ joined: { at: now(), hash: res.hash ?? null } });
        }
        update({ status: "ready" });
        break;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "The network is slow.";
        update({ status: "failed", error: msg });
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        if (attempt < 2) update({ status: "working" });
      }
    }
    running.current = false;
  }, [update]);

  const settle = useCallback(async (outcome: "released" | "refunded") => {
    if (settlingRef.current) return;
    settlingRef.current = true;
    setSettling(true);
    update({ error: undefined });
    try {
      const deal = await reconcile();
      if (deal.status === "Released" || deal.status === "Refunded") return;
      let hash: string | null;
      if (outcome === "released") {
        const kp = getKeypair();
        if (deal.buyer !== kp.publicKey()) throw new ApiError("Open this demo in the browser where you started it.");
        const { secret } = await pitchApi.secret(deal.id);
        hash = (await callDeal(kp, "release", { dealId: deal.id, secret })).hash;
      } else {
        hash = (await pitchApi.refund(deal.id)).hash ?? null;
      }
      update({ status: "done", outcome, settled: { at: now(), hash } });
    } catch (e) {
      // Another tab may have settled the deal, or a successful submission's
      // response may have been lost. Recover its actual outcome before retrying.
      const deal = await reconcile().catch(() => null);
      if (deal?.status === "Released" || deal?.status === "Refunded") return;
      update({ error: e instanceof Error ? e.message : "The network is slow. Try again." });
      throw e;
    } finally {
      settlingRef.current = false;
      setSettling(false);
    }
  }, [reconcile, update]);

  const shake = useCallback(() => settle("released"), [settle]);
  const notYet = useCallback(() => settle("refunded"), [settle]);

  const reset = useCallback(() => {
    ref.current = { status: "idle" };
    setS(ref.current);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  // restore and resume an interrupted run after a refresh
  useEffect(() => {
    ref.current = load();
    setS(ref.current);
    if (ref.current.status === "working" || ref.current.status === "failed") start();
    if (ref.current.status === "ready") void reconcile().catch(() => {});
  }, [start, reconcile]);

  return { session: s, start, shake, notYet, reset, settling };
}
