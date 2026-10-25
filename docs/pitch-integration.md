# Wiring the pitch deck (`/`) to the real product

The deck is built separately. This is everything it needs from the product side: it's all done, tested on testnet, and works the same on every phone.

## The hidden deal: `usePitchSession()`

```tsx
import { usePitchSession } from "@/lib/client/pitchSession";

const { session, start, shake, notYet, reset } = usePitchSession();
```

| Call | When | What happens (all real testnet transactions) |
|---|---|---|
| `start()` | slide 0, the **Start** tap | Creates the invisible wallet (zero XLM, sponsored), funds it with €5 tEUR, locks €5, and the SHAKE team joins as seller. Runs in the background, retries 3×, survives a refresh. |
| `shake()` | slide 8, when `<HoldToShake onShake={shake} />` completes | Fetches the team's one-time secret and releases the €5 to the team. |
| `notYet()` | slide 8, **Not yet** | The team cancels and the €5 goes back to the judge. |
| `reset()` | "Start again" on the reveal | Clears the session. |

`session` is saved on the device (`localStorage`):

```ts
{
  status: "idle" | "working" | "ready" | "failed" | "done",
  dealId,
  wallet:  { at, hash },   // "Wallet created without you noticing"
  locked:  { at, hash },   // "€5 locked when you pressed Start"
  joined:  { at, hash },   // the team (seller) joined
  outcome: "released" | "refunded",
  settled: { at, hash },   // "released when you shook" / "refunded when you said not yet"
  error,
}
```

- Disable the hold ring until `status === "ready"`, and show an elegant "locking…" meanwhile. It takes about 20–30s end to end, so it finishes while the judge reads.
- On a failure the hook retries by itself. `session.error` holds a human message.

## Components to reuse (they already match the design system)

- `HoldToShake` (`@/components/HoldToShake`): the ring, the tension, the slam, the haptics. Use `onShake={shake}`; it springs back if the promise rejects.
- `Mark` / `Wordmark` (`@/components/Mark`): the coin. Pass `assemble` for the load animation, and `state="shut"` for the slam.
- `ShakeBurst`, `Seal`, `NumberTicker`, `HashTyper` (`@/components/Ticker`), `LiveReceipt` (for the reveal timeline), `Button`, `GlassSheet`.
- CSS utilities: `.glass`, `display`, `eyebrow`, `amount`, `safe-glow`, `.pulse-dot`. The background light is already in the layout.
- `explorer.tx(hash)` (`@/lib/config`) builds Stellar Expert links. The receipt for a pitch deal is at `/r/${session.dealId}`.
- `src/data/commits.json` (refresh it with `npm run commits`) holds the real commit history for the "Built in 24h" slide.
- The contract link for "Why Stellar" is `explorer.contract(DEAL_CONTRACT_ID)`.

## Facts with sources for the problem slide
See `docs/research.md`. In short:
- 4,467 MB WAY scam complaints in 2024. Of those, GNR received 3,303 (+25%) and made only 1 arrest. Source: DN/Dinheiro Vivo.
- €121bn of second-hand goods were sold in Europe in 2025. Source: Cross-Border Commerce Europe.
