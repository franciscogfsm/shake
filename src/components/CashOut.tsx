"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CURRENCIES, explorer, formatMoney, type CurrencyCode } from "@/lib/config";
import { authenticate, discover, getTransaction, startWithdraw, type AnchorInfo, type Sep24Tx } from "@/lib/client/sep24";
import { getKeypair } from "@/lib/client/wallet";
import { Button } from "./Button";
import { GlassSheet } from "./GlassSheet";
import { Steps } from "./ui";

type Phase = "connecting" | "details" | "sending" | "settling" | "done" | "error";
const STEPS = [
  { key: "connecting", label: "Signing in to the anchor (SEP-10)" },
  { key: "details", label: "Your bank details" },
  { key: "sending", label: "Sending the money to the anchor" },
  { key: "settling", label: "Anchor pays out to your bank" },
];

/** Shake to Bank: the released money leaves Stellar through a SEP-24 anchor to an IBAN, without leaving SHAKE. */
export function CashOut({ amount, currency, locale }: { amount: number; currency: CurrencyCode; locale: string }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Sep24Tx | null>(null);
  const [err, setErr] = useState("");
  const ctx = useRef<{ anchor: AnchorInfo; jwt: string } | null>(null);
  const asset = CURRENCIES[currency].asset;
  const money = formatMoney(amount, currency, locale);

  const start = async () => {
    setOpen(true);
    setErr("");
    setPhase("connecting");
    try {
      const kp = getKeypair();
      const anchor = await discover(location.origin);
      const jwt = await authenticate(anchor, kp);
      ctx.current = { anchor, jwt };
      const w = await startWithdraw(anchor, jwt, asset, amount.toFixed(2), kp.publicKey());
      setUrl(w.url);
      setPhase("details");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The anchor didn't answer.");
      setPhase("error");
    }
  };

  // SEP-24: the anchor's page hands the transaction back via postMessage
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data?.transaction) return;
      const tx: Sep24Tx = e.data.transaction;
      if (tx.status !== "pending_user_transfer_start" || !ctx.current) return;
      setPhase("sending");
      try {
        const kp = getKeypair();
        const post = (body: object) => fetch("/api/wallet/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error);
          return j;
        });
        const prep = await post({ action: "prepare", publicKey: kp.publicKey(), asset, amount: tx.amount_in, memo: tx.withdraw_memo });
        const { TransactionBuilder } = await import("@stellar/stellar-sdk");
        const signed = TransactionBuilder.fromXDR(prep.xdr, "Test SDF Network ; September 2015");
        signed.sign(kp);
        await post({ action: "submit", publicKey: kp.publicKey(), xdr: signed.toXDR() });
        setPhase("settling");
        for (let i = 0; i < 20; i++) {
          const status = await getTransaction(ctx.current.anchor, ctx.current.jwt, tx.id);
          if (status.status === "completed") {
            setResult(status);
            setPhase("done");
            navigator.vibrate?.([20, 40, 20]);
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        throw new Error("The anchor is taking longer than usual. Your money is safe.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't send to the anchor.");
        setPhase("error");
      }
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, [asset]);

  return (
    <>
      <Button full onClick={start}>
        <BankIcon /> Try bank withdrawal · {money}
      </Button>
      <GlassSheet open={open} onClose={() => phase !== "sending" && setOpen(false)} label="Send to your bank">
        <div className="flex flex-col gap-5 pb-3">
          <div>
            <div className="eyebrow">Shake to bank · SEP-24 anchor</div>
            <h2 className="display mt-2 text-[28px]">{phase === "done" ? "On its way to your bank." : `Cash out ${money}`}</h2>
          </div>
          <AnimatePresence mode="wait">
            {phase === "details" ? (
              <motion.iframe
                key="iframe"
                src={url}
                title="Anchor: your bank details"
                className="h-[430px] w-full rounded-[22px] border border-line bg-bg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              />
            ) : phase === "done" && result ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-safe text-on-safe"><BankIcon /></span>
                  <div>
                    <div className="font-medium">{result.to}</div>
                    <div className="text-sm text-ink-2">{result.message}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 font-mono text-xs text-mute">
                  <span>Anchor ref</span>
                  <span className="text-right text-ink">{result.external_transaction_id}</span>
                  <span>On Stellar</span>
                  <a className="text-right text-safe" href={explorer.tx(result.stellar_transaction_id!)} target="_blank" rel="noreferrer">proof ↗</a>
                </div>
              </motion.div>
            ) : (
              <motion.div key="steps" className="glass p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Steps steps={STEPS} current={phase === "error" ? null : phase} />
                {phase === "error" && (
                  <div className="mt-4 flex flex-col gap-3">
                    <p className="text-sm text-ink-2" role="alert">{err}</p>
                    <Button variant="glass" onClick={start}>Try again</Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-center text-xs text-mute">Demo bank transfer using a test IBAN. Real payouts and local bank details depend on the anchor&apos;s supported countries. No currency conversion.</p>
        </div>
      </GlassSheet>
    </>
  );
}

function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z" />
    </svg>
  );
}
