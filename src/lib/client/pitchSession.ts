"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { TOKEN_CONTRACT_ID, newDealId, toUnits } from "@/lib/config";
import { ApiError, callDeal, ensureAccount, getKeypair, pitchApi } from "./wallet";

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

  const update = useCallback((patch: Partial<PitchSession>) => {
    ref.current = { ...ref.current, ...patch };
    setS(ref.current);
    try {
      localStorage.setItem(KEY, JSON.stringify(ref.current));
    } catch {}
  }, []);

  const now = () => new Date().toISOString();

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

  const shake = useCallback(async () => {
    const id = ref.current.dealId!;
    const { secret } = await pitchApi.secret(id);
    const res = await callDeal(getKeypair(), "release", { dealId: id, secret });
    update({ status: "done", outcome: "released", settled: { at: now(), hash: res.hash } });
  }, [update]);

  const notYet = useCallback(async () => {
    const res = await pitchApi.refund(ref.current.dealId!);
    update({ status: "done", outcome: "refunded", settled: { at: now(), hash: res.hash ?? null } });
  }, [update]);

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
  }, [start]);

  return { session: s, start, shake, notYet, reset };
}
