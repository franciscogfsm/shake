"use client";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./Button";
import { GlassSheet } from "./GlassSheet";
import { springs } from "./Mark";
import { CURRENCIES, explorer, type CurrencyCode } from "@/lib/config";
import { NIDO_BASE, NIDO_DAILY_CAP, approveNido, checkNido, connectNido, createNidoAccount, createNidoDeviceKey, createNidoPasskey, disconnectNido, nidoAddress, nidoSignsSilently, nidoStatus, type NidoStatus } from "@/lib/client/nido";
import { haptic } from "@/lib/client/sfx";

/** Nido's nest-ring mark, as its wallet module ships it (Apache-2.0). */
export function NidoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="shrink-0">
      <rect width="120" height="120" rx="26" fill="#FFF8F0" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="#F25C2A" strokeWidth="6" strokeDasharray="14 9" strokeLinecap="round" />
      <circle cx="60" cy="60" r="23" fill="none" stroke="#F5A623" strokeWidth="6" strokeDasharray="11 8" strokeLinecap="round" />
      <circle cx="60" cy="60" r="9" fill="#0E9AA8" />
    </svg>
  );
}

const COPY: Record<Exclude<NidoStatus, "ready">, { title: string; body: string; cta: string; note: string }> = {
  connect: {
    title: "Set up Face ID payments",
    body: "Your Face ID wallet is a Nido: a smart account on Stellar that only opens with your face. Create yours in seconds.",
    cta: "Create my Nido",
    note: "Only your public address is shared. Nothing is signed.",
  },
  passkey: {
    title: "Give SHAKE its own key",
    body: "Your phone makes a passkey just for SHAKE. Its private key never leaves this device, and it can only do what you allow next.",
    cta: "Create with Face ID",
    note: "One Face ID. No password, nothing to write down.",
  },
  approve: {
    title: "Set SHAKE's limits",
    body: "",
    cta: "Approve in Nido",
    note: "In Nido, review SHAKE's rules and confirm with Face ID. The daily caps are on the currency rules.",
  },
};

/**
 * Pay from a real Nido smart account: connect → SHAKE's key (made here without a prompt; a Face ID passkey only
 * if this browser can't keep one) → the owner approves the rules once. Each Nido step is its own tap, so no popup is blocked.
 */
export function NidoSheet({ open, onClose, onReady, currency }: { open: boolean; onClose: () => void; onReady: () => void; currency: CurrencyCode }) {
  const [status, setStatus] = useState<NidoStatus>("connect");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  /** This browser couldn't keep a key, so SHAKE's key is a passkey: one more step, and Face ID on each payment. */
  const [passkeyOnly, setPasskeyOnly] = useState(false);
  const steps: Exclude<NidoStatus, "ready">[] = passkeyOnly ? ["connect", "passkey", "approve"] : ["connect", "approve"];

  /** Take every step that needs no tap: make SHAKE's browser key, and read approvals that are already on chain. */
  const advance = useCallback(async () => {
    let s = nidoStatus(currency);
    if (s === "passkey") {
      try {
        await createNidoDeviceKey();
        s = nidoStatus(currency);
      } catch {
        setPasskeyOnly(true);
      }
    }
    if (s === "approve" && (await checkNido(currency).catch(() => false))) s = "ready";
    // a Face ID passkey from before needs approving again anyway: swap it for a browser key while we're at it
    if (s === "approve" && !nidoSignsSilently()) await createNidoDeviceKey().catch(() => setPasskeyOnly(true));
    setAccount(nidoAddress());
    return s;
  }, [currency]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setError("");
    setAccount(nidoAddress());
    const now = nidoStatus(currency);
    if (now === "ready") return onReady();
    setStatus(now);
    if (now === "connect") return;
    setBusy(true);
    advance()
      .then((s) => {
        if (!live) return;
        if (s === "ready") onReady();
        else setStatus(s);
      })
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [open, currency, onReady, advance]);

  const run = async (step: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await step();
      const s = await advance();
      haptic.success();
      if (s === "ready") onReady();
      else setStatus(s);
    } catch (e) {
      // WebAuthn's NotAllowedError covers a cancelled or timed-out Face ID; its message is a spec link
      const msg = e instanceof DOMException && e.name === "NotAllowedError" ? "Face ID didn't finish. Tap to try again." : e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(status === "connect" && /closed/.test(msg) ? "Nido's window closed. Tap again to continue." : msg);
    } finally {
      setBusy(false);
    }
  };

  const c = status === "ready" ? null : COPY[status];
  const at = Math.max(0, steps.indexOf(status as (typeof steps)[number]));
  const asset = CURRENCIES[currency].asset;
  return (
    <GlassSheet open={open} onClose={onClose} label="Set up Face ID payments">
      {c && (
        <div className="flex flex-col pb-5">
          <div className="flex items-center gap-2.5">
            <NidoMark />
            <span className="eyebrow">Nido × SHAKE · on Stellar</span>
          </div>
          <div className="mt-4 flex gap-1.5" aria-label={`Step ${at + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.span className="block h-full origin-left rounded-full bg-safe" initial={false} animate={{ scaleX: i <= at ? 1 : 0 }} transition={springs.smooth} />
              </span>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={status} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={springs.snappy}>
              <h2 className="display mt-5 text-[30px] leading-none lg:text-[34px]">{c.title}</h2>
              {status === "approve" ? (
                <>
                  <ul className="mt-4 flex flex-col gap-2 text-[15px] text-ink-2">
                    <li className="flex gap-2.5"><span className="text-safe">✓</span>Lock, release or refund your SHAKE payments</li>
                    <li className="flex gap-2.5"><span className="text-safe">✓</span>Move up to {NIDO_DAILY_CAP.toLocaleString("en")} {asset} a day (the same in each currency), only into the SHAKE contract</li>
                    <li className="flex gap-2.5"><span className="text-safe">✓</span>Ends by itself in 7 days</li>
                    <li className="flex gap-2.5"><span className="text-mute">✕</span><span className="text-mute">Pay anyone else. Your account refuses it on chain.</span></li>
                  </ul>
                  {!passkeyOnly && <p className="mt-4 text-[15px] text-ink-2">One Face ID in Nido now. Then this browser pays within these limits, with no more Face ID.</p>}
                </>
              ) : (
                <p className="mt-3 text-[15px] text-ink-2">{c.body}</p>
              )}
            </motion.div>
          </AnimatePresence>
          {account && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm">
              <NidoMark size={18} />
              <a href={explorer.contract(account)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-mono text-ink-2 underline-offset-4 hover:underline">
                {account.slice(0, 6)}…{account.slice(-6)} ↗
              </a>
              <button type="button" className="shrink-0 text-mute underline-offset-4 hover:underline" onClick={() => { disconnectNido(); setAccount(null); setStatus("connect"); }}>
                Switch
              </button>
            </div>
          )}
          {status === "connect" && busy && <p className="mt-5 text-[15px] text-ink-2" aria-live="polite">Finish with Face ID in Nido’s window. It closes by itself when your Nido is ready.</p>}
          <Button
            full
            className="mt-6"
            loading={busy}
            onClick={() => run(status === "connect" ? createNidoAccount : status === "passkey" ? createNidoPasskey : () => approveNido(currency))}
          >
            {c.cta}
          </Button>
          {error && <p role="alert" className="mt-3 text-center text-sm text-danger">{error}</p>}
          <p className="mt-3 text-center text-xs text-mute">{c.note}</p>
          {status === "connect" && (
            <button type="button" disabled={busy} className="mt-2 text-sm text-mute underline-offset-4 hover:underline" onClick={() => run(connectNido)}>
              I already have a Nido
            </button>
          )}
          {status === "approve" && (
            <button type="button" disabled={busy} className="mt-2 text-sm text-mute underline-offset-4 hover:underline" onClick={() => run(() => checkNido(currency))}>
              Already approved? Check again
            </button>
          )}
          <p className="mt-4 text-center text-xs text-mute">
            Test money on Stellar testnet ·{" "}
            <a href={NIDO_BASE} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">What is Nido? ↗</a>
          </p>
        </div>
      )}
    </GlassSheet>
  );
}
