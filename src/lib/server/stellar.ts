import "server-only";
import {
  Account,
  Address,
  Memo,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  Operation,
  TransactionBuilder,
  authorizeEntry,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { ChannelsClient } from "@openzeppelin/relayer-plugin-channels";
import { createHash, createHmac } from "node:crypto";
import { CURRENCIES, DEAL_CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, TEAM_ADDRESS, TOKEN_ISSUER, type CurrencyCode } from "@/lib/config";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
};

export const server = new rpc.Server(RPC_URL);
export const sponsor = () => Keypair.fromSecret(need("SPONSOR_SECRET"));
export const issuer = () => Keypair.fromSecret(need("ISSUER_SECRET"));
export const team = () => Keypair.fromSecret(need("TEAM_SECRET"));
export const assetOf = (c: CurrencyCode) => new Asset(CURRENCIES[c].asset, TOKEN_ISSUER);
const ALL_ASSETS = () => (Object.keys(CURRENCIES) as CurrencyCode[]).map(assetOf);
export const isCurrency = (c: unknown): c is CurrencyCode => typeof c === "string" && c in CURRENCIES;
const channels = () =>
  new ChannelsClient({ baseUrl: "https://channels.openzeppelin.com/testnet", apiKey: need("CHANNELS_API_KEY") });

export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const isPublicKey = (s: unknown): s is string => {
  if (typeof s !== "string") return false;
  try {
    Keypair.fromPublicKey(s);
    return true;
  } catch {
    return false;
  }
};

/**
 * Channel accounts: many judges onboarding at once would collide on one source account's
 * sequence number, so classic transactions use one of N accounts derived from the sponsor key.
 * Created once with `node scripts/channels.mjs`.
 */
export const CHANNEL_COUNT = 24;
export const channel = (i: number) =>
  Keypair.fromRawEd25519Seed(createHash("sha256").update(`${need("SPONSOR_SECRET")}:channel:${i}`).digest());
const isChannel = (pk: string) => Array.from({ length: CHANNEL_COUNT }, (_, i) => channel(i).publicKey()).includes(pk);

/** Simulation ignores sequence numbers, so reads never need a network round-trip for the source. */
const simSource = () => new Account(sponsor().publicKey(), "0");

class BadSeq extends Error {}

async function sendClassic(tx: Transaction) {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") {
    const code = sent.errorResult?.result().switch().name ?? "unknown";
    if (code === "txBadSeq") throw new BadSeq(code);
    throw new Error(`Network rejected the transaction: ${code}`);
  }
  const done = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (done.status !== "SUCCESS") throw new Error(`Transaction ${sent.hash} ended as ${done.status}`);
  return sent.hash;
}

/* ---------------- sponsored accounts ---------------- */

export async function accountExists(pk: string) {
  try {
    await server.getAccount(pk);
    return true;
  } catch {
    return false;
  }
}

/** Which of our currencies this account can't hold yet (it needs a trustline per classic asset). */
async function missingTrustlines(pk: string) {
  const res = await server.getLedgerEntries(...ALL_ASSETS().map((a) => xdr.LedgerKey.trustline(new xdr.LedgerKeyTrustLine({ accountId: Keypair.fromPublicKey(pk).xdrAccountId(), asset: a.toTrustLineXDRObject() }))));
  const have = new Set(res.entries.map((e) => e.val.trustLine().asset().alphaNum4().assetCode().toString("ascii").replace(/[^A-Za-z0-9]/g, "")));
  return ALL_ASSETS().filter((a) => !have.has(a.code));
}

/**
 * One transaction opens (or completes) a user's account with zero XLM: our sponsor pays the reserves
 * for the account and a trustline per currency, a channel account pays the fee, the issuer sends test money.
 * The user co-signs (their key must approve the trustlines), then we add our signatures.
 * Returns null when nothing needs the user's signature (existing account, just topped up).
 */
export async function buildOnboardTx(userPk: string, amount: number, currency: CurrencyCode) {
  const exists = await accountExists(userPk);
  const missing = exists ? await missingTrustlines(userPk) : ALL_ASSETS();
  if (exists && missing.length === 0) return null;
  const s = sponsor();
  const ch = channel(Math.floor(Math.random() * CHANNEL_COUNT));
  const account = await server.getAccount(ch.publicKey());
  const b = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 20), networkPassphrase: NETWORK_PASSPHRASE }).addOperation(
    Operation.beginSponsoringFutureReserves({ sponsoredId: userPk, source: s.publicKey() }),
  );
  if (!exists) b.addOperation(Operation.createAccount({ destination: userPk, startingBalance: "0", source: s.publicKey() }));
  for (const asset of missing) b.addOperation(Operation.changeTrust({ asset, source: userPk }));
  b.addOperation(Operation.endSponsoringFutureReserves({ source: userPk }));
  if (amount > 0) b.addOperation(Operation.payment({ destination: userPk, asset: assetOf(currency), amount: amount.toFixed(2), source: issuer().publicKey() }));
  return b.setTimeout(120).build();
}

export async function submitOnboardTx(signedXdr: string, userPk: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
  // only accept the exact shape we build: a channel as source, our sponsor first, user ops for this user only
  if (!isChannel(tx.source)) throw new UserError("Unexpected transaction source");
  const ops = tx.operations;
  if (ops[0].type !== "beginSponsoringFutureReserves" || ops[0].source !== sponsor().publicKey()) throw new UserError("Unexpected sponsor");
  const ourAssets = new Set(ALL_ASSETS().map((a) => a.code));
  for (const op of ops.slice(1)) {
    const ok =
      (op.type === "createAccount" && op.destination === userPk && op.source === sponsor().publicKey()) ||
      (op.type === "changeTrust" && op.source === userPk && "code" in op.line && ourAssets.has(op.line.code) && op.line.issuer === TOKEN_ISSUER) ||
      (op.type === "endSponsoringFutureReserves" && op.source === userPk) ||
      (op.type === "payment" && op.destination === userPk && op.source === issuer().publicKey() && Number(op.amount) <= 2000);
    if (!ok) throw new UserError("Unexpected transaction shape");
  }
  const ch = Array.from({ length: CHANNEL_COUNT }, (_, i) => channel(i)).find((k) => k.publicKey() === tx.source)!;
  tx.sign(ch, sponsor());
  if (ops.some((o) => o.type === "payment")) tx.sign(issuer());
  try {
    return await sendClassic(tx);
  } catch (e) {
    if (e instanceof BadSeq) throw new UserError("Busy moment, please try again.", 409);
    throw e;
  }
}

/** Top up an existing account with test euros (used for deals above the starter amount). */
export async function fund(userPk: string, amount: number, currency: CurrencyCode = "EUR") {
  const i = issuer();
  for (let attempt = 0; ; attempt++) {
    const ch = channel(Math.floor(Math.random() * CHANNEL_COUNT));
    const account = await server.getAccount(ch.publicKey());
    const tx = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.payment({ destination: userPk, asset: assetOf(currency), amount: amount.toFixed(2), source: i.publicKey() }))
      .setTimeout(120)
      .build();
    tx.sign(ch, i);
    try {
      return await sendClassic(tx);
    } catch (e) {
      if (!(e instanceof BadSeq) || attempt >= 3) throw e;
    }
  }
}

/**
 * A user's classic payment to the anchor (SEP-24 withdrawal). The user signs the payment;
 * a channel account is the transaction source and pays the fee, so the user still needs no XLM.
 */
export async function buildAnchorPayment(userPk: string, assetCode: string, amount: string, memoB64: string) {
  const currency = (Object.keys(CURRENCIES) as CurrencyCode[]).find((c) => CURRENCIES[c].asset === assetCode);
  if (!currency) throw new UserError("Unsupported currency");
  if (!(Number(amount) > 0 && Number(amount) <= 2000)) throw new UserError("Bad amount");
  const memo = Buffer.from(memoB64, "base64");
  if (memo.length !== 32) throw new UserError("Bad memo");
  const ch = channel(Math.floor(Math.random() * CHANNEL_COUNT));
  const account = await server.getAccount(ch.publicKey());
  return new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: NETWORK_PASSPHRASE, memo: Memo.hash(memo) })
    .addOperation(Operation.payment({ destination: TOKEN_ISSUER, asset: assetOf(currency), amount: Number(amount).toFixed(2), source: userPk }))
    .setTimeout(120)
    .build();
}

export async function submitAnchorPayment(signedXdr: string, userPk: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
  if (!isChannel(tx.source)) throw new UserError("Unexpected transaction source");
  const op = tx.operations[0];
  if (tx.operations.length !== 1 || op.type !== "payment" || op.source !== userPk || op.destination !== TOKEN_ISSUER) throw new UserError("Unexpected transaction shape");
  const ch = Array.from({ length: CHANNEL_COUNT }, (_, i) => channel(i)).find((k) => k.publicKey() === tx.source)!;
  tx.sign(ch);
  return sendClassic(tx);
}

/* ---------------- contract calls ---------------- */

export type DealFn = "lock" | "accept" | "release" | "refund";

export function dealArgs(fn: DealFn, a: Record<string, string>): xdr.ScVal[] {
  const addr = (v: string) => nativeToScVal(Address.fromString(v), { type: "address" });
  const u64 = (v: string) => nativeToScVal(BigInt(v), { type: "u64" });
  const hex = (v: string) => {
    if (!/^[0-9a-f]+$/i.test(v) || v.length % 2) throw new UserError("Bad hex");
    return nativeToScVal(Buffer.from(v, "hex"), { type: "bytes" });
  };
  switch (fn) {
    case "lock":
      if (!Object.values(CURRENCIES).some((c) => c.token === a.token)) throw new UserError("Unsupported currency");
      const memo = (a.memo ?? "").trim();
      if (Buffer.byteLength(memo) > 64) throw new UserError("Keep the item name under 64 characters");
      return [addr(a.buyer), addr(a.token), nativeToScVal(BigInt(a.amount), { type: "i128" }), u64(a.dealId), u64(a.expiry), nativeToScVal(memo, { type: "string" })];
    case "accept":
      if (a.hash?.length !== 64) throw new UserError("Bad hash");
      return [u64(a.dealId), addr(a.seller), hex(a.hash)];
    case "release":
      return [u64(a.dealId), hex(a.secret)];
    case "refund":
      return [u64(a.dealId)];
  }
}

/** Simulate a deal call so the client gets the exact auth entries it must sign. */
export async function prepareCall(fn: DealFn, args: xdr.ScVal[]) {
  const contract = new Contract(DEAL_CONTRACT_ID);
  const tx = new TransactionBuilder(simSource(), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(60)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new UserError(explainContractError(sim.error), 409);
  const func = xdr.HostFunction.hostFunctionTypeInvokeContract(
    new xdr.InvokeContractArgs({ contractAddress: new Address(DEAL_CONTRACT_ID).toScAddress(), functionName: fn, args }),
  );
  return {
    func: func.toXDR("base64"),
    auth: (sim.result?.auth ?? []).map((e) => e.toXDR("base64")),
    latestLedger: sim.latestLedger,
  };
}

/** Sign any auth entries that belong to the team key (pitch seller). */
export async function signTeamEntries(auth: string[], latestLedger: number) {
  const t = team();
  return Promise.all(
    auth.map(async (b64) => {
      const e = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
      const cred = e.credentials();
      if (cred.switch().name !== "sorobanCredentialsAddress") return b64;
      if (Address.fromScAddress(cred.address().address()).toString() !== t.publicKey()) return b64;
      const signed = await authorizeEntry(e, t, latestLedger + 100, NETWORK_PASSPHRASE);
      return signed.toXDR("base64");
    }),
  );
}

/**
 * Fee sponsorship. Primary: OpenZeppelin Channels builds the transaction around func+auth and pays the fee.
 * The free testnet key has a daily fee budget, so when it runs out we fall back to our own channel
 * accounts, which pay the real (sub-cent) fee. Users never hold XLM either way.
 */
let channelsDownUntil = 0;
export async function submitCall(func: string, auth: string[]) {
  // validate that func targets our contract before spending sponsored fees
  const hf = xdr.HostFunction.fromXDR(func, "base64");
  const target = Address.fromScAddress(hf.invokeContract().contractAddress()).toString();
  const name = hf.invokeContract().functionName().toString();
  if (target !== DEAL_CONTRACT_ID || !["lock", "accept", "release", "refund"].includes(name)) throw new UserError("Not a SHAKE call");

  if (process.env.CHANNELS_API_KEY && Date.now() > channelsDownUntil) {
    try {
      const res = await channels().submitSorobanTransaction({ func, auth });
      if (res.hash) return { hash: res.hash, status: res.status, via: "openzeppelin" as const };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const contractError = /Error\(Contract, #\d+\)/.test(msg);
      if (contractError) throw new UserError(explainContractError(msg), 409);
      // budget exhausted or relayer unavailable: use our own pool for a while
      channelsDownUntil = Date.now() + (/budget|FEE_LIMIT|limit/i.test(msg) ? 30 * 60_000 : 60_000);
      console.warn("channels unavailable, falling back:", msg.slice(0, 160));
    }
  }
  return submitOwn(hf, auth);
}

async function submitOwn(func: xdr.HostFunction, auth: string[]) {
  const entries = auth.map((a) => xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));
  for (let attempt = 0; ; attempt++) {
    const ch = channel(Math.floor(Math.random() * CHANNEL_COUNT));
    const account = await server.getAccount(ch.publicKey());
    const raw = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(Operation.invokeHostFunction({ func, auth: entries }))
      .setTimeout(60)
      .build();
    const sim = await server.simulateTransaction(raw);
    if (rpc.Api.isSimulationError(sim)) throw new UserError(explainContractError(sim.error), 409);
    const tx = rpc.assembleTransaction(raw, sim).build();
    tx.sign(ch);
    try {
      return { hash: await sendClassic(tx), status: "confirmed", via: "shake-pool" as const };
    } catch (e) {
      if (!(e instanceof BadSeq) || attempt >= 3) throw e;
    }
  }
}

const CONTRACT_ERRORS: Record<number, string> = {
  1: "This deal already exists.",
  2: "We couldn't find this deal.",
  3: "The amount must be more than zero.",
  4: "The deal's time limit is already over.",
  5: "This deal is already closed.",
  6: "The seller hasn't joined this deal yet.",
  7: "That QR code doesn't match this deal.",
  8: "This deal has expired.",
  9: "This deal belongs to another seller.",
  10: "You can't sell to yourself.",
  11: "Keep the item name under 64 characters."
};
export function explainContractError(raw: string) {
  const m = /Error\(Contract, #(\d+)\)/.exec(raw);
  return m ? CONTRACT_ERRORS[Number(m[1])] ?? raw : raw;
}

/* ---------------- reads ---------------- */

export type DealView = {
  id: string;
  buyer: string;
  seller: string | null;
  amount: string;
  expiry: number;
  status: "Locked" | "Accepted" | "Released" | "Refunded";
  hash: string | null;
  memo: string;
  token: string;
};

export async function readDeal(dealId: string): Promise<DealView | null> {
  const tx = new TransactionBuilder(simSource(), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(DEAL_CONTRACT_ID).call("get", nativeToScVal(BigInt(dealId), { type: "u64" })))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (/#2\)/.test(sim.error)) return null;
    throw new Error(sim.error);
  }
  const d = scValToNative(sim.result!.retval);
  return {
    id: dealId,
    buyer: d.buyer,
    seller: d.seller ?? null,
    amount: String(d.amount),
    expiry: Number(d.expiry),
    status: Array.isArray(d.status) ? d.status[0] : d.status,
    hash: d.hash ? Buffer.from(d.hash).toString("hex") : null,
    memo: String(d.memo ?? ""),
    token: String(d.token),
  };
}

export type DealEvent = { type: string; txHash: string; at: string; ledger: number };

/** Every deal the app creates expires this long after it is locked (the contract allows any expiry). */
export const DEAL_SECONDS = 24 * 60 * 60;

/**
 * The deal's on-chain history. RPC scans a limited ledger range per query, so we start
 * near the lock (derived from the expiry the app always sets) and walk back if needed.
 */
export async function readEvents(dealId: string, expiry?: number): Promise<DealEvent[]> {
  const health = await server.getHealth();
  const idTopic = nativeToScVal(BigInt(dealId), { type: "u64" }).toXDR("base64");
  const filters = [{ type: "contract" as const, contractIds: [DEAL_CONTRACT_ID], topics: [["*", idTopic, "*"]] }];
  const WINDOW = 9_000;
  const starts: number[] = [];
  if (expiry) {
    const lockedAgo = Math.max(0, Math.floor(Date.now() / 1000) - (expiry - DEAL_SECONDS));
    starts.push(health.latestLedger - Math.ceil(lockedAgo / 5) - 300);
  }
  for (let s = health.latestLedger - WINDOW; s + WINDOW > health.oldestLedger && starts.length < 15; s -= WINDOW) starts.push(s);
  for (const start of starts) {
    const res = await server.getEvents({ startLedger: Math.max(start, health.oldestLedger + 1), filters, limit: 50 });
    const found = res.events.map((e) => ({ type: String(scValToNative(e.topic[0])), txHash: e.txHash, at: e.ledgerClosedAt, ledger: e.ledger }));
    if (found.some((e) => e.type === "locked")) return found;
  }
  return [];
}

/* ---------------- pitch: the team is the seller ---------------- */

/** Deterministic per-deal secret for team deals, so the server needs no storage. */
export const teamSecret = (dealId: string) => createHmac("sha256", need("TEAM_SECRET")).update(`shake:${dealId}`).digest("hex");
export const sha256Hex = (hex: string) => createHash("sha256").update(Buffer.from(hex, "hex")).digest("hex");
export const TEAM = TEAM_ADDRESS;
