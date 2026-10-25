import "server-only";
import { nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { DEAL_CONTRACT_ID, PAST_DEAL_CONTRACT_IDS } from "@/lib/config";
import { readDeal, server } from "./stellar";
import { currencyTotals } from "@/lib/totals";

/**
 * A tiny in-memory index of the contract's public events (no database):
 * powers the live per-asset protected totals and on-chain reputation.
 * RPC returns a bounded ledger range per call, so we walk the window in chunks and cache briefly.
 */
export type IndexedEvent = { type: "locked" | "accepted" | "released" | "refunded" | "shipped" | "delivered" | "disputed" | "resolved"; dealId: string; who: string; amount: bigint; token?: string; at: string; ledger: number; txHash: string };

const LOOKBACK_LEDGERS = 3 * 17_280; // ~3 days
const CONTRACTS = [...new Set([DEAL_CONTRACT_ID, ...PAST_DEAL_CONTRACT_IDS])];
const CHUNK = 9_000;
let cache: { at: number; events: IndexedEvent[]; latest: number } | null = null;
let inflight: Promise<IndexedEvent[]> | null = null;

async function scan(): Promise<IndexedEvent[]> {
  const health = await server.getHealth();
  const from = Math.max(health.oldestLedger + 1, health.latestLedger - LOOKBACK_LEDGERS);
  // incremental: only fetch ledgers after the last scan
  const start = cache ? Math.max(from, cache.latest - 5) : from;
  const found: IndexedEvent[] = cache ? cache.events.filter((e) => e.ledger >= from && e.ledger < start) : [];
  for (let s = start; s <= health.latestLedger; s += CHUNK) {
    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
      const res = cursor
        ? await server.getEvents({ cursor, filters: [{ type: "contract", contractIds: CONTRACTS }], limit: 200 })
        : await server.getEvents({ startLedger: s, endLedger: Math.min(s + CHUNK, health.latestLedger + 1), filters: [{ type: "contract", contractIds: CONTRACTS }], limit: 200 });
      for (const e of res.events) {
        const type = String(scValToNative(e.topic[0])) as IndexedEvent["type"];
        const data = scValToNative(e.value) ?? {};
        found.push({
          type,
          dealId: String(scValToNative(e.topic[1])),
          who: String(scValToNative(e.topic[2])),
          amount: BigInt(data.amount ?? 0),
          token: data.token ? String(data.token) : undefined,
          at: e.ledgerClosedAt,
          ledger: e.ledger,
          txHash: e.txHash,
        });
      }
      if (res.events.length < 200) break;
      cursor = res.cursor;
    }
  }
  const seen = new Set<string>();
  const unique = found.filter((e) => {
    const k = `${e.txHash}:${e.type}:${e.dealId}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  cache = { at: Date.now(), events: unique, latest: health.latestLedger };
  return unique;
}

export async function allEvents(maxAgeMs = 10_000) {
  if (cache && Date.now() - cache.at < maxAgeMs) return cache.events;
  inflight ??= scan().finally(() => (inflight = null));
  return inflight;
}

export async function stats() {
  const ev = await allEvents();
  const closed = new Map<string, "released" | "refunded" | "resolved">();
  for (const e of ev) if (e.type === "released" || e.type === "refunded" || e.type === "resolved") closed.set(e.dealId, e.type);
  let deals = 0;
  for (const e of ev) {
    if (e.type !== "locked") continue;
    deals++;
  }
  const locks = new Map(ev.filter((e) => e.type === "locked").map((e) => [e.dealId, e]));
  const released = [...closed.values()].filter((v) => v === "released").length;
  return {
    deals,
    released,
    refunded: closed.size - released,
    ...currencyTotals(ev),
    recent: ev
      .slice(-12)
      .reverse()
      .map((e) => ({ type: e.type, dealId: e.dealId, amount: e.amount.toString(), at: e.at, txHash: e.txHash })),
    // the proof wall: real deals that ended, each with its own transaction to open
    shakes: ev
      .filter((e) => (e.type === "released" || e.type === "refunded") && locks.get(e.dealId)?.token)
      .slice(-12)
      .reverse()
      .map((e) => ({ type: e.type, amount: locks.get(e.dealId)!.amount.toString(), token: locks.get(e.dealId)!.token!, at: e.at, txHash: e.txHash })),
    windowDays: 3,
  };
}

/** "14 deals shaken · 0 cancelled", computed from public events for any address. */
export async function reputation(address: string) {
  const ev = await allEvents();
  const sellerOf = new Map<string, string>();
  const buyerOf = new Map<string, string>();
  for (const e of ev) {
    if (e.type === "locked") buyerOf.set(e.dealId, e.who);
    if (e.type === "accepted") sellerOf.set(e.dealId, e.who);
  }
  // a deposit handed back on time is a kept promise, not a walk-away
  const refundedIds = ev.filter((e) => e.type === "refunded" && sellerOf.has(e.dealId) && (sellerOf.get(e.dealId) === address || buyerOf.get(e.dealId) === address)).map((e) => e.dealId);
  const holds = new Set((await Promise.all(refundedIds.map((id) => readDeal(id).catch(() => null)))).filter((d) => d?.mode === "Hold").map((d) => d!.id));
  let shaken = 0;
  let cancelled = 0;
  let opened = 0;
  for (const e of ev) {
    const involved = buyerOf.get(e.dealId) === address || sellerOf.get(e.dealId) === address;
    if (!involved) continue;
    if (e.type === "locked") opened++;
    if (e.type === "released" || e.type === "resolved" || (e.type === "refunded" && holds.has(e.dealId))) shaken++;
    // a cancellation counts against whoever walked away: the seller if they had joined, otherwise the buyer
    if (e.type === "refunded" && !holds.has(e.dealId)) {
      const blame = sellerOf.get(e.dealId) ?? buyerOf.get(e.dealId);
      if (blame === address) cancelled++;
    }
  }
  return { address, shaken, cancelled, deals: opened, windowDays: 3 };
}

export const dealTopic = (id: string) => nativeToScVal(BigInt(id), { type: "u64" }).toXDR("base64");
