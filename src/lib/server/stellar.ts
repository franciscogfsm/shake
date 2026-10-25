import "server-only";
import {
  Address,
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
import { DEAL_CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, TEAM_ADDRESS, TOKEN_CODE, TOKEN_ISSUER } from "@/lib/config";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
};

export const server = new rpc.Server(RPC_URL);
export const sponsor = () => Keypair.fromSecret(need("SPONSOR_SECRET"));
export const issuer = () => Keypair.fromSecret(need("ISSUER_SECRET"));
export const team = () => Keypair.fromSecret(need("TEAM_SECRET"));
export const tEUR = () => new Asset(TOKEN_CODE, TOKEN_ISSUER);
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

async function sendClassic(tx: Transaction) {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`Network rejected the transaction: ${sent.errorResult?.result().switch().name}`);
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

/**
 * Builds the one transaction that opens a user's account with zero XLM:
 * our sponsor pays the account + trustline reserves and the fee, the issuer sends test euros.
 * The user co-signs (their key must approve the trustline), then we add our signatures.
 */
export async function buildOnboardTx(userPk: string, euros: number) {
  const s = sponsor();
  const account = await server.getAccount(s.publicKey());
  const b = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: userPk }))
    .addOperation(Operation.createAccount({ destination: userPk, startingBalance: "0" }))
    .addOperation(Operation.changeTrust({ asset: tEUR(), source: userPk }))
    .addOperation(Operation.endSponsoringFutureReserves({ source: userPk }));
  if (euros > 0) b.addOperation(Operation.payment({ destination: userPk, asset: tEUR(), amount: euros.toFixed(2), source: issuer().publicKey() }));
  return b.setTimeout(120).build();
}

export async function submitOnboardTx(signedXdr: string, userPk: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
  // only accept the exact shape we built: our sponsor as source, user ops for this user only
  if (tx.source !== sponsor().publicKey()) throw new UserError("Unexpected transaction source");
  const types = tx.operations.map((o) => o.type).join(",");
  if (!/^beginSponsoringFutureReserves,createAccount,changeTrust,endSponsoringFutureReserves(,payment)?$/.test(types))
    throw new UserError("Unexpected transaction shape");
  if ((tx.operations[1] as Operation.CreateAccount).destination !== userPk) throw new UserError("Wrong account");
  tx.sign(sponsor());
  if (tx.operations.length === 5) tx.sign(issuer());
  return sendClassic(tx);
}

/** Top up an existing account with test euros (used for deals above the starter amount). */
export async function fund(userPk: string, euros: number) {
  const i = issuer();
  const account = await server.getAccount(sponsor().publicKey());
  const tx = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.payment({ destination: userPk, asset: tEUR(), amount: euros.toFixed(2), source: i.publicKey() }))
    .setTimeout(120)
    .build();
  tx.sign(sponsor(), i);
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
      return [addr(a.buyer), addr(a.token), nativeToScVal(BigInt(a.amount), { type: "i128" }), u64(a.dealId), u64(a.expiry)];
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
  const account = await server.getAccount(sponsor().publicKey());
  const contract = new Contract(DEAL_CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
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

/** OpenZeppelin Channels builds the transaction around func+auth and pays the fee. */
export async function submitCall(func: string, auth: string[]) {
  // validate that func targets our contract before spending sponsored fees
  const hf = xdr.HostFunction.fromXDR(func, "base64");
  const target = Address.fromScAddress(hf.invokeContract().contractAddress()).toString();
  const name = hf.invokeContract().functionName().toString();
  if (target !== DEAL_CONTRACT_ID || !["lock", "accept", "release", "refund"].includes(name)) throw new UserError("Not a SHAKE call");
  try {
    const res = await channels().submitSorobanTransaction({ func, auth });
    if (!res.hash) throw new Error(`Relayer returned ${res.status}`);
    return { hash: res.hash, status: res.status };
  } catch (e) {
    throw new UserError(explainContractError(e instanceof Error ? e.message : String(e)), 502);
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
};

export async function readDeal(dealId: string): Promise<DealView | null> {
  const account = await server.getAccount(sponsor().publicKey());
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
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
