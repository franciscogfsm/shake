import { createHmac } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/http";
import {
  TEAM, UserError, buildOnboardTx, dealArgs, fund, prepareCall, readDeal, sha256Hex, signTeamEntries, submitCall, submitOnboardTx, team, teamSecret,
} from "@/lib/server/stellar";
import { CURRENCIES, DEAL_CONTRACT_ID, newDealId, toUnits } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const AMOUNT = 10; // the deck's fixed 10€; never taken from the request

// The judge's wallet for the deck, derived from a random nonce kept in their tab: no keys stored or sent anywhere.
const judge = (nonce: unknown) => {
  if (typeof nonce !== "string" || !/^[0-9a-f]{32,64}$/.test(nonce)) throw new UserError("Missing session");
  return Keypair.fromRawEd25519Seed(createHmac("sha256", team().secret()).update(`deck:${nonce}`).digest());
};

async function call(fn: "lock" | "accept" | "release" | "refund", args: Record<string, string>, signer: Keypair) {
  const prepared = await prepareCall(fn, dealArgs(fn, args));
  return submitCall(prepared.func, await signTeamEntries(prepared.auth, prepared.latestLedger, signer));
}

/** The pitch deck at /pitch runs a real deal: wallet → lock → the team joins → release (hold to shake) or refund (not yet). */
export async function POST(req: Request) {
  try {
    const { action, nonce, dealId } = (await req.json()) ?? {};
    const kp = judge(nonce);

    if (action === "lock") {
      const tx = await buildOnboardTx(kp.publicKey(), AMOUNT, "EUR");
      let walletTx: string | null;
      if (tx) {
        tx.sign(kp);
        walletTx = await submitOnboardTx(tx.toXDR(), kp.publicKey());
      } else walletTx = await fund(kp.publicKey(), AMOUNT, "EUR");
      const id = newDealId();
      const expiry = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
      const locked = await call("lock", { buyer: kp.publicKey(), token: CURRENCIES.EUR.token, amount: toUnits(AMOUNT).toString(), dealId: id, expiry, memo: "SHAKE pitch deck" }, kp);
      // the team is the seller: it joins and commits the hash of its one-time QR secret
      const joined = await call("accept", { dealId: id, seller: TEAM, hash: sha256Hex(teamSecret(id)) }, team());
      return NextResponse.json({ dealId: id, contract: DEAL_CONTRACT_ID, wallet: kp.publicKey(), walletTx, txHash: locked.hash, joinTx: joined.hash });
    }

    if (typeof dealId !== "string" || !/^\d{1,16}$/.test(dealId)) throw new UserError("Not a deal");
    const deal = await readDeal(dealId);
    if (!deal) throw new UserError("We couldn't find this deal.", 404);
    if (deal.buyer !== kp.publicKey() || deal.seller !== TEAM) throw new UserError("Not your deck deal", 403);

    if (action === "release") {
      if (deal.status === "Released") return NextResponse.json({ txHash: null, already: true });
      const r = await call("release", { dealId, secret: teamSecret(dealId) }, kp);
      return NextResponse.json({ txHash: r.hash });
    }
    if (action === "refund") {
      if (deal.status === "Refunded") return NextResponse.json({ txHash: null, already: true });
      const r = await call("refund", { dealId }, team());
      return NextResponse.json({ txHash: r.hash });
    }
    throw new UserError("Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
