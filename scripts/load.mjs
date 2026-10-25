// Concurrency check: N fresh users onboard at the same moment (the room full of judges pressing Start).
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
const BASE = process.argv[2] ?? "http://localhost:3100", N = Number(process.argv[3] ?? 10), PASS = "Test SDF Network ; September 2015";
const post = async (u, b) => { const r = await fetch(BASE + u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; };
const one = async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const kp = Keypair.random();
      const p = await post("/api/wallet", { action: "prepare", publicKey: kp.publicKey(), euros: 5 });
      const tx = TransactionBuilder.fromXDR(p.xdr, PASS); tx.sign(kp);
      return (await post("/api/wallet", { action: "submit", publicKey: kp.publicKey(), xdr: tx.toXDR() })).hash;
    } catch (e) { if (attempt === 2) throw e; }
  }
};
const t0 = Date.now();
const res = await Promise.allSettled(Array.from({ length: N }, one));
const ok = res.filter((r) => r.status === "fulfilled").length;
console.log(`${ok}/${N} onboarded in ${((Date.now() - t0) / 1000).toFixed(1)}s`, res.filter((r) => r.status === "rejected").map((r) => r.reason.message).slice(0, 3));
