"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Mark } from "@/components/Mark";
import { Item, Screen, Stagger, Steps, TestnetNote } from "@/components/ui";
import { TOKEN_CONTRACT_ID, formatEuro, newDealId, toUnits } from "@/lib/config";
import { ApiError, callDeal, ensureAccount, getKeypair } from "@/lib/client/wallet";
import { dealMeta } from "@/lib/client/handshake";

const MAX = 2000;
const DAY = 24 * 60 * 60;
type Phase = "form" | "locking" | "failed";
const STEPS = [
  { key: "account", label: "Setting up your money" },
  { key: "preparing", label: "Preparing the lock" },
  { key: "signing", label: "Signing on this phone" },
  { key: "confirming", label: "Confirming on the network" },
];

export default function NewDeal() {
  const router = useRouter();
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [seller, setSeller] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const euros = Number(price.replace(",", "."));
  const valid = item.trim().length > 1 && euros >= 1 && euros <= MAX;

  const lock = async () => {
    if (!valid || busy.current) return;
    busy.current = true;
    setPhase("locking");
    setError("");
    try {
      const kp = getKeypair();
      setStep("account");
      await ensureAccount(kp, euros);
      const dealId = newDealId();
      const expiry = String(Math.floor(Date.now() / 1000) + DAY);
      await callDeal(kp, "lock", { buyer: kp.publicKey(), token: TOKEN_CONTRACT_ID, amount: toUnits(euros).toString(), dealId, expiry }, setStep);
      dealMeta.set(dealId, { item: item.trim(), seller: seller.trim() });
      const q = new URLSearchParams({ i: item.trim(), ...(seller.trim() ? { s: seller.trim() } : {}) });
      router.replace(`/deal/${dealId}?${q}&new=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The network didn't answer in time. Your money is safe; nothing was locked.");
      setPhase("failed");
    } finally {
      busy.current = false;
    }
  };

  return (
    <Screen back="/try">
      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.form
            key="form"
            exit={{ opacity: 0, scale: 0.98 }}
            onSubmit={(e) => {
              e.preventDefault();
              lock();
            }}
            className="flex flex-1 flex-col"
          >
            <Stagger className="flex flex-1 flex-col gap-8 pt-6">
              <Item>
                <div className="eyebrow">New safe payment</div>
                <h1 className="display mt-3 text-[40px]">What are you buying?</h1>
              </Item>
              <Item>
                <label htmlFor="item" className="sr-only">Item</label>
                <input
                  id="item"
                  value={item}
                  onChange={(e) => setItem(e.target.value.slice(0, 48))}
                  placeholder="iPhone 13, 128GB"
                  autoComplete="off"
                  className="w-full border-b border-line bg-transparent pb-3 font-display text-2xl tracking-[-0.02em] text-ink outline-none placeholder:text-white/25 focus:border-safe"
                />
              </Item>
              <Item>
                <label htmlFor="price" className="eyebrow">Price</label>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="amount text-[44px] text-ink-2">€</span>
                  <input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, "").slice(0, 7))}
                    inputMode="decimal"
                    placeholder="0"
                    autoComplete="off"
                    className="amount w-full bg-transparent text-[88px] text-ink outline-none placeholder:text-white/20 [text-shadow:none]"
                    aria-describedby="price-hint"
                  />
                </div>
                {euros > MAX && <p id="price-hint" className="mt-1 text-sm text-ink-2">Test deals go up to {formatEuro(MAX)}.</p>}
              </Item>
              <Item>
                <label htmlFor="seller" className="eyebrow">Seller (optional)</label>
                <input
                  id="seller"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value.slice(0, 32))}
                  placeholder="@rita on OLX"
                  autoComplete="off"
                  className="mt-2 w-full border-b border-line bg-transparent pb-2 text-lg text-ink outline-none placeholder:text-white/25 focus:border-safe"
                />
              </Item>
              <div className="flex-1" />
              <Item className="flex flex-col gap-3">
                <p className="text-center text-[15px] text-ink-2">Held safely until you shake. Refunded if you don&apos;t.</p>
                <Button type="submit" full disabled={!valid}>
                  {valid ? `Lock ${formatEuro(euros)}` : "Lock"}
                </Button>
                <TestnetNote />
              </Item>
            </Stagger>
          </motion.form>
        )}

        {phase !== "form" && (
          <motion.div key="locking" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-10">
            <Mark size={96} state={phase === "failed" ? "open" : "rest"} />
            <div className="text-center">
              <div className="eyebrow">{item}</div>
              <div className="amount mt-3 text-[64px]">{formatEuro(euros)}</div>
            </div>
            {phase === "locking" ? (
              <div className="glass w-full p-6">
                <Steps steps={STEPS} current={step} />
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-4 text-center">
                <p className="max-w-[30ch] text-ink-2" role="alert">{error}</p>
                <Button full onClick={lock}>Try again</Button>
                <Button variant="ghost" onClick={() => setPhase("form")}>Edit deal</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
