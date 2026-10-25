# Step 1: research and chosen stack

Checked 25 Oct 2026 against the live testnet, crates.io, npm and the official docs, then cross-checked with the Stellar Raven MCP (skills `stellar-dev.smart-contracts` and `stellar-dev.dapp`, Stellar Docs and Scout).

**Raven cross-check:**
- **SDK version:** "the `soroban-sdk` major version tracks the protocol version". Testnet runs protocol 29, so 29.0.1 is right. Build target `wasm32v1-none`.
- **Fee sponsorship:** the recommended route is the OpenZeppelin Relayer / Stellar Channels, which "replaces the deprecated Launchtube service". The testnet instance is `channels.openzeppelin.com/testnet` (API keys at `/gen`), and calls are submitted as `{ func, auth }`. See the [Stellar docs page](https://developers.stellar.org/docs/tools/openzeppelin-relayer) and the [fee sponsorship guide](https://developers.stellar.org/docs/build/guides/transactions/fee-sponsorship).
- **Passkeys:** `smart-account-kit` is the recommended kit. It is *not* drop-in compatible with `passkey-kit`, so pick one.
- **Prior art (Scout):**
  - Escrow on Stellar exists: [Trustless Work](https://github.com/Trustless-Work/trustlesswork-smart-contract-stellar) (platform escrow infrastructure), [PadiPay](https://github.com/Padi-Pay/padipay-contract) (a Web2.5 escrow service) and [Kutana](https://stellarlight.xyz/project/kutana) (B2B milestone escrow).
  - None of them release on an in-person, hash-locked QR handshake. That confirms our positioning: never pitch "escrow", pitch proof of physical presence.

## Stellar stack, current versions

| Piece | Version / value | How verified |
|---|---|---|
| Testnet protocol | **29** (RPC 30.0.0) | `getVersionInfo` on soroban-testnet.stellar.org |
| `soroban-sdk` (Rust) | **29.0.1**, latest stable; 30.0.0-rc.1 is a release candidate, so skip it | crates.io |
| Stellar CLI | **28.1.0**, latest release; installed | GitHub releases |
| `@stellar/stellar-sdk` (JS) | **17.3.0** latest, but **pin 16.3.x** (smart-account-kit does not support 17) | npm |
| OpenZeppelin `stellar-accounts` / `stellar-tokens` | 0.8.0 | crates.io |
| `smart-account-kit` (passkeys) | 0.8.0, peer `@stellar/stellar-sdk ^16.3.0` | npm |
| OpenZeppelin Relayer | v1.9.0; hosted **Channels** service on testnet | GitHub, OZ docs |

The passkey stack is live on testnet today:
- WebAuthn verifier `CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F` answers `verify`.
- The account WASM `1b5f4534…785a` is installed.

## Chosen path

1. **The deal contract is ours** (Rust, soroban-sdk 29.0.1). It does hash-locked `lock`, `release(deal_id, secret)` and `refund`. It uses `Address::require_auth`, so it works the same with a plain keypair or a passkey smart account.
2. **Money is "tEUR"**, a test asset we issue, wrapped as a Stellar Asset Contract. Circle's testnet USDC/EURC faucet is rate-limited, and every judge needs €5 instantly; as the issuer we can fund unlimited test deals.
3. **Fees run through OpenZeppelin Channels on testnet** (`channels.openzeppelin.com/testnet`, free API key).
   - The server builds the contract call, the user signs only the authorisation entry, and Channels submits it and pays the fee.
   - So users never hold XLM. This is the OpenZeppelin Relayer piece of "Stellar Composed".
4. **The wallet is built in two layers:**
   - **Core (ships first):** an invisible keypair in the browser. The server opens the account and its tEUR trustline using sponsored reserves, so the user holds zero XLM. This is silent, so the pitch's "Start" stays a single tap.
   - **Passkey (time-boxed to about 3h, after the core works):** an OpenZeppelin smart account through `smart-account-kit`, with Face ID or Touch ID and no seed phrase. It's used in `/deal/new`.
     - A smart account is a contract address, so it holds tEUR with no trustline and no reserve.
     - If it blocks us, we keep the keypair, and the contract needs no change.
5. **Anchor cash-out is a bonus only.** `testanchor.stellar.org` (SEP-24) uses its own test asset, not tEUR, so it can only demo the cash-out path. It's last in the queue.

Why this path: every core piece (contract, SAC, Channels, keypair signing) is well-trodden and runs on testnet today. Passkeys and the anchor sit on top, so neither can block lock, release or refund.

## Risks for 24h

- **smart-account-kit is unaudited and pins stellar-sdk 16.** Pin it, and keep it out of the pitch path.
- **Channels has a daily fee limit per API key.** Keep a fallback: our own sponsor account plus a fee-bump, which is a few lines with the same signed authorisation entry.
- **Passkeys on desktop** without a built-in authenticator fall back to the phone QR flow. The pitch uses the keypair for this reason.
- **Testnet can be reset.** Script the whole deploy (`scripts/deploy.sh`) so it can be redone in minutes.

## Problem data (only figures with a source go on screen)

| Figure | Source |
|---|---|
| **4,467** MB WAY scam complaints to PSP and GNR in 2024, up about 6% on 2023. Most cases started from online sales and buy/sell ads. GNR: 3,303 (+25%). PSP: 1,164. | [Dinheiro Vivo / DN](https://dinheirovivo.dn.pt/economia/queixas-por-burlas-via-mbway-aumentaram-6-em-2024) |
| The Banco de Portugal warns about the OLX/Vinted MB WAY trick: a "request money" sent as if it were a payment, and fake ATM sign-ups. | [Postal.pt](https://postal.pt/nacional/alerta-nacional-banco-de-portugal-avisa-para-nova-vaga-de-burlas-nestas-plataformas-muito-populares-entre-os-portugueses/), [4gnews](https://4gnews.pt/banco-de-portugal-deixa-alerta-aos-utilizadores-do-olx-e-vinted/) |
| European recommerce: **€121bn** GMV in 2025, 74% (€90bn) through marketplaces | [RetailDetail / Cross-Border Commerce Europe](https://www.retaildetail.eu/news/general/second-hand-marketplaces-drive-innovation-in-e-commerce/) |
| Vinted members traded nearly **€11bn** in 2025 (+47%) | [RetailDetail](https://www.retaildetail.eu/news/fashion/vinted-users-saved-21-6-billion-euros-on-fashion-purchases/) |

Still to find: a primary Banco de Portugal page, and OLX Portugal user numbers.

## Sources

- Stellar: [software versions](https://developers.stellar.org/docs/networks/software-versions), [fee-bump transactions](https://developers.stellar.org/docs/build/guides/transactions/fee-bump-transactions)
- OpenZeppelin: [Relayer: Stellar sponsored transactions](https://docs.openzeppelin.com/relayer/1.5.x/guides/stellar-sponsored-transactions-guide), [Stellar Channels guide](https://docs.openzeppelin.com/relayer/1.3.x/guides/stellar-channels-guide)
- Passkey wallets: [stellar/smart-account-kit](https://github.com/stellar/smart-account-kit), [stellar/passkey-kit](https://github.com/stellar/passkey-kit)
- Liquid glass: [WebKit bug 313914: feDisplacementMap not rendered in Safari](https://bugs.webkit.org/show_bug.cgi?id=313914)
