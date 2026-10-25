# SHAKE: master build prompt

You are a world-class team in one: a principal product designer (Apple and Linear level), a motion designer, a senior full-stack engineer and a Stellar/Soroban expert. We are a 2-person team at **HackMeridian 2026** (a Stellar hackathon in Lisbon, Genesis track: new apps with real-world adoption). We have about 24 hours. Everything must be a **web app** (no native app), excellent on **iPhone Safari first** and on desktop Chrome.

The bar: **UI and UX are the most important thing.** When a judge opens the link, their first reaction should be "wow, this is a real product, how did two people make this in 24h?". Every screen, state, transition and word must feel intentional. Nothing generic, nothing template-like, no default component-library look.

---

## 0. How we are judged (optimise every decision for this)

| Criterion | Weight | What it means for us |
|---|---|---|
| Stellar integration | 20% | Real, meaningful Soroban escrow, stablecoin, sponsored fees, verifiable on Stellar Expert |
| Problem and user value | 20% | A real scam problem millions of people have, felt in the first 10 seconds |
| Technical execution | 15% | Works end to end, for real, on testnet, across two phones |
| Innovation | 15% | The pitch is secretly the product, plus the one-time QR handshake |
| Hackathon progress | 10% | Visibly built during the event (timeline, commits) |
| Market potential | 10% | Clear users, a clear business model, clear distribution |
| Design and UX | 10% (but affects everything) | Unforgettable, intuitive, zero explanation needed |

Only finalists pitch on stage. The first round is **self-serve**: judges open our link or QR (mostly on a phone) with nobody explaining anything. The website itself must win.

---

## 1. The product: SHAKE

> **Never trust a screenshot again. Shake on it.**

**Positioning (must be crystal clear everywhere):** SHAKE is **not a marketplace**. We don't list items, find buyers or compete with OLX, Vinted or Facebook. SHAKE is the **safe way to pay** for a deal you already arranged anywhere else, like a "Pay with SHAKE" link you paste into any chat or listing. People keep using the apps they already use; SHAKE only handles the moment the money changes hands. One-line explanation used in the UI: "Found it on OLX, Vinted or WhatsApp? Pay with SHAKE."

Second-hand deals between strangers (OLX, Vinted, Facebook Marketplace, WhatsApp) are full of scams: fake payment screenshots, the MB WAY "request money" trick, sellers who never show up, buyers who "already paid". SHAKE fixes this:

1. **Lock:** the buyer locks the money in a Stellar (Soroban) escrow before the meetup.
2. **Meet:** the seller sees **real locked funds on-chain**, not a screenshot.
3. **Shake:** at the meetup the buyer checks the item and scans the seller's one-time QR. The money is released in about 5 seconds and is final.
4. **No deal, or timeout:** automatic refund.

Both sides win. The buyer can't be ghosted or lose money to a no-show. The seller can't be paid with a fake. Nobody needs a crypto wallet, seed phrase or XLM.

Language rule: never say "crypto", "blockchain wallet", "gas" or "seed" in the user-facing UI. Say "money", "locked", "released", "refunded", "receipt", "proof". Stellar is visible only as proof (receipt links, the "Why Stellar" slide).

---

## 2. Research first (before writing code; report briefly with links)

1. **Stellar stack that works today:** soroban-sdk (Rust), @stellar/stellar-sdk (JS), Stellar CLI, testnet RPC, Friendbot, Stellar Asset Contract (SAC), fee-bump transactions and fee sponsorship (the OpenZeppelin Relayer "Stellar sponsored transactions" guide), and passkey smart wallets (passkey-kit / OpenZeppelin smart accounts). Check current versions and breaking changes. Choose the **simplest reliable path for 24h** and justify it in 3 lines.
2. **Real liquid glass on the web:** Apple's Liquid Glass Human Interface Guidelines, backdrop-filter recipes, SVG `feDisplacementMap` refraction (works in Chromium only; not in Safari/iOS; Firefox accepts it but renders nothing), performance limits, contrast and accessibility.
3. **Motion and interaction references:** study 5 or more best-in-class examples (apple.com product pages, Linear, Vercel Ship, Stripe Sessions, Arc, Family wallet, Rauno Freiberg's interfaces, Awwwards Sites of the Day). Extract **principles**, never copy.
4. **Problem data with sources:** MB WAY scam complaints in Portugal, Banco de Portugal alerts about OLX/Vinted scams, EU second-hand market size, OLX/Vinted/Facebook Marketplace user numbers. Every number shown on screen needs a source in the README.

---

## 3. Architecture

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion (`motion`), deployed on Vercel (HTTPS is required for the camera). QR generation with `qrcode`; scanning with `@zxing/browser` (or `BarcodeDetector` where supported, with zxing as the fallback).

**Routes**
- `/`: the interactive pitch, which is secretly the product (section 5)
- `/deal/new`: the buyer creates a deal (item, price, optional photo) and locks the funds
- `/deal/[id]`: the live deal, with role-aware views (buyer and seller)
- `/scan/[id]`: the buyer's QR scanner
- `/r/[id]`: a public, shareable receipt with the state timeline and Stellar Expert links
- `/try`: "Try it with a friend", a real two-phone deal guided end to end

**On-chain (real, Stellar testnet only, no real money)**
- Soroban escrow contract in Rust:
  - `lock(buyer, seller, token, amount, deal_id, expiry)`
  - `release(deal_id, secret)`: requires buyer auth plus the preimage of a hash committed by the seller. The seller's QR carries a one-time secret, so a screenshot of an old QR can't be reused and nobody but the buyer can release.
  - `refund(deal_id)`: after expiry, or when the seller cancels
  - `get(deal_id)`
  - It emits events for every state change. Include unit tests.
- **Token:** a testnet stablecoin. Use testnet USDC or EURC if it can be funded easily; otherwise issue our own test asset "tEUR" and wrap it as a SAC. Decide after research.
- **Invisible wallet:** a keypair created in the browser and kept in localStorage. It is funded server-side (Friendbot plus our distributor account). All fees are sponsored server-side via fee-bump. The user never sees XLM, keys or wallet popups. Passkey smart wallets are a stretch goal, only once the core is rock solid.
- **Server:** Next.js route handlers for funding, sponsorship and reading deal state. Real-time updates by polling Soroban RPC events every 1–2 s (simple and reliable).
- **`DEMO_MODE`:** a fallback flag for use **only** when testnet is down. It must be clearly labelled on screen when active and must never pretend to be real.

---

## 4. Visual identity: SHAKE must have its own, unforgettable identity

### 4.1 Concept: two halves that meet
Buyer and seller. Left and right on desktop; top and bottom on phone. Layout, motion and the logo all live in this tension, and they **close in the centre at the shake moment**. This is the signature of the brand. Every screen should feel like part of the same idea.

### 4.2 First, show me 3 directions and wait for my pick
Before building the real thing, create 3 genuinely different directions as quick static previews (one hero screen plus one deal screen each, on iPhone and desktop). For each direction show the palette, type pairing, logo mark and one motion idea, written in one line. Suggested spread (improve on these):
- **A. Paper and ink:** a warm off-white light theme, deep ink text, one signature "safe money" colour. Calm and trustworthy, like a beautifully printed receipt.
- **B. Graphite and light:** a deep graphite dark theme where glass and light do the talking. Cinematic.
- **C. Something bolder:** your own proposal, with a strong idea behind it.

Rules for every direction:
- **One** signature colour means "safe / locked / released money".
- **Red** is reserved **only** for the fake screenshot and scams.
- Everything else is neutral.

### 4.3 Design tokens (define them as CSS variables and use only these)
- **Colour:** background, surface, ink, ink-muted, line, safe (the signature colour), danger (red), plus glass tint values. Check WCAG AA contrast for all text.
- **Type:** one excellent grotesk (Geist, Inter Tight or similar) plus one mono for amounts and hashes (Geist Mono or JetBrains Mono). Use a fluid type scale with `clamp()`. Display numbers are huge (amount, 5s, €5) with tight tracking. Body text is never smaller than 16px on mobile.
- **Spacing:** a 4px base. Radii: 12 / 20 / 28 / pill.
- **Elevation:** use light and glass for depth, not heavy drop shadows.
- **Motion:** spring presets named `snappy` (UI), `smooth` (layout) and `slam` (the shake). Durations: 150ms micro, 300–450ms transitions, 600–900ms hero moments.

### 4.4 Real liquid glass, done properly
Build it in 3 rungs:
1. **Solid and readable** as the default.
2. **Frosted glass** inside `@supports`: `backdrop-filter: blur() saturate(160–190%)` with the `-webkit-` prefix, and with hard-coded values in the prefixed declaration, because Safari doesn't resolve CSS variables there.
3. **Refraction** with an SVG `feDisplacementMap` lens on Chromium desktop only, gated by user-agent detection.

Details that make it real:
- a bright rim highlight (gradient border via a mask)
- an inner top highlight
- a specular sheen that follows the pointer, or the gyroscope on iPhone after a DeviceOrientation permission tap
- a subtle 3D tilt
- a soft coloured glow picked up from the content behind

Rules:
- Glass is for **chrome**: nav, dock, bottom sheets, the deal capsule, buttons, toasts. It is **never** used for paragraph text.
- At most 3–4 glass layers per view.
- Glass needs something rich behind it, so design the backgrounds: slow-moving soft gradient blobs, a subtle grain, light leaks.
- Never animate blur radius. Animate transform and opacity only.

### 4.5 Logo and brand moments
- Design a simple mark that expresses two halves joining (two shapes that interlock, or a split circle that closes).
- On load, the mark assembles itself.
- On a successful release, it snaps shut.
- Make a favicon, an OG image (for link previews in WhatsApp and iMessage, since judges share links) and an app icon for "Add to Home Screen" (PWA manifest).

---

## 5. The pitch is the product (the hidden twist)

Judges must **not** realise they're using SHAKE until the end.

### Slides

**Slide 0, Start.** A beautiful, minimal intro: the logo assembles, then the tagline. Tapping "Start" silently:
1. creates the invisible wallet,
2. funds it,
3. locks €5 of test money in the escrow, with the judge as buyer and the SHAKE team as seller.

A tiny, honest footer line reads "test network · no real money". The money never goes to the judges, so there's no bribe perception.

**Slide 1, Hook.** A pixel-perfect WhatsApp-style chat (not branded as WhatsApp) between a buyer and seller about an iPhone. The buyer says "Paid ✅" and sends a payment screenshot. The question: "Do you hand over the iPhone?" Two buttons: **[Hand it over]** and **[Wait]**. Either way the screenshot "glitches" and is revealed as fake, using red only here. Whichever button they picked, they feel the scam.

**Slide 2, Problem.** 2–3 huge, sourced numbers that count up, with a one-line caption each. Nothing else.

**Slide 3, What SHAKE is.** One sentence, then three steps (Lock → Meet → Shake) as an animated mini-story. The deal capsule demonstrates each step.

**Slide 4, Product in action.** A silent looping video of the real app on two phones side by side. Leave a placeholder until we record it, and design the frame for it.

**Slide 5, Why Stellar.** The real contract address (linked), about 5s finality, sub-cent fees that we sponsor, stablecoins, no wallet UX, and anchors and MoneyGram ramps as the cash-out path. A subtle live element shows the judge's own lock transaction hash (they won't understand it yet).

**Slide 6, Market and model.**
- Who: marketplace buyers and sellers in Portugal, then the EU.
- How we make money: a small fee on protected deals.
- Distribution: a "Pay with SHAKE" link to paste into any listing or chat, then marketplace integrations.

**Slide 7, Built in 24h.** A timeline of what we shipped at the event (pull the real commit count and times if possible), plus the team.

**Slide 8, The ask.** "Did we convince you?" Two options:
- **[Hold to shake on it]**: a press-and-hold ring of about 1.4s that releases the €5.
- **[Not yet]**: refunds the €5.

**Slide 9, The reveal.**
- Headline: **"You didn't watch a pitch. You just used SHAKE."**
- Their real events are replayed as a timeline with timestamps and Stellar Expert links: "Wallet created without you noticing → €5 locked when you pressed Start → released when you shook / refunded when you said not yet."
- Then: "A screenshot can lie. This can't."
- A QR to `/try`: "Now try it with a friend."
- A link to the receipt `/r/[id]`.

### Pitch rules
- **Navigation:** swipe on mobile; arrows, scroll and space on desktop; progress dots; deep links (`#3`). Persist progress so a refresh doesn't lose their deal.
- At most about 12 words of body text per slide. The whole pitch takes 3 minutes or less.
- It must work fully self-serve. If the network is slow, show an elegant "locking…" state and never block reading.

---

## 6. UX of the real product (every screen, every state)

Design and build **all** of these states. No missing states and no default browser UI.

**Create deal (buyer)**
- Item name, price in € (big numeric keypad style), optional photo, seller handle or link.
- One primary action: **"Lock €X"**. Show what happens in one line: "Money is held safely until you shake. Refunded if you don't."
- States: empty, valid, locking (progress with real steps: preparing, signing, confirming on network), locked (success moment), failed (honest and recoverable).

**Share**
- After locking, share the deal link with the seller (native Web Share API, with a copy-link fallback).
- The link preview (OG image) shows the amount and "funds locked".

**Seller view**
- First impression: a big **"€X locked for you ✓"** verified from chain, with "Verified on the Stellar network" and a small "see proof" link. This is the anti-screenshot moment, so make it feel undeniably real (live status pulse, the hash typing in).
- At the meetup, the seller taps "Show my QR". The QR is huge, with maximum brightness hints, in a glass frame, with a subtle animated border so a static screenshot looks different from the live screen. It rotates or expires.

**Scan (buyer)**
- A full-screen camera viewfinder with custom corners and a scanning shimmer. If camera permission isn't granted yet, explain why in one line before the browser prompt.
- Fallbacks: manual code entry, and **"Hold to shake"** for a single-device demo.
- On a successful scan, show a confirm sheet: "Release €X to @seller?" with hold-to-confirm. Then **the shake moment** (section 7).

**Released (both phones)**
- The buyer and the seller see the success moment at the same time (the seller via polling).
- Amount, "Final. No chargebacks. No screenshots.", a link to the receipt.

**Refund**
- A clear "Cancel deal" path, an expiry countdown, and a calm refund confirmation.

**Receipt `/r/[id]`**
- Beautiful and shareable, like a premium printed receipt.
- Timeline: created → locked → released / refunded, with times, the amount and Stellar Expert links.
- Works without a wallet, for anyone.

**Edge cases**
- Offline, slow testnet, double taps, a wrong QR, an expired QR, a deal already released, opening a deal on the wrong device, camera denied, iOS low-power mode.
- Each one gets a designed, friendly state and a single next action.

**Microcopy voice**
- Short, human, confident, slightly playful.
- Never technical in the main UI. Technical details live behind "see proof".

---

## 7. Motion: brutal, but with purpose

Every slide and screen is a choreographed micro-film. Use Framer Motion springs and avoid linear easing for UI.

- **Load:** the background gradient fades in. The logo halves slide in from both sides and lock. The tagline reveals word by word with a slight blur-to-sharp (via opacity and transform plus a pre-blurred layer, not an animated blur).
- **Slide transitions:**
  - shared-layout (`layoutId`) so the deal capsule travels between slides and screens;
  - outgoing content scales down slightly and fades;
  - incoming content staggers in (40–60ms per element).
- **Numbers** count up with a spring, using tabular figures.
- **Hashes** type in character by character with a short scramble.
- **The hold-to-shake ring:**
  - the ring fills while held;
  - the capsule halves pull apart slightly (tension), with a soft rising tone;
  - releasing early springs it back.
  - On completion (the **slam**):
    - the two halves snap together with an overshoot spring;
    - a light burst and ripple run through the glass;
    - haptic via `navigator.vibrate` where supported (iOS ignores it; do a visual micro-shake instead);
    - an optional subtle "click/thud" sound, muted by default with a toggle;
    - then the seal stamps in.
- **The fake-screenshot glitch:** an RGB split, a jitter and a red flash, all under 600ms.
- **The reveal:** the screen dims, the headline appears, then their timeline draws itself event by event with real timestamps. This is the moment the judge remembers, so make it cinematic but fast (under 4s).
- **Idle life:** a very slow gradient drift and a subtle pointer- or gyro-driven parallax on glass, so the page always feels alive.
- **Reduced motion:** respect `prefers-reduced-motion` with simple fades and keep all functionality.
- **Performance:** a steady 60fps on iPhone. Animate transform and opacity only. Use `will-change` sparingly. Test on a real iPhone.

---

## 8. Responsive and platform

- **iPhone first:**
  - `100dvh`, `env(safe-area-inset-*)`;
  - controls in the thumb zone; tap targets of 44px or more;
  - no hover-only affordances;
  - `theme-color` meta; a PWA manifest for "Add to Home Screen";
  - prevent the double-tap zoom and rubber-band issues on the pitch.
- **Desktop:** a cinematic, centred stage (16:9 feel) with generous margins, keyboard navigation, and hover states that add delight (sheen, tilt). On the pitch, show a subtle "best on your phone, scan me" QR in a corner.
- **Breakpoints:** test at 375×812, 393×852, 430×932, 768×1024, 1440×900 and 1920×1080.

---

## 9. Accessibility and quality bar

- WCAG AA contrast on text, including over glass (use a semi-solid layer behind text where needed).
- Visible focus rings, keyboard-operable everything, ARIA labels on icon buttons, and screen-reader text for status changes (`aria-live`).
- `prefers-contrast: more` gives stronger borders.
- Lighthouse on mobile: Performance 90+, Accessibility 95+.
- No lorem ipsum. No fake data presented as real. Every stat is sourced in the README.

**Design QA loop (required):**
- After each major screen, take Playwright screenshots at iPhone and desktop sizes and review them critically, as an Apple design reviewer would. Check alignment, spacing rhythm, type hierarchy, contrast, empty space, consistency and motion timing.
- List the issues, fix them, and repeat until it's truly excellent.
- Show me the screenshots.

---

## 10. Order of work (small, working increments; report after each step)

1. Research summary and the chosen stack (short, with links).
2. **3 visual directions → wait for my pick.**
3. Design tokens, the glass system and the core components (DealCapsule, HoldToShake, Seal, LiveReceipt, Scanner, GlassSheet, Button, NumberTicker, HashTyper) on a `/lab` page so we can see them all.
4. Soroban contract, tests, and deployment to testnet. Put the contract ID in `.env`.
5. Wallet creation, funding and fee-sponsorship API.
6. The deal flow: `/deal/new`, `/deal/[id]` (buyer and seller), `/scan`, `/r/[id]`, `/try`, all real on testnet.
7. The pitch at `/`, wired to the real flow (slides 0–9).
8. Motion and glass polish pass, plus the design QA loop.
9. Edge cases, performance and accessibility pass.
10. Deliverables:
    - a README (architecture diagram, contract address, how to run, what was built during the event, sources);
    - a 60–90s demo-video script;
    - a submission text that maps each feature to the 7 judging criteria.

If anything is risky for 24h, say so and propose the simpler path. Never fake the core: the lock, the release and the refund must be real testnet transactions.
