// Create the 24 channel accounts (derived from SPONSOR_SECRET) used as sources for classic transactions,
// and refill any that run low. Safe to re-run before a demo.
import { BASE_FEE, Keypair, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PASS = "Test SDF Network ; September 2015";
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const sponsor = Keypair.fromSecret(env.SPONSOR_SECRET);
const ch = (i) => Keypair.fromRawEd25519Seed(createHash("sha256").update(`${env.SPONSOR_SECRET}:channel:${i}`).digest());
const send = async (tx) => { const sent = await server.sendTransaction(tx); return (await server.pollTransaction(sent.hash, { attempts: 30 })).status + " " + sent.hash; };

const missing = [];
for (let i = 0; i < 24; i++) { try { await server.getAccount(ch(i).publicKey()); } catch { missing.push(ch(i).publicKey()); } }
if (missing.length) {
  const b = new TransactionBuilder(await server.getAccount(sponsor.publicKey()), { fee: String(Number(BASE_FEE) * 100), networkPassphrase: PASS });
  for (const pk of missing) b.addOperation(Operation.createAccount({ destination: pk, startingBalance: "100" }));
  const tx = b.setTimeout(120).build(); tx.sign(sponsor);
  console.log(`created ${missing.length} channels: ${await send(tx)}`);
}

// Testnet rent can push one deal past 100 XLM in fees (the Soroban state is over its target size),
// so top up low channels: friendbot funds a throwaway account, which merges all of it into the channel.
const LOW = 2_000;
for (let i = 0; i < 24; i++) {
  const pk = ch(i).publicKey();
  const xlm = Number((await (await fetch(`https://horizon-testnet.stellar.org/accounts/${pk}`)).json()).balances.find((b) => b.asset_type === "native").balance);
  if (xlm >= LOW) continue;
  const tmp = Keypair.random();
  const fb = await fetch(`https://friendbot.stellar.org/?addr=${tmp.publicKey()}`);
  if (!fb.ok) { console.log(`friendbot refused (${fb.status}), stopping at channel ${i}`); break; }
  const tx = new TransactionBuilder(await server.getAccount(tmp.publicKey()), { fee: BASE_FEE, networkPassphrase: PASS }).addOperation(Operation.accountMerge({ destination: pk })).setTimeout(60).build();
  tx.sign(tmp);
  console.log(`channel ${i}: ${Math.round(xlm)} XLM, topped up: ${await send(tx)}`);
}
