"use client";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type Props = { onCode: (text: string) => void; paused?: boolean };
type CamState = "ask" | "starting" | "live" | "denied" | "unavailable";

/** Full-bleed camera viewfinder with custom corners and a scanning shimmer. Explains why before the browser prompt. */
export function Scanner({ onCode, paused, className = "" }: Props & { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [cam, setCam] = useState<CamState>("ask");
  const stopRef = useRef<() => void>(() => {});
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const start = async () => {
    setCam("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: "NotFoundError" });
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120 });
      const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current!, (result) => {
        if (result && !pausedRef.current) onCodeRef.current(result.getText());
      });
      stopRef.current = () => controls.stop();
      setCam("live");
    } catch (e) {
      const name = (e as Error)?.name;
      setCam(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
    }
  };

  useEffect(() => () => stopRef.current(), []);

  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-[28px] bg-black/60 lg:aspect-square ${className}`}>
      <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted aria-label="Camera viewfinder" />
      {cam === "live" && (
        <>
          <div className="pointer-events-none absolute inset-[14%]">
            {["left-0 top-0 border-l-2 border-t-2 rounded-tl-2xl", "right-0 top-0 border-r-2 border-t-2 rounded-tr-2xl", "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-2xl", "right-0 bottom-0 border-r-2 border-b-2 rounded-br-2xl"].map((c) => (
              <span key={c} className={`absolute size-10 border-safe ${c}`} style={{ filter: "drop-shadow(0 0 6px rgba(143,211,255,.8))" }} />
            ))}
            <motion.span
              className="absolute inset-x-2 h-16 rounded-full"
              style={{ background: "linear-gradient(180deg, transparent, rgba(143,211,255,.28), transparent)" }}
              animate={{ top: ["0%", "80%", "0%"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="absolute inset-x-0 bottom-4 text-center text-sm text-ink-2">Point at the seller&apos;s QR</div>
        </>
      )}
      {cam !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
          {cam === "ask" || cam === "starting" ? (
            <>
              <p className="max-w-[26ch] text-ink-2">We use the camera only to read the seller&apos;s code. Nothing is recorded.</p>
              <Button onClick={start} loading={cam === "starting"}>
                Turn on camera
              </Button>
            </>
          ) : cam === "denied" ? (
            <>
              <p className="max-w-[28ch] text-ink-2">Camera is blocked. Allow it in your browser settings, or type the code under the seller&apos;s QR.</p>
              <Button variant="glass" onClick={start}>
                Try again
              </Button>
            </>
          ) : (
            <p className="max-w-[28ch] text-ink-2">No camera here. Type the code shown under the seller&apos;s QR instead.</p>
          )}
        </div>
      )}
    </div>
  );
}
