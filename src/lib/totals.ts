type MoneyEvent = { type: string; dealId: string; amount: bigint; token?: string };

/** Quantities of different assets must never be added into one currency total. */
export function currencyTotals(events: MoneyEvent[]) {
  const closed = new Set(events.filter((e) => ["released", "refunded", "resolved"].includes(e.type)).map((e) => e.dealId));
  const totals = new Map<string, { token: string; lockedTotal: bigint; protectedNow: bigint }>();
  let openDeals = 0;
  for (const e of events) {
    if (e.type !== "locked") continue;
    const open = !closed.has(e.dealId);
    if (open) openDeals++;
    if (!e.token) continue; // Legacy events without an asset cannot be assigned a currency.
    const total = totals.get(e.token) ?? { token: e.token, lockedTotal: 0n, protectedNow: 0n };
    total.lockedTotal += e.amount;
    if (open) total.protectedNow += e.amount;
    totals.set(e.token, total);
  }
  return { openDeals, totals: [...totals.values()].map((t) => ({ token: t.token, lockedTotal: t.lockedTotal.toString(), protectedNow: t.protectedNow.toString() })) };
}
