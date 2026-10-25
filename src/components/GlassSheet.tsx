"use client";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { springs } from "./Mark";

/** Phone: bottom sheet. Desktop: centred dialog. The close control stays put while the body scrolls. */
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

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-white/8 hover:text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export function GlassSheet({ open, onClose, children, label, fill = false, wide = false }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string; fill?: boolean; wide?: boolean }) {
  const phone = usePhoneSheet();
  const reduce = useReducedMotion();
  const drag = useDragControls();
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
            className={`glass glass-strong relative z-10 flex w-full flex-col overflow-hidden ${
              phone
                ? `max-w-[480px] rounded-t-[28px] rounded-b-none ${fill ? "h-[min(92dvh,760px)]" : "max-h-[92dvh]"}`
                : `max-h-[min(760px,calc(100dvh-4rem))] rounded-[28px] ${fill ? "h-[min(720px,calc(100dvh-4rem))] max-w-[720px]" : wide ? "max-w-[640px]" : "max-w-[480px]"}`
            }`}
            initial={phone ? { y: "100%" } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={phone ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={phone ? { y: "100%" } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={reduce ? { duration: 0.01 } : springs.smooth}
            drag={phone ? "y" : false}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => phone && (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <div
              className="relative flex h-12 shrink-0 items-center justify-center"
              onPointerDown={(e) => phone && drag.start(e)}
            >
              {phone && <div className="h-1.5 w-10 rounded-full bg-white/25" />}
              <div className="absolute right-3 top-1">
                <CloseButton onClose={onClose} />
              </div>
            </div>
            <div className={`min-h-0 px-6 lg:px-8 ${phone ? "pb-safe" : "pb-8"} ${fill ? "flex flex-1 flex-col overflow-hidden" : `overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin] ${phone ? "max-h-[calc(92dvh-4.5rem)]" : "max-h-[min(680px,calc(100dvh-8rem))]"}`}`}>
              {fill ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
