# SHAKE build plan and status

The living tracker. **Update the checkboxes and the "Now" line as work lands**, so the next session knows exactly where we are.

**Now:** the contract is deployed and smoke-tested on testnet, and the Next.js 15 app is scaffolded at the repo root. Next: tokens, the glass system and the core components (step 3), then the server APIs (step 5).

**Testnet deployment (25 Oct 2026, `scripts/deploy.sh`):**
- Deal contract: `CC7QNWLSP6W6N5F6A6FB53FLGYTO74HGERKOSBOIPDS6KA5GLYDA4BMX`
- tEUR SAC: `CCFUCVE7557QSF3HPM26D6CNBNZINFGHH7LERSZXVBCAV6KYRYIVPTAR`
- tEUR issuer: `GD2U4G7UTP2356O4HAVWMICIOHJZYNBKPLQNXJ4HUBRBDYRXWSR552QJ`
- Team (pitch seller): `GANMRJYUDGU4UJBDPV2JOMEOIXFG2TIM2WC7EV5ZDQFWBLQZ5OVULLQX`
- CLI smoke test: [lock](https://stellar.expert/explorer/testnet/tx/f0e4a08c9bec79c6273bea16458bccd0fcfa0c0d7839c931d1dfd0ec309f8abc) → [accept](https://stellar.expert/explorer/testnet/tx/b95ffd9a34ac3c248dc3c140c9b9084ae45f3eff3a362f00cffadc1eac5cf3d5) → [release](https://stellar.expert/explorer/testnet/tx/a1e47d96dea9ec1a87d1e0a5cb695cf39645079afd25f2756f0cf61f6db48956)
- The secrets (issuer, sponsor, team) are only in `.env.local`. If testnet is reset, re-run `bash scripts/deploy.sh`.

## Locked decisions (don't reopen without the team)
- **Design:** Graphite Glacier, Satoshi + Inter + JetBrains Mono. See [design-system.md](design-system.md) and `design/reference.html`.
- **Stack versions** (verified 25 Oct 2026 on the live testnet and with Stellar Raven; see [research.md](research.md)):
  - testnet protocol **29**, `soroban-sdk = "29.0.1"`, Stellar CLI 28.1.0, target `wasm32v1-none`;
  - `@stellar/stellar-sdk` **16.3.x**, pinned (smart-account-kit doesn't support 17);
  - `smart-account-kit` 0.8.x for passkeys;
  - `@openzeppelin/relayer-plugin-channels` for fees through `https://channels.openzeppelin.com/testnet`.
  - On this machine the Stellar CLI is at `C:\Program Files (x86)\Stellar CLI\stellar.exe` (not on the bash PATH).
- **Money:** a classic asset **tEUR** that we issue, wrapped as a Stellar Asset Contract. 7 decimals, so €5 = `50_000_000`.
- **Fees:** OpenZeppelin Channels submits `{ func, auth }` and users never hold XLM.
  - Fallback: our sponsor account plus a fee-bump.
- **Wallet:**
  - **Core:** an invisible browser keypair. The server opens the account and its tEUR trustline using **sponsored reserves**, so the pitch's "Start" is one silent tap.
  - **Then:** an OpenZeppelin smart account with a passkey via smart-account-kit, used on `/deal/new`. Time-boxed to about 3h.
  - The contract uses `require_auth`, so it works with both.
- **Anchor cash-out** (testanchor.stellar.org, SEP-24) is a bonus, done last.
- **Fallback for the contract** if it's catastrophically late: the Trustless Work API. Not expected.

## Contract spec (`contracts/escrow`, crate `shake-deal`)
```
Deal { buyer, seller: Option<Address>, token, amount: i128, hash: Option<BytesN<32>>, expiry: u64, status }
Status = Locked | Accepted | Released | Refunded

lock(buyer, token, amount, deal_id: u64, expiry: u64)       buyer.require_auth; token.transfer(buyer → contract)
accept(deal_id, seller, hash: BytesN<32>)                     seller.require_auth; binds seller + commits sha256(secret). Re-callable before release (rotates the QR)
release(deal_id, secret: Bytes)                               buyer.require_auth; sha256(secret)==hash; transfer → seller; status Released
refund(deal_id)                                               after expiry: anyone; before expiry: seller.require_auth (cancel), or buyer.require_auth while not yet Accepted
get(deal_id) -> Deal
events: ("locked"|"accepted"|"released"|"refunded", deal_id) with amount / addresses
```
- The seller holds the item until their own phone shows "Released". That's the meetup order, so a buyer can't take the item and then refund.
- **Pitch case:** the seller is the team's address and the server calls `accept` with the team key, so the judge's "Hold to shake" can release.
- **Storage:** persistent, with the TTL bumped on every write. Unit tests cover every path, including a wrong secret, a double release, refunds before and after expiry, and a cancel after accept.

## Order of work (from build-prompt §10) and status
- [x] 1. Research and stack (`docs/research.md`)
- [x] 2. Visual direction picked: Graphite Glacier
- [ ] 3. Next.js scaffold, tokens, fonts, glass system, mark, and the core components on `/lab`:
  - DealCapsule, HoldToShake, Seal, LiveReceipt, Scanner, GlassSheet, Button, NumberTicker, HashTyper.
- [x] 4. Contract plus tests (11 passing), deployed. Was:, then a deploy script (`scripts/deploy.ts`):
  - issue tEUR, deploy the SAC, deploy the contract, write the IDs to `.env.local`.
- [ ] 5. Server APIs:
  - create a sponsored account plus trustline, fund tEUR, build and simulate a call, submit through Channels, read the deal, poll events.
- [ ] 6. Deal flow, all real on testnet:
  - `/deal/new`, `/deal/[id]` (buyer and seller), `/scan/[id]`, `/r/[id]`, `/try`, plus the OG image.
- [ ] 7. The pitch at `/`, slides 0–9, wired to the real flow.
- [ ] 8. Passkey smart account (time-boxed about 3h).
- [ ] 9. Motion and glass polish, plus the QA loop:
  - Playwright at 393×852 and 1440×900 after every screen.
- [ ] 10. Edge cases, performance, accessibility, PWA manifest and icons.
- [ ] 11. README, architecture, contract IDs, Stellar Expert links, sources, the 60–90s video script, and the submission text.
- [ ] Bonus: SEP-24 cash-out with the test anchor.

## Repo conventions
- Commit after every working increment. The history is the evidence for "hackathon progress".
- Secrets only go in `.env.local`. Keep `.env.example` current.
