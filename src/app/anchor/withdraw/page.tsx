"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/Button";

/**
 * SEP-24 interactive page served by the SHAKE anchor. Opened by the wallet (here: SHAKE itself, in a sheet).
 * Collects bank details, then hands the transaction back to the wallet via postMessage, as SEP-24 specifies.
 */
export default function AnchorWithdraw() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

function Form() {
  const t = useSearchParams().get("t") ?? "";
  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  let amount = "";
  let asset = "";
  try {
    const w = JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));
    amount = w.amount;
    asset = w.asset;
  } catch {}

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/anchor/kyc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t, name, iban }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const target = window.parent !== window ? window.parent : window.opener;
      target?.postMessage({ transaction: json.transaction }, location.origin);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const grouped = iban.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col gap-5 bg-[#0d0f12] px-5 py-6">
      <div>
        <div className="eyebrow">SHAKE anchor · SEP-24 · sandbox</div>
        <h1 className="display mt-2 text-[28px]">Withdraw {amount} {asset?.replace(/^t/, "")} · test mode</h1>
        <p className="mt-1.5 text-sm text-ink-2">Your transfer to the anchor settles on Stellar Testnet. Bank settlement is simulated and does not credit a bank account. Use test details below.</p>
      </div>
      {done ? (
        <div className="glass p-5 text-center" role="status">
          <div className="font-display text-xl">Details saved</div>
          <p className="mt-1 text-sm text-ink-2">Back in SHAKE, confirm to send the money.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Account holder</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Pedro Santos" className="h-13 rounded-2xl bg-white/6 px-4 text-ink outline-none focus:bg-white/10" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">IBAN</span>
            <input
              value={grouped}
              onChange={(e) => setIban(e.target.value.slice(0, 42))}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              placeholder="PT50 0002 0123 1234 5678 9015 4"
              className="h-13 rounded-2xl bg-white/6 px-4 font-mono tracking-[0.04em] text-ink outline-none focus:bg-white/10"
              required
            />
          </label>
          {err && <p className="text-sm text-ink-2" role="alert">{err}</p>}
          <Button type="submit" full loading={busy}>Continue</Button>
          <button type="button" onClick={() => { setName("Pedro Santos"); setIban("PT50000201231234567890154"); }} className="text-sm text-mute underline-offset-4 hover:underline">
            Use a test IBAN
          </button>
        </form>
      )}
    </main>
  );
}
