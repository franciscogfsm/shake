// Ship mode resolver: splits a disputed deal between buyer and seller (the contract allows nothing else).
// Usage: node scripts/resolve.mjs <dealId> <toBuyer in euros, e.g. 2.5>   (the rest goes to the seller)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const [dealId, euros] = process.argv.slice(2);
if (!/^\d+$/.test(dealId ?? "") || !(Number(euros) >= 0)) throw new Error("usage: node scripts/resolve.mjs <dealId> <toBuyer euros>");
const win = "C:\\Program Files (x86)\\Stellar CLI\\stellar.exe";
const cli = existsSync(win) ? win : "stellar";
const units = String(Math.round(Number(euros) * 1e7)); // tokens have 7 decimals
const out = execFileSync(cli, ["contract", "invoke", "--id", env.NEXT_PUBLIC_DEAL_CONTRACT_ID, "--source-account", env.TEAM_SECRET, "--network", "testnet", "--send", "yes", "--", "resolve", "--deal_id", dealId, "--to_buyer", units], { encoding: "utf8" });
console.log(out.trim() || `resolved deal ${dealId}: ${euros} back to the buyer, the rest to the seller`);
