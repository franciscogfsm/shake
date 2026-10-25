"use client";
import { useEffect } from "react";

/** Moves the specular highlight on every .glass element with the pointer (desktop) or tilt (iPhone, once allowed). */
export function GlassSheen() {
  useEffect(() => {
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      for (const el of document.querySelectorAll<HTMLElement>(".glass")) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        el.style.setProperty("--mx", `${x - r.left}px`);
        el.style.setProperty("--my", `${y - r.top}px`);
      }
    };
    const schedule = () => (frame ||= requestAnimationFrame(paint));
    const onPointer = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      schedule();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      x = innerWidth / 2 + (e.gamma / 45) * innerWidth;
      y = (Math.min(Math.max(e.beta, 0), 90) / 90) * innerHeight * 0.6;
      schedule();
    };
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      removeEventListener("pointermove", onPointer);
      removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

/** iOS needs a user gesture before it shares tilt; call this from any tap. */
export async function enableTilt() {
  const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
  try {
    if (typeof D?.requestPermission === "function") await D.requestPermission();
  } catch {}
}
