// `npm run dev` runs this first (predev). On a fresh clone it makes a private testnet setup in about a minute,
// with no Rust and no Stellar CLI:
//   - three throwaway accounts funded by Friendbot: issuer (mints test money), sponsor (pays fees and reserves), team (pitch seller);
//   - tEUR, tUSD, tGBP and tBRL from that issuer, each wrapped as a Stellar Asset Contract, trusted by the team;
//   - the 24 channel accounts that submit transactions;
//   - it uses the public SHAKE deal contract (it has no admin: anyone can lock their own tokens in it).
// Writes .env.local (git-ignored). Does nothing when .env.local is already complete. Prints public keys only.
import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../.env.local", import.meta.url);
const PASS = "Test SDF Network ; September 2015";
const DEAL = "CAQ6KAVIUSXSO2A6T44TC6USH3WP67R7YYORMLMLVTRG6ZDBHGQIZ2JW"; // the public SHAKE deal contract on testnet
const CODES = ["EUR", "USD", "GBP", "BRL"];
const NEEDED = ["NEXT_PUBLIC_DEAL_CONTRACT_ID", "NEXT_PUBLIC_TOKEN_EUR", "NEXT_PUBLIC_TOKEN_ISSUER", "NEXT_PUBLIC_TEAM_ADDRESS", "ISSUER_SECRET", "SPONSOR_SECRET", "TEAM_SECRET"];

const read = () => (existsSync(FILE) ? readFileSync(FILE, "utf8") : "");
const env = Object.fromEntries(read().split(/\r?\n/).filter((l) => /^[A-Z_]+=./.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (NEEDED.every((k) => env[k])) process.exit(0);

console.log("SHAKE: first run, making your own testnet setup (about a minute)…");
const server = new rpc.Server("https://soroban-testnet.stellar.org");
const [issuer, sponsor, team] = [Keypair.random(), Keypair.random(), Keypair.random()];

const friendbot = async (kp) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://friendbot.stellar.org/?addr=${kp.publicKey()}`);
    if (r.ok) return;
    await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
  }
  throw new Error("Friendbot didn't fund a new account. Check your connection to the Stellar testnet and run npm run dev again.");
};
const send = async (tx) => {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`transaction refused: ${sent.errorResult?.result().switch().name}`);
  const done = await server.pollTransaction(sent.hash, { attempts: 40 });
  if (done.status !== "SUCCESS") throw new Error(`transaction ${sent.hash} ${done.status}`);
  return sent.hash;
};
const build = async (source, ops, fee = BASE_FEE) => {
  const b = new TransactionBuilder(await server.getAccount(source.publicKey()), { fee, networkPassphrase: PASS });
  for (const op of ops) b.addOperation(op);
  return b.setTimeout(120).build();
};

await Promise.all([issuer, sponsor, team].map(friendbot));
console.log(`  accounts  issuer ${issuer.publicKey().slice(0, 8)}…  sponsor ${sponsor.publicKey().slice(0, 8)}…  team ${team.publicKey().slice(0, 8)}…`);

const assets = CODES.map((c) => new Asset(`t${c}`, issuer.publicKey()));
// the team receives released money, so it trusts every test currency
const trust = await build(team, assets.map((asset) => Operation.changeTrust({ asset })));
trust.sign(team);
await send(trust);

const tokens = {};
for (const [i, asset] of assets.entries()) {
  const tx = await server.prepareTransaction(await build(issuer, [Operation.createStellarAssetContract({ asset })]));
  tx.sign(issuer);
  await send(tx);
  tokens[CODES[i]] = asset.contractId(PASS);
  console.log(`  t${CODES[i]}  ${tokens[CODES[i]]}`);
}

// keep anything else already in .env.local (e.g. CHANNELS_API_KEY)
const set = {
  NEXT_PUBLIC_NETWORK: "testnet",
  NEXT_PUBLIC_DEAL_CONTRACT_ID: env.NEXT_PUBLIC_DEAL_CONTRACT_ID || DEAL,
  NEXT_PUBLIC_TOKEN_CONTRACT_ID: tokens.EUR,
  ...Object.fromEntries(CODES.map((c) => [`NEXT_PUBLIC_TOKEN_${c}`, tokens[c]])),
  NEXT_PUBLIC_TOKEN_ISSUER: issuer.publicKey(),
  NEXT_PUBLIC_TEAM_ADDRESS: team.publicKey(),
  ISSUER_SECRET: issuer.secret(),
  SPONSOR_SECRET: sponsor.secret(),
  TEAM_SECRET: team.secret(),
};
const kept = read().split(/\r?\n/).filter((l) => l && !(l.slice(0, l.indexOf("=")) in set));
writeFileSync(FILE, [...kept, ...Object.entries(set).map(([k, v]) => `${k}=${v}`)].join("\n") + "\n");
console.log("  wrote .env.local (secrets stay on this machine)");

// 24 channels at 300 XLM each, no top-up round on a fresh setup
const ch = spawnSync(process.execPath, [new URL("./channels.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], { stdio: "inherit", env: { ...process.env, CHANNEL_START: "300", CHANNEL_LOW: "0" } });
if (ch.status !== 0) throw new Error("Couldn't create the channel accounts. Run node scripts/channels.mjs to retry.");
console.log("SHAKE: ready.\n");
