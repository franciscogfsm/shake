import { isCentAmount } from "./amount";
import { WORLD_COUNTRIES } from "./regions";
// Public, build-time config shared by client and server.
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const DEAL_CONTRACT_ID = process.env.NEXT_PUBLIC_DEAL_CONTRACT_ID!;
export const TOKEN_CONTRACT_ID = process.env.NEXT_PUBLIC_TOKEN_EUR ?? process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID!;
export const TOKEN_ISSUER = process.env.NEXT_PUBLIC_TOKEN_ISSUER!;
export const TEAM_ADDRESS = process.env.NEXT_PUBLIC_TEAM_ADDRESS!;
export const TOKEN_CODE = "tEUR";

/** OpenZeppelin smart accounts (passkeys) live on testnet; verified 25 Oct 2026 (docs/research.md). */
export const PASSKEY = {
  accountWasmHash: "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a",
  webauthnVerifier: "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F",
};
export const DECIMALS = 7;

export const explorer = {
  tx: (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
  contract: (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`,
  account: (id: string) => `https://stellar.expert/explorer/testnet/account/${id}`,
};

/* ---------------- money: several test stablecoins, formatted the local way ---------------- */

export type CurrencyCode = "EUR" | "USD" | "GBP" | "BRL";
export type Currency = { code: CurrencyCode; asset: string; token: string; name: string; homeLocale: string };

// NEXT_PUBLIC_* must be referenced literally so Next can inline them
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: { code: "EUR", asset: "tEUR", token: process.env.NEXT_PUBLIC_TOKEN_EUR ?? process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID!, name: "Euro", homeLocale: "pt-PT" },
  USD: { code: "USD", asset: "tUSD", token: process.env.NEXT_PUBLIC_TOKEN_USD!, name: "US dollar", homeLocale: "en-US" },
  GBP: { code: "GBP", asset: "tGBP", token: process.env.NEXT_PUBLIC_TOKEN_GBP!, name: "Pound sterling", homeLocale: "en-GB" },
  BRL: { code: "BRL", asset: "tBRL", token: process.env.NEXT_PUBLIC_TOKEN_BRL!, name: "Brazilian real", homeLocale: "pt-BR" },
};
export const availableCurrencies = () => Object.values(CURRENCIES).filter((c) => !!c.token);
export const currencyOfToken = (token: string): Currency => {
  const currency = availableCurrencies().find((c) => c.token === token);
  if (!currency) throw new Error("This deal uses an unsupported currency.");
  return currency;
};

export type Country = { code: string; name: string; locale: string; currency: CurrencyCode };
export const COUNTRIES = WORLD_COUNTRIES;
export const DEFAULT_COUNTRY = { ...COUNTRIES.find((c) => c.code === "US")!, locale: "en-US" };

/** 12.50 -> 125_000_000 (all our tokens use 7 decimals) */
export const toUnits = (amount: number) => {
  if (!isCentAmount(amount) || amount < 0 || !Number.isSafeInteger(Math.round(amount * 100))) throw new Error("Enter an amount with up to two decimal places.");
  return BigInt(Math.round(amount * 100)) * BigInt(100_000);
};
export const fromUnits = (units: bigint | string | number) => Number(BigInt(units)) / 10 ** DECIMALS;

/** Locale-correct money: "400€" in Portugal, "€400" in Ireland, "R$ 400" in Brazil. Cents only when needed. */
export function formatMoney(amount: number, currency: CurrencyCode = "EUR", locale = CURRENCIES[currency].homeLocale) {
  const formatted = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount);
  // pt, fr, de and others insert a space before a trailing symbol ("5 €"). Keep it tight: "5€".
  return formatted.replace(/\s+(?=\p{Sc})/u, "");
}
/** Parts for big displays: the symbol is styled separately but keeps the locale's position. */
export function moneyParts(amount: number, currency: CurrencyCode = "EUR", locale = CURRENCIES[currency].homeLocale) {
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).formatToParts(amount);
  const i = parts.findIndex((p) => p.type === "currency");
  const firstNum = parts.findIndex((p) => p.type === "integer");
  return { symbol: parts[i]?.value ?? currency, before: i < firstNum, number: parts.filter((p) => p.type !== "currency").map((p) => p.value).join("").trim() };
}
/** A deal's amount in its own currency, formatted for the viewer (or the currency's home locale). */
export const dealMoney = (units: bigint | string | number, token: string, locale?: string) => {
  const c = currencyOfToken(token);
  return formatMoney(fromUnits(units), c.code, locale ?? c.homeLocale);
};
/** Back-compat helper for euro amounts. */
export const formatEuro = (euros: number) => formatMoney(euros, "EUR");

/** Deal ids are u64 on-chain; we keep them under 2^53 and show them as a short base-36 code. */
export const dealCode = (id: string | number | bigint) => BigInt(id).toString(36).toUpperCase();
export const parseDealCode = (code: string) => {
  const clean = code.trim().toLowerCase();
  if (!/^[0-9a-z]{1,11}$/.test(clean)) return null;
  const n = parseInt(clean, 36);
  return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
};
export const newDealId = () => {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  // 40 random bits -> 8-char code, plenty for a hackathon and safe for JS numbers
  return String((buf[0] & 0xff) * 2 ** 32 + buf[1] + 1);
};
