# SHAKE: full project context

> Paste this whole file into Claude (or any AI) to give it complete context on what we're building and why.

## 1. The situation
- **Event:** HackMeridian 2026, a Stellar hackathon in Lisbon, 25–26 Oct 2026. About 1000 participants.
- **Track:** Genesis (new apps with real-world adoption).
- **Team:** Francisco and Pedro, 2 devs, about 24h to build.
- **How selection works:** only finalists pitch on stage. The first round is **self-serve**: judges open our link or QR (mostly on a phone) and judge the product and pitch with nobody explaining anything. **The website itself must win.**
- **Hard rules we set ourselves:**
  - Everything is a **web app** (no native app).
  - **Stellar testnet only**: no real money.
  - Code is written during the event (the commit history is proof for the "progress" criterion).

### Judging criteria
| Criterion | Weight | What they look for |
|---|---|---|
| Stellar integration | 20% | Meaningful use of Stellar, aligned with the track |
| Problem and user value | 20% | A real problem people actually have |
| Technical execution | 15% | Working product, good implementation |
| Innovation | 15% | Original, different from what exists |
| Hackathon progress | 10% | Show what was built during the event |
| Market potential | 10% | Can grow and attract users |
| Design and UX | 10% | Beautiful, intuitive, easy to use |

## 2. The problem
Buying and selling second-hand between strangers (OLX, Vinted, Facebook Marketplace, WhatsApp groups) is full of scams:
- **Fake payment screenshots:** "I already paid ✅", plus an edited image.
- **The MB WAY "request money" trick:** the seller is told to "accept" a payment that is actually a request, and ends up paying the scammer.
- **No-shows:** the buyer pays upfront and the seller disappears, or the reverse.

In Portugal, PSP and GNR received **4,467 MB WAY scam complaints in 2024** (via postal.pt). Banco de Portugal has issued alerts about OLX and Vinted scams. *(Re-verify all numbers and keep the sources in the README.)*

The core insight: **in these deals, proof of payment is an image, and images lie.**

## 3. The solution: SHAKE
> **"Never trust a screenshot again. Shake on it."**

**SHAKE is NOT a marketplace.** We don't list items or find buyers, and we don't compete with OLX or Vinted. SHAKE is **the safe way to pay** for a deal you already arranged anywhere else. People keep using the apps they already use; SHAKE only handles the moment the money changes hands.

**Flow:**
1. **Lock:** buyer and seller agree on the deal on OLX, Vinted or WhatsApp. The buyer opens SHAKE, types "iPhone 13, €400" and locks the money in a Stellar smart contract (escrow).
2. **Share:** SHAKE generates a link, and the buyer pastes it into the chat.
3. **Verify:** the seller opens the link and sees **"€400 locked for you ✓"**, verified on-chain. This is real, verifiable money, not a screenshot.
4. **Shake:** at the meetup the buyer checks the item and scans the seller's **one-time QR**. The money is released in about 5 seconds and is final.
5. **No deal, or timeout:** automatic refund to the buyer.

**Both sides win:**
- **Buyer:** the money only leaves when they scan with the item in hand, and a no-show means an automatic refund.
- **Seller:** never pays anything and never enters bank details; they only receive. That kills the "request money" trick. They see real locked funds before leaving home.

**"Why would anyone trust SHAKE?"** (judges will ask)
- Nobody trusts us; they trust the contract. The money never sits in our account. It waits in public code that can only do two things: pay the seller when the buyer shakes, or refund the buyer. Even we can't touch it, and anyone can verify it on Stellar Expert.
- The real risk is a phishing clone of SHAKE. Mitigations: the seller is never asked to pay or log in to a bank, we always use one official domain, and the seller can verify a deal by typing its code in the app instead of clicking the link.
- As a real company: an EU payments licence, partnerships with marketplaces and banks, and brand (the way MB WAY and PayPal built trust).

**Business model:** a small fee on protected deals. Distribution starts with a "Pay with SHAKE" link you paste into any listing or chat, then marketplace and bank integrations. The market starts in Portugal, then the EU second-hand market.

**The name** "SHAKE" is a working name. Alternatives considered: HELD ("Your money, held."), LEGIT, SEALD, TRUCE, KEPT. CLASP is taken by an existing fintech. Not final yet.

## 3b. Originality: how we avoid looking like "another escrow"
Escrow already exists on Stellar: Trustless Work (escrow infrastructure for platforms) and many hackathon "freelance marketplace + escrow" clones. Honest assessment: the escrow itself is not original. What is original, and what we sell:
1. **Proof of physical presence:** money only releases when the buyer scans the seller's live one-time QR (a hash-lock secret). It's a cryptographic handshake.
2. **Proof of payment that can't be faked:** on-chain, not a screenshot.
3. **Consumer-first, on top of OLX/Vinted/WhatsApp,** with no integration. Not B2B infrastructure.
4. **The pitch is the product.**

The rule: **never say "escrow"** in the UI or the pitch. The line is "the first payment between strangers that only releases when you meet face to face". Innovation (15%) is our weakest criterion, and UI/UX is the whole bet: an average UX means we look like another escrow and lose.

## 4. The pitch IS the product (the hidden twist)
The judges evaluate a web pitch deck, and **they use SHAKE without realising it**:
- **Slide 0, "Start":** tapping it silently creates an invisible wallet and locks €5 of **test money** in the escrow. The judge is the buyer and the team is the seller. The money never goes to the judges (no bribe perception). An honest footer reads "test network · no real money".
- **Hook:** a WhatsApp-style chat with a "Paid ✅" screenshot and the question "Do you hand over the iPhone?" Whatever they choose, the screenshot glitches and is revealed as fake. They feel the scam.
- **Problem:** 2–3 huge sourced numbers.
- **What SHAKE is:** one sentence, then Lock → Meet → Shake.
- **Product in action:** a video of the real app on two phones.
- **Why trust it / Why Stellar:** the contract address, ~5s finality, sponsored fees, stablecoins, no wallet UX, anchors and MoneyGram as the cash-out path.
- **Market and model.**
- **Built in 24h:** a timeline and commits, plus the team.
- **"Did we convince you?"** Two options: [Hold to shake on it] (a press-and-hold ring that releases the €5) or [Not yet] (refund).
- **Reveal:** "You didn't watch a pitch. You just used SHAKE." It replays their real events (wallet created → €5 locked → released or refunded) with timestamps and Stellar Expert links, then shows a QR: "Now try it with a friend".

## 5. Tech plan
- **Web app:** Next.js (App Router) + TypeScript + Tailwind + Framer Motion, on Vercel (HTTPS is needed for the camera).
- **Routes:**
  - `/`: the pitch, which is the product
  - `/deal/new`: the buyer creates a deal and locks the money
  - `/deal/[id]`: buyer and seller views
  - `/scan/[id]`: the QR scanner
  - `/r/[id]`: a public receipt with Stellar Expert links
  - `/try`: a real two-phone demo
- **Soroban escrow contract (Rust):**
  - `lock(buyer, seller, token, amount, deal_id, expiry)`
  - `release(deal_id, secret)`: requires buyer auth plus the preimage of a hash the seller committed. The QR carries the one-time secret, so an old QR screenshot can't be reused.
  - `refund(deal_id)`: after expiry, or when the seller cancels
  - `get(deal_id)`
  - Emits events. Has unit tests.
- **Token:** testnet USDC/EURC if easy to fund; otherwise our own test asset "tEUR" wrapped as a Stellar Asset Contract (SAC).
- **Invisible wallet:** a keypair in the browser (localStorage), funded server-side via Friendbot and our distributor account. Fees are sponsored via fee-bump. The user never sees XLM, keys or popups. Passkey smart wallets (passkey-kit / OpenZeppelin smart accounts) are a stretch goal only.
- **Real time:** poll Soroban RPC events every 1–2s.
- **QR:** `qrcode` to generate, `@zxing/browser` to scan, plus a "hold to shake" fallback for single-device demos.
- **`DEMO_MODE`:** a flag only for when testnet is down. It must be clearly labelled on screen.

## 6. Design direction (UI/UX is the top priority)
- **Own identity, not a copy** of the reference decks we liked (OVRIDE, ShelfOS). We like their minimalism and liquid glass, but SHAKE needs its own look.
- **Concept: two halves that meet** (buyer and seller). Layout, motion and logo close in the centre at the shake moment.
- **One signature colour** for "safe money". Red is used **only** for the fake screenshot and scams. Everything else is neutral.
- **Real liquid glass, done properly:**
  - a solid default;
  - frosted `backdrop-filter` (with `-webkit-` prefixes for Safari);
  - SVG refraction on Chromium only.
  - Glass is for chrome (nav, buttons, sheets, the deal capsule), never for body text.
- **Signature components:** the Deal Capsule (splits and snaps shut), the Hold-to-Shake ring, the Finality Seal, a Live Receipt (the hash types itself in), the scanner viewfinder.
- **Motion:** spring-based and cinematic, but fast. Animate transform and opacity only; aim for 60fps on iPhone.
- **iPhone first** (100dvh, safe areas, thumb zone), then a cinematic desktop layout.
- **Plain language:** never say "crypto", "gas" or "seed" in the main UI. Say "locked", "released", "refunded", "proof".
- The full build prompt with all UI/UX details is in `docs/build-prompt.md`.

## 7. Official track alignment (from the HackMeridian portal)

**Builder track: Genesis** (assigned). Requirements, and how we meet each one:
- **A working PoC or MVP, not a mockup.** Real lock, release and refund transactions on testnet, across two phones.
- **Runs on Stellar Testnet.** Yes. Mainnet is not required.
- **At least one Stellar protocol feature, standard, primitive or ecosystem integration.** We use several (see below).
- **Meaningful technical work done during the event, plus an explanation of the problem, target user and value proposition.** The commit history shows the work. The pitch and README explain the rest.

**Thematic track: Stellar Composed** (we must save this on the team or submission page). It means "combine two or more ecosystem tools or projects into something new". SHAKE fits three of the portal's own example ideas:
- "Wallets people want to use: no seed phrases, no gas, no jargon"
- "Stablecoins in everyday life: connect Stellar to the ways people already pay"
- "From onchain to the bank: cash out through a Stellar anchor"

**What we compose** (this replaces the "stretch goal" framing above):
1. **Escrow:** our own Soroban escrow contract (shows the most technical work). The alternative is plugging into Trustless Work, the live Stellar escrow protocol with a REST API and testnet; that would literally match "plug into a live project such as escrow". Decide at the start. The default is our own contract, with Trustless Work as the fallback if time runs short.
2. **Wallet:** a passkey smart wallet (OpenZeppelin smart accounts / passkey-kit). Face ID or Touch ID in the browser, with no seed phrase. If it blocks us, fall back to the invisible browser keypair.
3. **Fees:** fee sponsorship through the OpenZeppelin Relayer (Stellar sponsored transactions), so users never need XLM.
4. **Money:** a stablecoin, testnet USDC or EURC (through the Stellar Asset Contract).
5. **Cash-out:** the seller can withdraw to a bank through a SEP-24 testnet anchor (testanchor.stellar.org). This shows the path to MoneyGram and real anchors.

Minimum to count as "Composed": escrow + passkey wallet + fee sponsorship. The anchor cash-out is the bonus.

**Requirements for every project (submission checklist):**
- [ ] **Public** GitHub repo. *This repo is currently private: make it public before submitting.*
- [ ] README with the project summary, problem, setup, installation, environment variables and demo instructions.
- [ ] An architecture overview of how Stellar is used: assets, **contract IDs**, anchors, wallets, integrations and APIs.
- [ ] A **public live URL** (Vercel) that judges can explore, plus a video walkthrough as a backup.
- [ ] Evidence of on-chain transactions on testnet: Stellar Expert links in the README and in the app's receipts.
- [ ] Disclosure of prior work. Before the event we only did ideation and wrote this context document and the build prompt. All code is written during the event.
- [ ] Read the event rules at app.hackmeridian.com/portal/rules (participation, submission integrity, conduct).

## 8. Order of work
1. Research the current Stellar stack and choose the simplest reliable path.
2. 3 visual directions, then the team picks one.
3. Design tokens, the glass system and the core components.
4. Contract, tests, and deployment to testnet.
5. Wallet, funding and fee-sponsorship API.
6. The deal flow: create, seller view, scan, receipt, try.
7. The pitch at `/`, wired to the real flow.
8. Motion and polish, with a design QA loop (screenshots on iPhone and desktop).
9. Edge cases, performance and accessibility.
10. README, a 60–90s demo-video script, and the submission text mapped to the judging criteria.

**Never fake the core:** the lock, release and refund must be real testnet transactions.
