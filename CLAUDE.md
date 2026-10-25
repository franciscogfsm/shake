# CLAUDE.md: instructions for Claude Code on SHAKE

Read `CONTEXT.md` (the full project context) and `docs/build-prompt.md` (the detailed UI/UX and build spec) before doing anything.

## Start here (every new session)
1. **`docs/plan.md`**: the current status, the locked decisions, the contract spec and the next step. Update its checkboxes and its "Now" line as work lands.
2. **`docs/design-system.md`**: the LOCKED visual system (Graphite Glacier: tokens, fonts, glass, the split-coin mark, motion). The reference page is `design/reference.html`.
3. **`docs/research.md`**: the verified stack versions and sources.

Locked decisions (the team chose them; don't reopen):
- **Design:** Graphite Glacier. Glacier blue `#8fd3ff` is safe money, on graphite `#0d0f12`. Fonts are Satoshi (display), Inter (text) and JetBrains Mono.
- **Contract:** `soroban-sdk 29.0.1` (testnet protocol 29).
- **Wallet:** `@stellar/stellar-sdk 16.3.x`, because smart-account-kit needs it.
- **Money:** tEUR, our own asset, wrapped as a SAC.
- **Fees:** OpenZeppelin Channels on testnet.
- **Wallet order:** an invisible keypair with sponsored reserves first, then a passkey smart account (time-boxed).

## What we're building
SHAKE is the safe way to pay strangers for second-hand deals arranged elsewhere (OLX, Vinted, WhatsApp). It is **not a marketplace**:
1. The buyer locks stablecoins in a Soroban escrow.
2. The seller sees the real locked funds on-chain.
3. At the meetup the buyer scans the seller's one-time QR, and the money is released in about 5s.
4. Otherwise the buyer gets a refund.

The web pitch at `/` is secretly the product: judges lock €5 of test money without realising it, then "shake" or refund, then see the reveal.

## Positioning (critical: read twice)
Escrow already exists on Stellar: Trustless Work, plus dozens of "freelance marketplace with escrow" hackathon clones. If judges see "another escrow", we lose. So:
- **Never say "escrow"** in the UI or the pitch. Say: **"the first payment between strangers that only releases when you meet face to face."** Escrow is an implementation detail, mentioned only in the README architecture.
- **Our innovation (sell this):**
  1. **Proof of physical presence.** Release requires the preimage of a one-time secret that only exists inside the seller's live QR (a hash-lock). Money moves only when the two phones are in the same place. It's a cryptographic handshake, like cash but digital.
  2. **Unfakeable proof.** The seller verifies real locked funds on-chain, not a screenshot.
  3. **Consumer-first, on top of the apps people already use** (OLX, Vinted, WhatsApp), with zero integration. Not infrastructure for platforms.
  4. **The pitch is the product.** Judges use SHAKE without knowing, then see the reveal.
- **Weakest criterion = Innovation (15%).** Every design and copy decision should make the four points above obvious within seconds.

## UI/UX is the whole bet
The biggest risk: if the UX is average, SHAKE looks like "another escrow" and loses. Most hackathon projects look like crypto dashboards; SHAKE must look and feel like an Apple-designed consumer app. Non-negotiables:
- **Instantly understood.** A judge with zero context understands what SHAKE does in 5 seconds and how to try it in 10. One idea per screen. Huge, clear type. No jargon.
- **Its own identity.** It must not look like a template, shadcn defaults or a copy of other decks. The concept is "two halves that meet". The direction is locked: see `docs/design-system.md`.
- **Real liquid glass** done properly (see `docs/build-prompt.md` §4.4), only on chrome, never on body text.
- **Signature moments must be breathtaking:**
  - the fake-screenshot glitch;
  - "€X locked for you ✓" on the seller's phone;
  - the hold-to-shake slam (the two halves snap together, light burst, seal);
  - the reveal "You didn't watch a pitch. You just used SHAKE."
- **Every state is designed:** loading (with real step names), success, error, empty, slow network, camera denied, expired QR. No browser-default UI, no spinners without meaning.
- **Motion:** springs, choreographed staggers, shared-layout transitions. Fast (no animation blocks the user for more than about 900ms). 60fps on iPhone. Respect reduced motion.
- **iPhone Safari first**, then a cinematic desktop.
- **Design QA loop after every screen:** Playwright screenshots at 393×852 and 1440×900, an honest critique as an Apple design reviewer, fix, repeat. Don't move on from a screen that isn't excellent.

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
  1. our own Soroban **hash-locked** deal contract: `release` requires buyer auth plus the preimage of the seller's one-time QR secret; refund after expiry. This is the core innovation. Fallback if time runs out: Trustless Work escrow API;
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
- **Stellar Raven MCP** (`stellar-raven`, installed at user scope and authenticated): use it FIRST for any Stellar or Soroban question (SDK versions, RPC, SAC, fee-bump, passkeys, anchors, SEPs). Don't rely on memory for the Stellar APIs; they change.
- **OpenZeppelin skills and Contracts MCP:** use them for Stellar contract setup and for OpenZeppelin Stellar libraries (smart accounts, tokens).
- **Playwright MCP:** after every major screen, screenshot it at 393×852 (iPhone) and 1440×900, review it critically like an Apple design reviewer, fix the issues and repeat.
- **Context7 MCP** (if installed): use it for up-to-date Next.js, Framer Motion and Tailwind docs.

## Stack
- Next.js (App Router), TypeScript, Tailwind, Framer Motion, deployed on Vercel.
- Soroban contract in Rust (`contracts/escrow`), using `@stellar/stellar-sdk`.
- `qrcode` to generate QR codes and `@zxing/browser` to scan them.

## Working rules
- On Windows the Stellar CLI is at `C:\Program Files (x86)\Stellar CLI\stellar.exe`. Playwright 1.48 with Chromium is installed in `%TEMP%\shotpw` for screenshots.
- Small working increments. Commit often with clear messages; the commit history is the evidence of hackathon progress.
- The 3 visual directions were shown and the team picked **Graphite Glacier** (25 Oct). Build straight from `docs/design-system.md`.
- iPhone Safari first. 60fps. Animate only transform and opacity. Real liquid glass with fallbacks (see `docs/build-prompt.md` §4.4).
- Never use the words crypto, gas or seed in the user-facing UI.
- Secrets live only in `.env.local`, never committed. Keep `.env.example` up to date.
- If something is risky for 24h, say so and propose the simpler path.
