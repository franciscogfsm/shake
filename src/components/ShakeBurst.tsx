"use client";
import { AnimatePresence, motion } from "motion/react";

/** The light burst when the halves slam: two expanding rings and a glacier flash. */
export function ShakeBurst({ fire, size = 200 }: { fire: boolean; size?: number }) {
  return (
    <AnimatePresence>
      {fire && (
        <motion.div className="pointer-events-none absolute inset-0 grid place-items-center" exit={{ opacity: 0 }}>
          <motion.div
            className="absolute rounded-full"
            style={{ width: size, height: size, background: "radial-gradient(circle, rgba(143,211,255,.55), transparent 62%)" }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.15, 1.3] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          {[0, 0.14].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{ width: size * 0.6, height: size * 0.6, borderColor: i ? "rgba(255,255,255,.5)" : "rgba(143,211,255,.85)" }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.9] }}
              transition={{ duration: 0.85, delay, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
