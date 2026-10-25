# CLAUDE.md: instructions for Claude Code on SHAKE

Read `CONTEXT.md` (the full project context) and `docs/build-prompt.md` (the detailed UI/UX and build spec) before doing anything.

## What we're building
SHAKE is the safe way to pay strangers for second-hand deals arranged elsewhere (OLX, Vinted, WhatsApp). It is **not a marketplace**:
1. The buyer locks stablecoins in a Soroban escrow.
2. The seller sees the real locked funds on-chain.
3. At the meetup the buyer scans the seller's one-time QR, and the money is released in about 5s.
4. Otherwise the buyer gets a refund.

The web pitch at `/` is secretly the product: judges lock €5 of test money without realising it, then "shake" or refund, then see the reveal.

## Hackathon: HackMeridian 2026, Genesis track + "Stellar Composed" thematic track

### Judging criteria (optimise every decision for these)
| Criterion | Weight |
|---|---|
| Stellar integration (meaningful, aligned with the track) | 20% |
| Problem and user value (a real problem) | 20% |
| Technical execution (working product) | 15% |
| Innovation (original) | 15% |
| Hackathon progress (built during the event) | 10% |
| Market potential | 10% |
| Design and UX | 10% (UI/UX is our top priority; it affects everything) |

### Hard requirements (a submission fails without these)
- A working MVP on **Stellar Testnet**, not a mockup. Lock, release and refund are **real** transactions. Never fake the core.
- **Stellar Composed:** combine 2 or more ecosystem tools. Our composition:
  1. our own Soroban escrow contract (fallback: Trustless Work escrow API);
  2. a passkey smart wallet (OpenZeppelin smart accounts / passkey-kit; fallback: an invisible browser keypair);
  3. fee sponsorship (OpenZeppelin Relayer / fee-bump), so users never need XLM;
  4. a testnet stablecoin via a SAC (USDC/EURC, or our own "tEUR");
  5. bonus: cash-out through a SEP-24 testnet anchor (testanchor.stellar.org).
- A **public** GitHub repo.
- A README with: summary, problem, setup, installation, **env vars**, demo instructions.
- An architecture section: how Stellar is used, assets, **contract IDs**, wallets, anchors, integrations, APIs.
- A **public live URL** (Vercel) plus a backup video walkthrough.
- **Evidence of on-chain txs:** Stellar Expert testnet links in the README and in the app's receipts.
- Disclose prior work. Before the event there was only ideation and docs. All code is written during the event.

## Tools to use
- **Stellar Raven MCP** (`stellar-raven`): use it FIRST for any Stellar or Soroban question (SDK versions, RPC, SAC, fee-bump, passkeys, anchors, SEPs). Don't rely on memory for the Stellar APIs; they change.
- **OpenZeppelin skills and Contracts MCP:** use them for Stellar contract setup and for OpenZeppelin Stellar libraries (smart accounts, tokens).
- **Playwright MCP:** after every major screen, screenshot it at 393×852 (iPhone) and 1440×900, review it critically like an Apple design reviewer, fix the issues and repeat.
- **Context7 MCP** (if installed): use it for up-to-date Next.js, Framer Motion and Tailwind docs.

## Stack
- Next.js (App Router), TypeScript, Tailwind, Framer Motion, deployed on Vercel.
- Soroban contract in Rust (`contracts/escrow`), using `@stellar/stellar-sdk`.
- `qrcode` to generate QR codes and `@zxing/browser` to scan them.

## Working rules
- Small working increments. Commit often with clear messages; the commit history is the evidence of hackathon progress.
- Before building the UI, show 3 visual directions and wait for the team to pick one.
- iPhone Safari first. 60fps. Animate only transform and opacity. Real liquid glass with fallbacks (see `docs/build-prompt.md` §4.4).
- Never use the words crypto, gas or seed in the user-facing UI.
- Secrets live only in `.env.local`, never committed. Keep `.env.example` up to date.
- If something is risky for 24h, say so and propose the simpler path.
