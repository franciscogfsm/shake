// Public, build-time config shared by client and server.
export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const DEAL_CONTRACT_ID = process.env.NEXT_PUBLIC_DEAL_CONTRACT_ID!;
export const TOKEN_CONTRACT_ID = process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID!;
export const TOKEN_ISSUER = process.env.NEXT_PUBLIC_TOKEN_ISSUER!;
export const TEAM_ADDRESS = process.env.NEXT_PUBLIC_TEAM_ADDRESS!;
export const TOKEN_CODE = "tEUR";
export const DECIMALS = 7;

export const explorer = {
  tx: (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
  contract: (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`,
  account: (id: string) => `https://stellar.expert/explorer/testnet/account/${id}`,
};

/** €12.50 -> 125_000_000n (7 decimals) */
export const toUnits = (euros: number) => BigInt(Math.round(euros * 100)) * BigInt(100_000);
export const fromUnits = (units: bigint | string | number) => Number(BigInt(units)) / 10 ** DECIMALS;

export const formatEuro = (euros: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: euros % 1 ? 2 : 0 }).format(euros);

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
