"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { springs } from "./Mark";

/** Phone: bottom sheet. Desktop: centred dialog. Drag-to-dismiss stays on the phone. */
function usePhoneSheet() {
  const [phone, setPhone] = useState(true);
  useEffect(() => {
    const mq = matchMedia("(max-width: 1023px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return phone;
}

export function GlassSheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  const phone = usePhoneSheet();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-50 flex justify-center ${phone ? "items-end" : "items-center p-8"}`} role="dialog" aria-modal="true" aria-label={label}>
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-black/60 lg:bg-black/70 lg:backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`glass glass-strong relative z-10 w-full max-w-[480px] ${
              phone
                ? "rounded-t-[28px] rounded-b-none px-6 pt-3 pb-safe"
                : "max-h-[min(760px,calc(100dvh-4rem))] overflow-y-auto rounded-[28px] p-8"
            }`}
            initial={phone ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={phone ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={phone ? { y: "100%" } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={reduce ? { duration: 0.01 } : springs.smooth}
            drag={phone ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => phone && (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            {phone ? (
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/25" />
            ) : (
              <div className="mb-2 flex justify-end">
                <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-2 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-white/8 hover:text-ink">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
