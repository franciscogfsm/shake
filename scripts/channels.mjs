// One-time: create the 24 channel accounts (derived from SPONSOR_SECRET) used as sources for classic transactions.
import { BASE_FEE, Keypair, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const sponsor = Keypair.fromSecret(env.SPONSOR_SECRET);
const ch = (i) => Keypair.fromRawEd25519Seed(createHash("sha256").update(`${env.SPONSOR_SECRET}:channel:${i}`).digest());
const missing = [];
for (let i = 0; i < 24; i++) { try { await server.getAccount(ch(i).publicKey()); } catch { missing.push(ch(i).publicKey()); } }
if (!missing.length) { console.log("all 24 channels exist"); process.exit(0); }
const b = new TransactionBuilder(await server.getAccount(sponsor.publicKey()), { fee: String(Number(BASE_FEE) * 100), networkPassphrase: "Test SDF Network ; September 2015" });
for (const pk of missing) b.addOperation(Operation.createAccount({ destination: pk, startingBalance: "100" }));
const tx = b.setTimeout(120).build(); tx.sign(sponsor);
const sent = await server.sendTransaction(tx); const done = await server.pollTransaction(sent.hash, { attempts: 30 });
console.log(`created ${missing.length} channels: ${done.status} ${sent.hash}`);
