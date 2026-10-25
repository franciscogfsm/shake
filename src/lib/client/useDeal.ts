"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Deal = {
  id: string;
  buyer: string;
  seller: string | null;
  amount: string;
  expiry: number;
  status: "Locked" | "Accepted" | "Released" | "Refunded";
  hash: string | null;
};
export type DealEvent = { type: "locked" | "accepted" | "released" | "refunded"; txHash: string; at: string; ledger: number };

/** Live deal state from the chain, polled every 2s while open (the seller sees the shake within seconds). */
export function useDeal(id: string | null, { interval = 2000 } = {}) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "offline">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/deal/${id}`, { cache: "no-store" });
      if (res.status === 404) {
        setState("missing");
        return;
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setDeal(json.deal);
      setEvents(json.events ?? []);
      setState("ready");
    } catch {
      setState((s) => (s === "ready" ? s : "offline"));
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    const loop = async () => {
      await load();
      if (!alive) return;
      timer.current = setTimeout(loop, document.hidden ? interval * 3 : interval);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [load, interval]);

  return { deal, events, state, refresh: load };
}

export const eventOf = (events: DealEvent[], type: DealEvent["type"]) => events.find((e) => e.type === type);
