// Creates a real locked deal on testnet through the local API and prints its id (for QA screenshots).
import { Address, Keypair, TransactionBuilder, authorizeEntry, xdr } from "@stellar/stellar-sdk";
import { readFileSync } from "node:fs";
const BASE = process.argv[2] ?? "http://localhost:3100", PASS = "Test SDF Network ; September 2015";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const post = async (u, b) => { const r = await fetch(BASE + u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; };
const kp = Keypair.random();
const p = await post("/api/wallet", { action: "prepare", publicKey: kp.publicKey(), euros: 400 });
const tx = TransactionBuilder.fromXDR(p.xdr, PASS); tx.sign(kp);
await post("/api/wallet", { action: "submit", publicKey: kp.publicKey(), xdr: tx.toXDR() });
const id = String(Math.floor(Math.random() * 2 ** 40) + 1);
const c = await post("/api/call", { action: "prepare", fn: "lock", args: { buyer: kp.publicKey(), token: env.NEXT_PUBLIC_TOKEN_CONTRACT_ID, amount: "4000000000", dealId: id, expiry: String(Math.floor(Date.now() / 1000) + 86400) } });
const auth = await Promise.all(c.auth.map(async (b) => { const e = xdr.SorobanAuthorizationEntry.fromXDR(b, "base64"); return Address.fromScAddress(e.credentials().address().address()).toString() === kp.publicKey() ? (await authorizeEntry(e, kp, c.latestLedger + 100, PASS)).toXDR("base64") : b; }));
await post("/api/call", { action: "submit", func: c.func, auth });
console.log(JSON.stringify({ id, buyerSecret: kp.secret() }));
