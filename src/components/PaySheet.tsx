"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GlassSheet } from "./GlassSheet";
import { springs } from "./Mark";
import { haptic, sfx } from "@/lib/client/sfx";
import { COUNTRIES, availableCurrencies, formatMoney, moneyParts, type CurrencyCode } from "@/lib/config";

/* Brand marks: Simple Icons (CC0) paths, Mastercard drawn from its circles. Sized by height, width follows the viewBox. */
const P = {
  applepay: "M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z",
  googlepay: "M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z",
  visa: "M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z",
  paypalBack: "M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087z",
  paypalFront: "M19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z",
  pix: "M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156",
  revolut: "M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z",
  sepa: "M12.553 8.72v6.56h1.766v-1.694h1.052l.293-.01c.579-.009.907-.02.984-.033.656-.086 1.09-.418 1.3-.994.106-.29.16-.769.16-1.434 0-.553-.049-.968-.145-1.243-.185-.524-.548-.871-1.09-1.04-.236-.074-.58-.111-1.031-.111zm6.79 0l-1.971 6.56h1.826l.317-1.134h2.36l.337 1.133H24l-1.995-6.558zm-9.339.031a3.36 3.36 0 0 0-1.888.574 3.272 3.272 0 0 0-1.199 1.455h-.742l-.464.996h.969a3.17 3.17 0 0 0 .004.526h-.467l-.465.995H6.94a3.333 3.333 0 0 0 3.064 1.973 3.37 3.37 0 0 0 1.876-.564l.013-.009v-1.241l-.05.056a2.293 2.293 0 0 1-3.618-.215h2.396l.465-.995H7.838a2.356 2.356 0 0 1-.012-.526h3.505l.008-.017.438-.939.019-.04H8.154a2.308 2.308 0 0 1 1.963-1.108c.694 0 1.344.31 1.783.85l.028.035.409-.875-.015-.014a3.359 3.359 0 0 0-2.318-.917zm-7.2.004c-.439 0-.837.016-1.196.048-.43.034-.785.15-1.062.348a1.082 1.082 0 0 0-.41.565c-.086.248-.128.578-.128.99 0 .54.079.943.236 1.21.179.314.537.52 1.074.621.205.035.57.071 1.094.109.654.044 1.02.078 1.098.103.211.063.316.239.316.528a1.1 1.1 0 0 1-.037.315.48.48 0 0 1-.298.287c-.084.032-.281.048-.589.048h-.604a.963.963 0 0 1-.41-.09c-.164-.081-.246-.264-.246-.549v-.136H0c0 .533.04.915.118 1.143.142.412.435.685.879.82.362.11 1.003.164 1.922.164.551 0 .96-.025 1.228-.075.64-.12 1.05-.404 1.233-.853.101-.245.151-.632.151-1.16 0-.23-.01-.435-.033-.617a1.186 1.186 0 0 0-.355-.74c-.252-.242-.66-.392-1.22-.448-.177-.019-.62-.052-1.33-.1l-.331-.023a.768.768 0 0 1-.35-.094c-.124-.075-.185-.233-.185-.471 0-.264.07-.435.208-.514.139-.079.423-.118.852-.118.441 0 .71.068.808.205.063.092.095.272.095.542h1.642c.01-.145.016-.253.016-.326 0-.884-.357-1.421-1.072-1.613-.293-.079-.784-.119-1.473-.119zm17.894 1.27l.827 2.843h-1.63zm-6.38.13h1.116c.18 0 .294.004.342.01.24.042.393.157.456.345.045.134.067.34.067.617a2.9 2.9 0 0 1-.033.512c-.035.172-.105.287-.21.344-.076.042-.288.069-.637.082h-1.1Z",
};

export type MethodId = "applepay" | "googlepay" | "visa" | "mastercard" | "paypal" | "mbway" | "pix" | "sepa" | "revolut";
const NAMES: Record<MethodId, string> = { applepay: "Apple Pay", googlepay: "Google Pay", visa: "Visa", mastercard: "Mastercard", paypal: "PayPal", mbway: "MB WAY", pix: "Pix", sepa: "SEPA transfer", revolut: "Revolut Pay" };

function Svg({ vb, h, children }: { vb: string; h: number; children: React.ReactNode }) {
  const [, , w, vh] = vb.split(" ").map(Number);
  return <svg viewBox={vb} height={h} width={(h * w) / vh} aria-hidden className="block shrink-0">{children}</svg>;
}

/** A payment method's real mark, drawn for a dark background. */
export function MethodMark({ id, h = 24 }: { id: MethodId; h?: number }) {
  switch (id) {
    case "applepay": return <img src="/pay/apple.svg" alt="" className="block shrink-0" style={{ height: h }} />;
    case "googlepay":
      return (
        <svg viewBox="0 0 48 48" height={h} width={h} aria-hidden className="block shrink-0">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
      );
    case "visa":
      return (
        <span className="grid h-7 place-items-center rounded-[6px] bg-white px-1.5">
          <Svg vb="0 7.6 24 8.8" h={h * 0.46}><path fill="#1A1F71" d={P.visa} /></Svg>
        </span>
      );
    case "mastercard":
      return (
        <Svg vb="0 0 38 24" h={h * 1.05}>
          <circle cx="12" cy="12" r="10" fill="#EB001B" />
          <circle cx="26" cy="12" r="10" fill="#F79E1B" />
          <path fill="#FF5F00" d="M19 4.86A10 10 0 0 1 19 19.14A10 10 0 0 1 19 4.86Z" />
        </Svg>
      );
    case "paypal": return <Svg vb="2 0 20 24" h={h}><path fill="#fff" d={P.paypalBack} /><path fill="#009CDE" d={P.paypalFront} /></Svg>;
    case "pix": return <Svg vb="0 0 24 24" h={h}><path fill="#32BCAD" d={P.pix} /></Svg>;
    case "revolut": return <Svg vb="2 0 20 24" h={h * 0.9}><path fill="#fff" d={P.revolut} /></Svg>;
    case "sepa": return <Svg vb="0 8.5 24 7" h={h * 0.6}><path fill="#fff" d={P.sepa} /></Svg>;
    case "mbway": return <img src="/pay/mbway.svg" alt="" className="block shrink-0" style={{ height: h * 0.78 }} />;
  }
}

/** The methods people expect where they are: the wallets and cards everywhere, then the local favourite. */
function methodsFor(country: string, currency: CurrencyCode): MethodId[] {
  const local: MethodId = country === "PT" ? "mbway" : currency === "BRL" ? "pix" : currency === "EUR" ? "sepa" : "revolut";
  return ["applepay", local, "visa", "mastercard", "paypal", "googlepay"];
}

type Quote = { send: number; rate: number } | "loading" | "none";

/** One tap picks how to pay, then the lock starts. Test mode says plainly what is and isn't real. */
export function PaySheet({ open, onClose, onPay, title, money, currency, country, amount, locale }: {
  open: boolean;
  onClose: () => void;
  onPay: (method: string, payIn: CurrencyCode) => void;
  title: string;
  money: string;
  currency: CurrencyCode;
  country: string;
  /** Given with `locale`: the buyer may pay in another currency, converted on Stellar. */
  amount?: number;
  locale?: string;
}) {
  const reduce = useReducedMotion();
  const [picked, setPicked] = useState<MethodId | null>(null);
  const home = COUNTRIES.find((c) => c.code === country)?.currency ?? currency;
  const convertible = amount !== undefined && !!locale && availableCurrencies().length > 1;
  const [payIn, setPayIn] = useState<CurrencyCode>(currency);
  const [quote, setQuote] = useState<Quote>("none");
  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setPayIn(convertible && availableCurrencies().some((c) => c.code === home) ? home : currency);
  }, [open, convertible, home, currency]);
  useEffect(() => {
    if (!open || !convertible || payIn === currency) return setQuote("none");
    let live = true;
    setQuote("loading");
    fetch(`/api/fx?from=${payIn}&to=${currency}&amount=${amount}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((q) => live && setQuote({ send: q.send, rate: q.rate }))
      .catch(() => {
        // no rate, no conversion: fall back to paying in the deal's own currency
        if (live) { setQuote("none"); setPayIn(currency); }
      });
    return () => { live = false; };
  }, [open, convertible, payIn, currency, amount]);
  const methods = methodsFor(country, payIn);
  const converting = payIn !== currency;
  const fmt = (n: number, c: CurrencyCode) => formatMoney(Math.ceil(n * 100) / 100, c, locale);

  const pick = (id: MethodId) => {
    if (picked || quote === "loading") return;
    setPicked(id);
    haptic.success();
    sfx.tap();
    // long enough to see the choice land, short enough to never feel like waiting
    setTimeout(() => onPay(NAMES[id], payIn), reduce ? 0 : 420);
  };

  return (
    <GlassSheet open={open} onClose={onClose} label={title}>
      <div className="flex flex-col pb-5">
        <div className="eyebrow">Choose how to pay</div>
        <h2 className="display mt-2 text-[32px] leading-none lg:text-[36px]">{title}</h2>
        {convertible && (
          <div className="mt-5">
            <div role="radiogroup" aria-label="Pay in" className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px] text-mute">Pay in</span>
              {availableCurrencies().map((c) => {
                const on = payIn === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={c.name}
                    disabled={!!picked}
                    onClick={() => { if (!on) { haptic.tick(); setPayIn(c.code); } }}
                    className={`h-9 min-w-12 rounded-full border px-3 font-mono text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safe ${on ? "border-safe/60 bg-safe/10 text-safe" : "border-white/8 bg-white/[0.035] text-ink-2 hover:border-white/20"}`}
                  >
                    {moneyParts(1, c.code, locale).symbol}
                  </button>
                );
              })}
            </div>
            <AnimatePresence initial={false}>
              {converting && (
                <motion.p
                  key="fx"
                  aria-live="polite"
                  className="mt-3 text-[14px] leading-snug text-ink-2"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={springs.snappy}
                >
                  {typeof quote === "object" ? (
                    <>
                      You pay <span className="text-ink">{fmt(quote.send, payIn)}</span>. Stellar converts it to <span className="text-ink">{money}</span> on the way in.
                      <span className="mt-1 block font-mono text-[11px] tracking-[0.04em] text-mute">
                        Reflector rate: {formatMoney(1, currency, locale)} = {fmt(quote.rate, payIn)}
                      </span>
                    </>
                  ) : (
                    "Getting the rate from Stellar…"
                  )}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {methods.map((id, i) => {
            const on = picked === id;
            return (
              <motion.button
                key={id}
                type="button"
                aria-label={`Pay with ${NAMES[id]}`}
                onClick={() => pick(id)}
                onPointerDown={() => haptic.tick()}
                disabled={!!picked && !on}
                className={`relative flex h-[88px] flex-col items-center justify-center gap-2.5 rounded-[20px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safe ${on ? "border-safe/60 bg-safe/[0.1] shadow-[0_0_32px_rgba(143,211,255,0.22)]" : "border-white/[0.08] bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"}`}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: picked && !on ? 0.3 : 1, y: 0, scale: on ? 1.03 : 1 }}
                whileTap={picked ? undefined : { scale: 0.95 }}
                transition={{ ...springs.snappy, delay: picked ? 0 : 0.05 + i * 0.035 }}
              >
                <span className="grid h-8 place-items-center"><MethodMark id={id} h={26} /></span>
                <span className="text-[13px] text-ink-2">{NAMES[id]}</span>
                <AnimatePresence>
                  {on && (
                    <motion.span
                      className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-safe text-on-safe"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springs.slam}
                      aria-hidden
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-safe/[0.1] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-safe">
            <span className="pulse-dot !size-1.5" aria-hidden />Test mode
          </span>
          <p className="text-[14px] leading-snug text-ink-2">
            Nothing is charged. Pick any: {converting && typeof quote === "object" ? fmt(quote.send, payIn) : money} of test money comes in instead. <span className="text-ink">Every step after this is real, on Stellar.</span>
          </p>
        </div>
      </div>
    </GlassSheet>
  );
}
