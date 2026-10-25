# SHAKE pitch brief

> **For Claude:** you're helping write and rehearse SHAKE's pitch for HackMeridian 2026 (Lisbon, Genesis track + Stellar Composed). Everything below is built and live on Stellar Testnet unless it says otherwise. Use it as the source of truth: build the story, slides and script from it, keep to the brand rules in §12, and never claim anything from the "Don't over-claim" list (§13). The goal: judges walk out saying *"wait, that's insane."*
>
> Researched 25 Oct 2026 against the code, the README, the HackMeridian criteria, Stellar's hackathon archive (Scout) and the marketplaces' own pages.

---

## 1. SHAKE in one breath

**Pay a stranger. Only when you meet.**

The buyer locks the money. The seller sees it's real, on-chain, not a screenshot. The money moves only when the two phones meet: the buyer scans the seller's one-time QR and it's paid in seconds. No meetup? It comes back.

Other ways to say it (all on-brand):
- "Never trust a screenshot again. Shake on it."
- "Cash, but digital: it only changes hands when you're face to face."
- "The money waits until you meet."
- "Nobody can just keep it. Not the buyer, not the seller, not even us."

**SHAKE is not a marketplace.** People keep finding deals on OLX, Vinted, Facebook, WhatsApp. SHAKE only handles the one moment nobody has solved: the money changing hands between two strangers.

---

## 2. The problem (feel it first, then the numbers)

Every second-hand deal hits the same wall: **who goes first?** The buyer won't pay before seeing the item. The seller won't hand it over on the strength of a screenshot. And today, proof of payment is an image, **and images lie.**

The three scams everyone in the room has heard of:
1. **The fake screenshot:** "Paid ✅" plus an edited transfer image.
2. **The MB WAY "request money" trick:** the seller is told to "accept" a payment that is actually a request, and pays the scammer.
3. **The fake checkout link:** "click here to receive the money" leads to a look-alike page that steals the card.

Numbers with sources (only these go on screen):
| Figure | Source |
|---|---|
| **4,467** MB WAY scam complaints to PSP and GNR in 2024 (+6%). Most started from online buy/sell ads. GNR alone: 3,303 (+25%). | [Dinheiro Vivo / DN](https://dinheirovivo.dn.pt/economia/queixas-por-burlas-via-mbway-aumentaram-6-em-2024) |
| Banco de Portugal has publicly warned about the OLX/Vinted MB WAY trick. | [Postal.pt](https://postal.pt/nacional/alerta-nacional-banco-de-portugal-avisa-para-nova-vaga-de-burlas-nestas-plataformas-muito-populares-entre-os-portugueses/) |
| **€121bn** of second-hand goods were sold in Europe in 2025, 74% through marketplaces. | [RetailDetail / Cross-Border Commerce Europe](https://www.retaildetail.eu/news/general/second-hand-marketplaces-drive-innovation-in-e-commerce/) |
| Vinted members traded nearly **€11bn** in 2025 (+47%). | [RetailDetail](https://www.retaildetail.eu/news/fashion/vinted-users-saved-21-6-billion-euros-on-fashion-purchases/) |

**The gap nobody covers:** the marketplaces' own protection stops at their checkout.
- Vinted's Buyer Protection only applies when you pay with the "Buy now" button. Pay outside it (cash, transfer at a meetup) and Vinted says you're not covered ([Vinted help](https://www.vinted.co.uk/help/82)).
- For OLX Portugal we found no service that holds the buyer's money for an in-person handover; its shipping option ("Entregas OLX") is for parcels. *(Check olx.pt/lp/entregas-olx before saying this on a slide.)*
- So every **in-person** deal, the car, the bike, the sofa, the flat deposit, runs on cash or trust. That's where SHAKE lives.

---

## 3. How it works (what each person actually sees)

| Step | Buyer | Seller |
|---|---|---|
| **Lock** | Types "iPhone 13, €400" (or the extension or their AI fills it in). Taps **Lock with Face ID**. | Gets a link in the chat they're already using. |
| **Verify** | Money is committed. Can cancel until the seller joins. | Opens the link: **"€400 locked for you ✓"**, read live from the blockchain. Not a screenshot. Joins, and their phone makes a one-time QR. |
| **Meet** | Checks the item, scans the seller's QR (or types the code under it). | Shows the QR on their own phone. Keeps the item until *their own* screen says paid. |
| **Shake** | Holds the ring ("Hold to pay them"), or bumps phones. Paid in seconds. | Screen confirms. Hands over the item. |
| **Proof** | Public receipt with every transaction linked on Stellar Expert. | Same receipt. Can cash out to a bank (test anchor). |

**If it falls through:** before the seller joins, the buyer cancels. After that, the seller can cancel and refund. Once the deadline passes, anyone can trigger the refund to the buyer. **Nobody, including SHAKE, can keep the money.**

**The trick that makes it work (plain words, for Q&A):** when the seller joins, their phone invents a random 10-character code and puts only its *fingerprint* (a SHA-256 hash) on the blockchain. The code itself lives only inside the QR on the seller's screen. The contract pays out only if the buyer approves **and** presents the code that matches the fingerprint. So the money literally can't move until the buyer's phone has seen the seller's screen. **That's proof of physical presence: a cryptographic handshake.**

---

## 4. The WOW moments (build the pitch around these)

### WOW 1: "You didn't just read a website. You used SHAKE." (the pitch is the product)
A judge opens shake-lake.vercel.app, taps **Try it now · lock €5** and picks how to pay (Apple Pay, Visa, MB WAY…: test mode, nothing is charged). Without noticing, they've just:
- had a wallet created (no sign-up, no app, no seed words);
- received €5 of test money;
- locked it in our contract for a seller (the SHAKE team).

The page then says "You're at the meetup. The money moves only when you meet." They **hold to pay**, or say not yet and get it back. Then the reveal: **"You didn't just read a website. You used SHAKE."**, with every step they just did as a real transaction with a timestamp and Stellar Expert link: *Wallet made, no sign-up → Seller saw it was real → Paid when you shook.*
**Why it lands:** the judge is the user. They felt how easy it is before they were told.

### WOW 2: Two phones, one handshake (proof of physical presence)
The money can't move unless both phones are in the same place. It's not a promise or a policy; the contract enforces it. **It's cash, but with a receipt, a refund, and no envelope.**
On stage: two phones, one scan, the coin logo slams shut, done.

### WOW 3: "Release the money." "I can't." (SHAKE inside your AI)
SHAKE plugs into Claude, ChatGPT and Cursor as an MCP server: one URL, no login.
- *"Someone on Vinted wants €60 for a jacket, here's his message, is it safe?"* The AI flags it: fake link, look-alike domain, "classic fake-shipping scam."
- *"Set up a safe deal instead."* The AI creates the SHAKE deal and hands back a link. You tap it on your phone and lock with Face ID.
- *"Now release the money."* **"I can't, and neither can any AI or server. Only your phone, next to the seller's, can do that."**

**Why it's insane:** at Stellar's own agent hackathons, every MCP project we found gives AI the ability to *pay* (x402, agent wallets, pay-per-call). We built the opposite: an AI that helps you right up to the edge of the money and is *locked out by design*. The agent can check, create and verify; only a human, in person, can pay. **That's our whole thesis, enforced in code:** the server holds no keys and signs nothing.

### WOW 4: "Found it? Shake on it." (the browser extension)
On a listing on Vinted, OLX, eBay, Wallapop, Depop, Etsy, Facebook Marketplace and 9 more, a **Pay safely with SHAKE** button appears. One click reads the title, price and currency, and you check them. One more click and you're in a pre-filled SHAKE payment, linked back to the listing.
**Why it lands:** zero integration. We sit *on top of* every marketplace without asking any of them.

### WOW 6: "Airplane mode. Still paid." (the shake with no signal)
Meetups happen in garages, basements and metro stations. SHAKE still works there: **each phone holds half of the key.** The seller's half is the code inside their QR; the buyer's half was committed (as a fingerprint) when they locked the money.
- Both phones in **airplane mode**. The buyer scans the seller's QR and holds: their phone shows its own QR, its half of the key.
- The seller taps **No signal? Scan the buyer's phone**. Their phone checks both halves offline and slams shut: **"Paid to you · no signal."**
- Airplane mode off: the payment lands on Stellar by itself, and the final screen says *"Shaken with no signal at 14:02 · on Stellar at 14:09"*.

**Why it's insane:** it looks impossible for a web app, yet it's just cryptography. `settle` needs nobody's signature, because the two halves are the proof, and it can only pay the seller. Until the deadline, only the seller can cancel, so the seller is safe to hand over the item.
**On stage:** put both phones in airplane mode *in front of the judges* before the scan. Turn it off after. Watch the tx appear on Stellar Expert.

### WOW 5: "Who can move this money?"
Every deal has a tap-to-open safety promise that answers that question for each person. The punchline: **"Nobody can just keep it."** The contract has no owner key and can't be changed after the fact. In disputes, a neutral resolver can only *split* the money between the two people; it can never keep any of it.

---

## 5. Everything we built

### Core (the heart of the pitch)
| Feature | What it does | How it works |
|---|---|---|
| **Hash-locked deals** | Money releases only with the secret from the seller's live QR. | Our own Soroban contract (Rust): the seller commits sha256(code); `release` needs buyer auth + the matching code; `settle` needs both halves and no signature (the no-signal shake). 16 contract functions, 27 unit tests. |
| **"Locked for you ✓"** | The seller verifies real money before leaving home. | The deal page reads the contract state live. Shared links even show the locked amount in the chat preview, read from the chain. |
| **The pitch is the product** | One tap on the homepage runs a real deal. | Invisible wallet + sponsored funding + lock + team joins, all real testnet transactions, about 20–30s in the background while the judge reads. |
| **Face ID wallet** | No seed words, no app, no sign-up. | OpenZeppelin smart account with a passkey (`smart-account-kit`). Fallback: "Lock without Face ID" uses a hidden browser key. |
| **Zero fees for users** | Nobody needs XLM or "gas". | OpenZeppelin Channels sponsors every transaction; SHAKE's own pool of 24 accounts is the fallback. |
| **Hold-to-shake + bump** | A deliberate, physical "yes". | Press-and-hold ring with haptics; or bump the two phones together (motion sensor) after the code is verified. |
| **Public receipts** | Proof anyone can check. | `/r/<deal>` lists every transaction with Stellar Expert links. |

### Ways in (distribution with zero partnerships)
| Feature | What it does |
|---|---|
| **Share link + deal code** | Paste into any chat (WhatsApp, OLX, Vinted). Short codes like `1NM2HFEF` can be typed in the app instead of clicking, which defeats phishing clones. |
| **Browser extension** | "Pay safely with SHAKE" on 16 marketplaces (Chrome/Edge desktop). Also works on any shop from the toolbar. |
| **AI assistants (MCP)** | 7 tools for Claude, ChatGPT and Cursor: `protect_purchase`, `check_seller_message`, `verify_payment` ("did he really pay me?", read on-chain), `deal_status`, `find_safe_spot`, `create_payment_request`, and `release_payment`, which always refuses. |
| **Payment request links** | For the person getting paid: a shop or a seller makes one reusable link; each customer locks their own payment. |
| **Listing autofill** | Paste an OLX/Vinted link and the item title fills itself. |

### Beyond the meetup (one contract, three rules, six kinds of deal)
| Deal kind | Rule | How it ends |
|---|---|---|
| Buying, we meet | **Meet** | QR scan at the handover. |
| Buying, it's shipped | **Ship** | "The QR travels in the box": the buyer scans it when they open the parcel. Otherwise it releases 3 days after delivery unless the buyer opens a problem. |
| A job or service | **Ship** | The client approves when it's done, or it releases 3 days after "done" unless there's a problem. |
| Made to order | **Ship** | Scan when you collect, or the timed release. |
| Rental deposit (caução) | **Hold** | Comes back by itself on move-out day. The landlord can claim damage before then: the tenant accepts with one tap, or a neutral resolver splits it. Never more than the deposit. |
| Booking or hire | **Hold** | Same as the deposit: the car, the venue, the gear. |

### Safety extras
- **Scam check:** catches the MB WAY request trick, "send me the SMS code", "click to receive money" links, fake courier fees, look-alike domains (e.g. `vinted-secure-pay.com`), screenshot "proof", pressure and overpayment scams. English and Portuguese. Available through the AI tool (`check_seller_message`).
- **Safe places to meet:** nearby police stations first, then shopping centres, stations and libraries, from OpenStreetMap, with walking distance and a maps link.
- **Public track record** (`/u/<address>`): deals locked, released and walked away from, read from the chain (last 3 days).
- **QR rotation:** the seller can replace the code at any time before payment, which kills an old screenshot.
- **Disputes for shipped deals:** opening a problem freezes the money; the resolver can only split it between the two of them.

### Money and the bank
- **Four test currencies:** euro, dollar, pound, real (tEUR, tUSD, tGBP, tBRL), each a Stellar Asset Contract.
- **249 regions:** local number formats and currency ("400€" in Portugal, "€400" in Ireland, "R$ 400" in Brazil).
- **Shake to Bank:** the seller cashes out through our own Stellar test anchor (SEP-1 discovery, SEP-10 login, SEP-24 withdrawal, IBAN check). The transfer to the anchor is a real testnet payment; the final bank payout is simulated.

---

## 6. Use cases (from the app's `/use-cases` page)

| Use case | Status | The line |
|---|---|---|
| **Buying a car on OLX** | Works today (see §13 on amounts) | "He drives out knowing the money is real. The car is paid the moment the keys are in your hand." |
| **Renting a flat** | Works today | "No keys, no deposit. Fake landlords collect deposits for flats they don't own. Yours waits until you're standing inside." |
| **Selling on Vinted, shipped** | Works today | "The QR travels in the box. They pay only once the parcel is in their hands." |
| **Paying the crew for one night** | Coming next | "Everyone who shows up gets paid. Each person checks in at the door with their QR. No-shows come back to you." |

Everyday ones to name-drop: concert tickets handed over outside the venue, a bike from Facebook Marketplace, a sofa, a phone, a painter, a birthday cake, a van hire deposit.

---

## 7. Why we win (differentiation)

| Alternative | Its problem | SHAKE |
|---|---|---|
| **Cash** | Counterfeits, robbery risk, carrying €1,000, no proof, no refund. | Same "only when we meet" feeling, with proof, a refund and nothing to carry. |
| **MB WAY / bank transfer** | Instant and final: pay first and hope. Screenshots fake it; "request money" tricks reverse it. | The seller sees real locked money; the buyer pays only with the item in hand. |
| **Marketplace protection** (Vinted) | Only inside their checkout, mostly for shipping. Off-platform and in-person deals aren't covered. | Works for any deal arranged anywhere, in person or shipped. |
| **Other escrow on Stellar** (Trustless Work, PadiPay, Kutana, Safetrust) | Infrastructure for platforms, B2B milestones, or rental deposits. Release by approval or milestone. | Consumer-first, and release needs **physical presence**. In Stellar's hackathon archive we found nothing that releases on an in-person QR handshake. |
| **Other MCP / agent projects** | Give AI a wallet so it can pay. | The AI does everything *except* pay. Humans keep the final say, in person. |

**The four things only SHAKE does at once:**
1. **Proof of physical presence:** money moves only when the phones meet.
2. **Proof you can't fake:** the seller checks the blockchain, not an image.
3. **On top of the apps people already use,** through a link, a browser button or their AI. No integration, no partnership needed.
4. **The pitch is the product.**

---

## 8. Stellar: what we composed (Integration 20% + Stellar Composed track)

| Piece | What it does in SHAKE |
|---|---|
| **Soroban smart contract** (ours, Rust, soroban-sdk 29) | Hash-locked lock/release/refund, shipping, disputes, deposits. No admin key. |
| **Stellar Asset Contracts** | tEUR, tUSD, tGBP, tBRL test stablecoins. |
| **Passkey smart accounts** (OpenZeppelin, smart-account-kit) | Face ID wallet, no seed phrase. |
| **OpenZeppelin Channels** (Relayer) | Fee sponsorship, so users hold zero XLM. Our own 24-account pool is the fallback. |
| **Sponsored reserves** | The invisible wallet is opened for the user at no cost to them. |
| **SEP-1 / SEP-10 / SEP-24 anchor** | Shake to Bank cash-out. This is the path to MoneyGram-style real payouts. |
| **Agent-ready via MCP** | Any AI can read real on-chain deal state and create deals, but never sign. |

Why Stellar specifically: settlement in seconds, fees of fractions of a cent (which we sponsor), native stablecoins, passkey wallets, and anchors that connect to real bank accounts. A €20 second-hand deal is only viable on a network like this.

**Judging criteria, one line each:**
- **Stellar integration (20%):** 7 composed pieces, all live, every transaction linkable.
- **Problem and user value (20%):** 4,467 MB WAY complaints in one year; everyone has a story.
- **Technical execution (15%):** real contract with 27 tests, real transactions, two-phone flow that works in airplane mode, extension, MCP.
- **Innovation (15%):** proof of physical presence, a shake that still works in airplane mode (each phone holds half the key), plus an AI that can't pay.
- **Progress (10%):** everything built during the event; the commit history is public (`git log`).
- **Market (10%):** €121bn European second-hand market; distribution through links, 16 marketplaces and AI assistants with zero partnerships.
- **Design and UX (10%):** Apple-grade, one idea per screen, no jargon.

---

## 9. Market and business model
- **Start:** Portugal (MB WAY scam epidemic, OLX and Vinted heavy), then the EU second-hand market (€121bn).
- **Model:** a small fee on protected deals. Not implemented in the MVP; it's the plan.
- **Distribution, already built:** a share link in any chat, the browser extension on 16 marketplaces, and AI assistants. Next: marketplace and bank partnerships, and payment request links for small businesses.
- **Expansion with the same contract:** shipped deals, jobs, made-to-order, rental and hire deposits (all built), and crew payouts (next).

---

## 10. Judge Q&A (short answers)
- **"Isn't this just escrow?"** Escrow holds money until someone approves. SHAKE needs *both phones in the same place*: the code exists only on the seller's live screen. That's new.
- **"Why would anyone trust SHAKE?"** They don't need to. The money sits in public code that can only pay the seller on a shake or refund the buyer. There's no owner key, and anyone can check it on Stellar Expert.
- **"What if the buyer grabs the item and runs?"** The seller keeps the item until *their own* phone says paid. A scan takes seconds.
- **"What if someone doesn't show up?"** Before the seller joins, the buyer cancels. After the deadline, anyone can trigger the refund to the buyer.
- **"What about a fake SHAKE site?"** The seller never pays and never types bank details. They can also type the deal code into the official app instead of clicking a link.
- **"Why blockchain?"** The seller has to verify money is real *without trusting the buyer or us*. A public ledger is the only way to show a stranger proof that can't be faked.
- **"How can it pay with no internet?"** Each phone holds half of a key. The buyer's half was locked in as a fingerprint when they paid in; the seller's half is in their QR. Together they're the proof, so the transaction needs no signature and either phone can send it later. It can only ever pay the seller, and until the deadline only the seller can cancel, so the seller is safe to hand over the item.
- **"Can the AI steal or move money?"** No. The AI server holds no keys and signs nothing. Release needs the buyer's Face ID and the seller's code, in person.
- **"Regulation?"** Today it's the test network only. A real launch would run through a licensed EU payments partner.
- **"Shipped items: what stops a seller lying about delivery?"** The buyer can open a problem during the 3-day window, which freezes the money; a neutral resolver can only split it between the two of them.

---

## 11. Signature lines (use liberally)
- "Pay a stranger. Only when you meet."
- "A screenshot is not a payment."
- "Lock the money. They see it's real. It pays only when you meet."
- "Found it? Shake on it."
- "Ask your AI. It can't touch the money."
- "The QR travels in the box."
- "No keys, no deposit."
- "Nobody can just keep it."
- "You didn't just read a website. You used SHAKE."

---

## 12. Brand rules (non-negotiable)
- **Never say "escrow", "crypto", "gas" or "seed".** Say: locked, released, refunded, proof, test money, the network.
- **The concept is "two halves that meet":** buyer and seller, two phones. The logo is a split coin that snaps shut at the shake.
- **Look: Graphite Glacier.** Graphite background `#0d0f12`; glacier blue `#8fd3ff` means safe money; **red only for scams and fake screenshots.** Fonts: Satoshi (headlines), Inter (text), JetBrains Mono (numbers and codes). Liquid glass on buttons and chrome only.
- **Voice:** short, plain, confident, Apple-like. One idea per slide. Huge type. No jargon, no buzzwords, no "revolutionary".

---

## 13. Don't over-claim (judges will check)
- **Test network only:** test money with no cash value. Say "live on Stellar Testnet".
- **Deal size:** test deals are capped at 1–2,000 units. The €8,500 car and €1,200 flat on `/use-cases` are illustrations of the idea. The flat works today; a car-sized amount needs the cap raised.
- **Speed:** say "seconds". Testnet takes roughly 5–10s per step; the homepage deal takes about 20–30s to set up in the background.
- **No sound handshake.** The handshake is the QR (or typing its code). Phone bump exists on supported phones, after the code is verified.
- **Crew payouts are "coming next"**, not built.
- **Extension:** desktop Chrome/Edge, installed manually (no Web Store yet). Checked live on an OLX Portugal and a Vinted Spain listing; other marketplaces were tested against saved copies of their pages.
- **Cash-out:** the transfer to our test anchor is real; the bank payout itself is simulated.
- **Pay-in (Apple Pay, Visa, MB WAY, PayPal…):** the "Choose how to pay" sheet is test mode. No card processor is connected and nothing is charged; picking a method brings in test money. Say "in test mode, test money stands in for the card; in production that's a payment processor". Never say a card was charged.
- **Shipping:** "delivered" is declared by the seller (no carrier tracking). After the 3-day window, someone must tap "release"; nothing submits it automatically.
- **Disputes:** the neutral resolver is currently the SHAKE team address. It can only split between buyer and seller, never keep.
- **Track record:** last 3 days of on-chain activity. It's a signal, not identity verification.
- **"First":** say "releases only when you meet". If asked, say "we searched Stellar's hackathon archive and found nobody releasing on an in-person handshake", rather than "first in the world".
- **Business model:** the fee is the plan, not implemented.
- **No-signal shake:** both phones must have opened the deal online once, and the seller must get signal before the deal's deadline. It's for in-person deals (not shipped or deposits). The payment is guaranteed the moment the seller's phone checks the halves, but it's *final on Stellar* only once a phone reconnects: say "paid with no signal, lands on Stellar when you're back online", not "settled offline"

---

## 14. The 30-second demo (to be recorded later)
**Reserve 30 seconds** of the pitch for a demo video we'll record later. Write the script around a `[30s DEMO]` slot.

A suggested shape for that slot (final cut to be decided):
1. A Vinted listing, tapping **Pay safely with SHAKE**, then **Lock with Face ID**. *(extension + passkey)*
2. The seller's phone: **"€60 locked for you ✓"**. *(proof)*
3. The meetup: scan, hold, the coin snaps shut, **Paid**. *(proof of presence)*
4. To an AI: "Release the money." "**I can't.**" *(the closer)*

Suggested 3-minute pitch structure (adjust to the real slot):
| Time | Beat |
|---|---|
| 0:00–0:20 | The hook: a "Paid ✅" screenshot. "Would you hand over the iPhone?" It's fake. |
| 0:20–0:45 | The problem: 4,467 complaints; marketplace protection stops at checkout; in-person deals run on trust. |
| 0:45–1:05 | SHAKE in one line, then Lock → Verify → Meet → Shake. |
| 1:05–1:35 | **[30s DEMO]** |
| 1:35–2:05 | Why it's new: proof of physical presence + the AI that can't pay + on top of every marketplace. |
| 2:05–2:30 | Stellar composed (7 pieces) and why Stellar. |
| 2:30–2:45 | Market and model. |
| 2:45–3:00 | The reveal: "Some of you already used SHAKE today, without knowing." Ask for the vote. |

---

## 15. Links and IDs
- **Live app:** https://shake-lake.vercel.app (homepage = the pitch-that's-a-product)
- **Two phones:** https://shake-lake.vercel.app/try
- **Extension:** https://shake-lake.vercel.app/extension
- **AI setup:** https://shake-lake.vercel.app/ai. MCP URL: `https://shake-lake.vercel.app/api/mcp`
- **Use cases:** https://shake-lake.vercel.app/use-cases
- **Deal contract (testnet):** [`CAQ6KAVIUSXSO2A6T44TC6USH3WP67R7YYORMLMLVTRG6ZDBHGQIZ2JW`](https://stellar.expert/explorer/testnet/contract/CAQ6KAVIUSXSO2A6T44TC6USH3WP67R7YYORMLMLVTRG6ZDBHGQIZ2JW)
- **tEUR:** [`CCFUCVE7557QSF3HPM26D6CNBNZINFGHH7LERSZXVBCAV6KYRYIVPTAR`](https://stellar.expert/explorer/testnet/contract/CCFUCVE7557QSF3HPM26D6CNBNZINFGHH7LERSZXVBCAV6KYRYIVPTAR)
- **Team:** Francisco and Pedro. All code written during the event.
