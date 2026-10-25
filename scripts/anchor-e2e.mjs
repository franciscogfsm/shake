// End-to-end check of "Shake to Bank" against our SEP-1/10/24 anchor on testnet.
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
const BASE = process.argv[2] ?? "http://localhost:3100", PASS = "Test SDF Network ; September 2015";
const j = async (r) => { const b = await r.json(); if (!r.ok) throw new Error(JSON.stringify(b)); return b; };
const post = (u, b, h = {}) => fetch(BASE + u, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(b) }).then(j);
const t0 = Date.now(), lap = (m) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s  ${m}`);

const kp = Keypair.random();
const p = await post("/api/wallet", { action: "prepare", publicKey: kp.publicKey(), amount: 12, currency: "EUR" });
const tx = TransactionBuilder.fromXDR(p.xdr, PASS); tx.sign(kp);
lap(`seller has 12 tEUR ${(await post("/api/wallet", { action: "submit", publicKey: kp.publicKey(), xdr: tx.toXDR() })).hash}`);

const toml = await (await fetch(`${BASE}/.well-known/stellar.toml`)).text();
const get = (k) => toml.split(/\r?\n/).find((l) => l.startsWith(k + " ="))?.split('"')[1];
const AUTH = get("WEB_AUTH_ENDPOINT"), T24 = get("TRANSFER_SERVER_SEP0024");
const ch = await j(await fetch(`${AUTH}?account=${kp.publicKey()}`));
const c = TransactionBuilder.fromXDR(ch.transaction, PASS); c.sign(kp);
const { token } = await j(await fetch(AUTH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transaction: c.toXDR() }) }));
lap("SEP-10 ok, jwt " + token.slice(0, 16) + "…");
const fd = new FormData(); fd.set("asset_code", "tEUR"); fd.set("amount", "12"); fd.set("account", kp.publicKey());
const w = await j(await fetch(`${T24}/transactions/withdraw/interactive`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: fd }));
lap("SEP-24 interactive " + w.url.slice(0, 60) + "…");
const t = new URL(w.url).searchParams.get("t");
const bad = await fetch(`${BASE}/api/anchor/kyc`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t, name: "Pedro", iban: "PT50000201231234567890155" }) });
lap(`bad IBAN rejected: ${bad.status}`);
const k = await post("/api/anchor/kyc", { t, name: "Pedro Santos", iban: "PT50000201231234567890154" });
lap(`kyc → ${k.transaction.status}, pay ${k.transaction.amount_in} to ${k.transaction.withdraw_anchor_account.slice(0, 6)} memo ${k.transaction.withdraw_memo.slice(0, 8)}…`);
const pr = await post("/api/wallet/pay", { action: "prepare", publicKey: kp.publicKey(), asset: "tEUR", amount: k.transaction.amount_in, memo: k.transaction.withdraw_memo });
const ptx = TransactionBuilder.fromXDR(pr.xdr, PASS); ptx.sign(kp);
lap(`paid anchor ${(await post("/api/wallet/pay", { action: "submit", publicKey: kp.publicKey(), xdr: ptx.toXDR() })).hash}`);
for (let i = 0; i < 15; i++) {
  const s = await j(await fetch(`${T24}/transaction?id=${encodeURIComponent(k.transaction.id)}`, { headers: { authorization: `Bearer ${token}` } }));
  if (s.transaction.status === "completed") { lap(`completed: ${s.transaction.message}`); console.log("ANCHOR OK"); process.exit(0); }
  await new Promise((r) => setTimeout(r, 2000));
}
throw new Error("never completed");
