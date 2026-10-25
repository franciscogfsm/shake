"use client";
import { motion, useReducedMotion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { prettyCode } from "@/lib/client/handshake";
import { useNow } from "./ui";

/**
 * The seller's live QR: huge, white on a glass frame with a rotating light border and a ticking clock,
 * so a static screenshot never looks like the live screen.
 */
export function SellerQR({ payload, code }: { payload: string; code: string }) {
  const [svg, setSvg] = useState("");
  const reduce = useReducedMotion();
  const now = useNow();
  useEffect(() => {
    QRCode.toString(payload, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d0f12", light: "#ffffff" } }).then(setSvg);
  }, [payload]);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-[32px] p-[3px]">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[32px]"
          style={{ background: "conic-gradient(from 0deg, transparent 0 55%, rgba(143,211,255,.95) 70%, #fff 75%, transparent 85%)" }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        />
        <div className="glass relative rounded-[30px] p-4">
          <div className="size-[min(72vw,300px)] rounded-[18px] bg-white p-4" role="img" aria-label="Your one-time QR code" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
      <div className="text-center">
        <div className="font-mono text-xl tracking-[0.18em] text-ink">{prettyCode(code)}</div>
        <div className="mt-1 flex items-center justify-center gap-2 font-mono text-xs text-mute">
          <span className="pulse-dot" /> live · {new Date(now * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
