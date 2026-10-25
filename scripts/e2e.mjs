// End-to-end check of the real testnet flow through our own API (same steps the browser does).
//   node scripts/e2e.mjs [baseUrl]
// 1. two-phone deal: buyer + seller onboard (sponsored), lock, seller accepts, buyer releases with the QR secret
// 2. pitch deal: judge locks, team accepts server-side, judge "holds to shake" with the team secret
import { Address, Keypair, TransactionBuilder, authorizeEntry, xdr } from "@stellar/stellar-sdk";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const PASS = "Test SDF Network ; September 2015";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const TOKEN = env.NEXT_PUBLIC_TOKEN_CONTRACT_ID, TEAM = env.NEXT_PUBLIC_TEAM_ADDRESS;

const post = async (url, body) => {
  const r = await fetch(BASE + url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${url} ${r.status}: ${j.error}`);
  return j;
};
const onboard = async (kp, euros) => {
  const p = await post("/api/wallet", { action: "prepare", publicKey: kp.publicKey(), euros });
  if (p.ready) return p.hash;
  const tx = TransactionBuilder.fromXDR(p.xdr, PASS);
  tx.sign(kp);
  return (await post("/api/wallet", { action: "submit", publicKey: kp.publicKey(), xdr: tx.toXDR() })).hash;
};
const call = async (kp, fn, args) => {
  const p = await post("/api/call", { action: "prepare", fn, args });
  const auth = await Promise.all(p.auth.map(async (b64) => {
    const e = xdr.SorobanAuthorizationEntry.fromXDR(b64, "base64");
    const c = e.credentials();
    if (c.switch().name !== "sorobanCredentialsAddress" || Address.fromScAddress(c.address().address()).toString() !== kp.publicKey()) return b64;
    return (await authorizeEntry(e, kp, p.latestLedger + 100, PASS)).toXDR("base64");
  }));
  return (await post("/api/call", { action: "submit", func: p.func, auth })).hash;
};
const deal = async (id) => (await fetch(`${BASE}/api/deal/${id}`)).json();
const id = () => String(Math.floor(Math.random() * 2 ** 40) + 1);
const expiry = () => String(Math.floor(Date.now() / 1000) + 3600);
const t0 = Date.now(), lap = (m) => console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s  ${m}`);

// 1. two phones
const buyer = Keypair.random(), seller = Keypair.random();
lap(`onboard buyer  ${await onboard(buyer, 25)}`);
lap(`onboard seller ${await onboard(seller, 0)}`);
const d1 = id(), secret = randomBytes(32).toString("hex"), hash = createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex");
lap(`lock    ${await call(buyer, "lock", { buyer: buyer.publicKey(), token: TOKEN, amount: "250000000", dealId: d1, expiry: expiry() })}`);
lap(`accept  ${await call(seller, "accept", { dealId: d1, seller: seller.publicKey(), hash })}`);
try { await call(buyer, "release", { dealId: d1, secret: "00".repeat(32) }); throw new Error("wrong secret was accepted!"); }
catch (e) { if (String(e.message).includes("accepted!")) throw e; lap(`wrong secret rejected: ${e.message}`); }
lap(`release ${await call(buyer, "release", { dealId: d1, secret })}`);
const r1 = await deal(d1);
lap(`deal ${d1}: ${r1.deal.status}, events: ${r1.events.map((e) => e.type).join(" → ")}`);
if (r1.deal.status !== "Released") throw new Error("two-phone deal not released");

// 2. pitch
const judge = Keypair.random(), d2 = id();
lap(`onboard judge  ${await onboard(judge, 5)}`);
lap(`lock    ${await call(judge, "lock", { buyer: judge.publicKey(), token: TOKEN, amount: "50000000", dealId: d2, expiry: expiry() })}`);
lap(`team accepts ${(await post("/api/pitch", { action: "accept", dealId: d2 })).hash}`);
const { secret: s2 } = await post("/api/pitch", { action: "secret", dealId: d2 });
lap(`shake   ${await call(judge, "release", { dealId: d2, secret: s2 })}`);
const r2 = await deal(d2);
lap(`deal ${d2}: ${r2.deal.status}, seller is team: ${r2.deal.seller === TEAM}`);
if (r2.deal.status !== "Released") throw new Error("pitch deal not released");
console.log("ALL GOOD");
