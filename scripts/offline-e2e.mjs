// Checks the shake with no signal on the live testnet contract, the same way the app submits it:
// lock with the buyer's half committed, the seller joins, then `settle` goes through OpenZeppelin Channels
// with an empty auth list (nobody signs: the two halves are the proof).
//   node scripts/offline-e2e.mjs
import { Address, Contract, Keypair, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { ChannelsClient } from "@openzeppelin/relayer-plugin-channels";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PASS = "Test SDF Network ; September 2015";
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const deal = new Contract(env.NEXT_PUBLIC_DEAL_CONTRACT_ID);
const sha = (b) => createHash("sha256").update(b).digest();
const buyer = Keypair.fromSecret(env.ISSUER_SECRET); // the issuer holds unlimited test euros
const seller = Keypair.fromSecret(env.TEAM_SECRET);

async function send(kp, op) {
  const tx = new TransactionBuilder(await server.getAccount(kp.publicKey()), { fee: "1000000", networkPassphrase: PASS }).addOperation(op).setTimeout(60).build();
  const ready = await server.prepareTransaction(tx);
  ready.sign(kp);
  const sent = await server.sendTransaction(ready);
  const done = await server.pollTransaction(sent.hash, { attempts: 30 });
  if (done.status !== "SUCCESS") throw new Error(`${done.status} ${sent.hash}`);
  return sent.hash;
}

const id = BigInt(Date.now());
const secret = Buffer.from("OFFLINE123");
const half = randomBytes(32);
const u64 = nativeToScVal(id, { type: "u64" });
console.log("deal", id.toString());
console.log("lock  ", await send(buyer, deal.call("lock", nativeToScVal(Address.fromString(buyer.publicKey()), { type: "address" }), nativeToScVal(Address.fromString(env.NEXT_PUBLIC_TOKEN_CONTRACT_ID), { type: "address" }), nativeToScVal(10_000_000n, { type: "i128" }), u64, nativeToScVal(BigInt(Math.floor(Date.now() / 1000) + 3600), { type: "u64" }), nativeToScVal("offline e2e", { type: "string" }), nativeToScVal(sha(half), { type: "bytes" }))));
console.log("accept", await send(seller, deal.call("accept", u64, nativeToScVal(Address.fromString(seller.publicKey()), { type: "address" }), nativeToScVal(sha(secret), { type: "bytes" }))));

// what /api/call prepare does: simulate from any source and return the auth entries to sign
const args = [u64, nativeToScVal(secret, { type: "bytes" }), nativeToScVal(half, { type: "bytes" })];
const sim = await server.simulateTransaction(new TransactionBuilder(await server.getAccount(seller.publicKey()), { fee: "100", networkPassphrase: PASS }).addOperation(deal.call("settle", ...args)).setTimeout(60).build());
if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
const auth = (sim.result?.auth ?? []).map((e) => e.toXDR("base64"));
console.log("auth entries to sign:", auth.length);
if (auth.length) throw new Error("settle should need no signature");
const func = xdr.HostFunction.hostFunctionTypeInvokeContract(new xdr.InvokeContractArgs({ contractAddress: new Address(env.NEXT_PUBLIC_DEAL_CONTRACT_ID).toScAddress(), functionName: "settle", args })).toXDR("base64");
const res = await new ChannelsClient({ baseUrl: "https://channels.openzeppelin.com/testnet", apiKey: env.CHANNELS_API_KEY }).submitSorobanTransaction({ func, auth });
console.log("settle via OpenZeppelin Channels", res.status, res.hash);
const got = await server.simulateTransaction(new TransactionBuilder(await server.getAccount(seller.publicKey()), { fee: "100", networkPassphrase: PASS }).addOperation(deal.call("get", u64)).setTimeout(60).build());
if (rpc.Api.isSimulationError(got)) throw new Error(got.error);
console.log("status", scValToNative(got.result.retval).status[0]);
