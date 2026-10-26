// Cross-currency pay-in: liquidity pools on the Stellar DEX between tEUR and tUSD / tGBP / tBRL,
// priced from Reflector's foreign-exchange oracle on testnet. A buyer can then pay in reais while the
// deal locks euros: one path payment converts on the way in.
// First run: an FX desk account (derived from SPONSOR_SECRET) opens the pools at Reflector's rates.
// Later runs: re-peg each pool to Reflector's latest rate with one trade. Safe to re-run before a demo.
import { Account, Asset, BASE_FEE, Contract, Keypair, LiquidityPoolAsset, Operation, TransactionBuilder, getLiquidityPoolId, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PASS = "Test SDF Network ; September 2015";
const HORIZON = "https://horizon-testnet.stellar.org";
const REFLECTOR_FX = "CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W"; // Reflector "Fiat exchange rates", testnet
const DEPTH_EUR = 5_000_000; // deep enough that a 2 000 € deal moves the rate by about 0.04%
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const issuer = Keypair.fromSecret(env.ISSUER_SECRET);
const desk = Keypair.fromRawEd25519Seed(createHash("sha256").update(`${env.SPONSOR_SECRET}:fx-desk`).digest());
const asset = (c) => new Asset(`t${c}`, issuer.publicKey());

const send = async (tx) => {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`refused: ${sent.errorResult?.result().switch().name} ${JSON.stringify(sent.errorResult?.result().results?.().map((r) => r.tr().value()?.switch?.().name))}`);
  const done = await server.pollTransaction(sent.hash, { attempts: 40 });
  if (done.status !== "SUCCESS") throw new Error(`transaction ${sent.hash} ${done.status}`);
  return sent.hash;
};
const build = async (source, ops) => {
  const b = new TransactionBuilder(await server.getAccount(source.publicKey()), { fee: String(Number(BASE_FEE) * 10), networkPassphrase: PASS });
  for (const op of ops) b.addOperation(op);
  return b.setTimeout(120).build();
};

// Reflector quotes every fiat in USD with 14 decimals
const usd = async (code) => {
  if (code === "USD") return 1;
  const op = new Contract(REFLECTOR_FX).call("lastprice", xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Other"), xdr.ScVal.scvSymbol(code)]));
  const sim = await server.simulateTransaction(new TransactionBuilder(new Account(desk.publicKey(), "0"), { fee: BASE_FEE, networkPassphrase: PASS }).addOperation(op).setTimeout(30).build());
  const p = scValToNative(sim.result.retval);
  if (!p) throw new Error(`Reflector has no ${code} price`);
  return Number(p.price) / 1e14;
};

let hasDesk = true;
try { await server.getAccount(desk.publicKey()); } catch { hasDesk = false; }
if (!hasDesk) {
  const r = await fetch(`https://friendbot.stellar.org/?addr=${desk.publicKey()}`);
  if (!r.ok) throw new Error("Friendbot didn't fund the FX desk");
  console.log(`FX desk ${desk.publicKey()} funded`);
}

const eurUsd = await usd("EUR");
const pools = [];
for (const code of ["USD", "GBP", "BRL"]) {
  const [a, b] = [asset("EUR"), asset(code)].sort(Asset.compare);
  const share = new LiquidityPoolAsset(a, b, 30);
  const id = getLiquidityPoolId("constant_product", share.getLiquidityPoolParameters()).toString("hex");
  // price of a in b: how many b one a buys, from Reflector
  const rate = { [`t${code}`]: (await usd(code)) / eurUsd, tEUR: 1 };
  pools.push({ code, a, b, share, id, price: rate[a.code] / rate[b.code] });
}

const lp = async (id) => {
  const r = await fetch(`${HORIZON}/liquidity_pools/${id}`);
  return r.ok ? r.json() : null;
};

for (const p of pools) {
  const live = await lp(p.id);
  const reserves = live?.reserves.map((r) => Number(r.amount)) ?? [0, 0];
  if (!reserves[0]) {
    // open: the desk trusts both assets and the pool share, the issuer funds it, the desk deposits at Reflector's rate
    const amtA = p.a.code === "tEUR" ? DEPTH_EUR : DEPTH_EUR / p.price;
    const amtB = amtA * p.price;
    const tx = await build(desk, [
      Operation.changeTrust({ asset: p.a }),
      Operation.changeTrust({ asset: p.b }),
      Operation.changeTrust({ asset: p.share }),
      Operation.payment({ source: issuer.publicKey(), destination: desk.publicKey(), asset: p.a, amount: amtA.toFixed(7) }),
      Operation.payment({ source: issuer.publicKey(), destination: desk.publicKey(), asset: p.b, amount: amtB.toFixed(7) }),
      Operation.liquidityPoolDeposit({ liquidityPoolId: p.id, maxAmountA: amtA.toFixed(7), maxAmountB: amtB.toFixed(7), minPrice: (1 / p.price / 1.001).toFixed(7), maxPrice: (1 / p.price * 1.001).toFixed(7) }), // bounds on depositA/depositB
    ]);
    tx.sign(desk, issuer);
    console.log(`opened ${p.a.code}/${p.b.code} pool ${p.id.slice(0, 8)}… at ${p.price.toFixed(5)}: ${await send(tx)}`);
    continue;
  }
  // re-peg: constant product x·y = k, so the target reserves are x' = √(k/p), y' = √(k·p)
  const [x, y] = reserves;
  const k = x * y;
  const [tx_, ty] = [Math.sqrt(k / p.price), Math.sqrt(k * p.price)];
  const drift = Math.abs(y / x / p.price - 1);
  if (drift < 0.0005) { console.log(`${p.a.code}/${p.b.code} on Reflector's rate (drift ${(drift * 100).toFixed(3)}%)`); continue; }
  // the issuer mints the scarce side into the pool; what comes out goes to the desk
  const [give, get, amount] = tx_ > x ? [p.a, p.b, tx_ - x] : [p.b, p.a, ty - y];
  const tx = await build(desk, [Operation.pathPaymentStrictSend({ source: issuer.publicKey(), sendAsset: give, sendAmount: amount.toFixed(7), destination: desk.publicKey(), destAsset: get, destMin: "0.0000001", path: [] })]);
  tx.sign(desk, issuer);
  console.log(`re-pegged ${p.a.code}/${p.b.code} (drift ${(drift * 100).toFixed(3)}%): ${await send(tx)}`);
}
