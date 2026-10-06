"use client";

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

/** Runder Cursor über dem Buch: sagt, was ein Klick an dieser Stelle tut */
export function BookCursor({ label }: { label: string | null }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // leicht nachlaufend, damit er Masse hat
  const sx = useSpring(x, { stiffness: 520, damping: 40, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 520, damping: 40, mass: 0.6 });
  // voller transform-String: läuft auf dem Compositor, nicht über top/left
  const transform = useMotionTemplate`translate3d(${sx}px, ${sy}px, 0)`;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[450]"
      style={{ transform }}
    >
      <AnimatePresence>
        {label && (
          <motion.div
            key="dot"
            className="-translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          >
            <div className="bg-cloth text-cloth-ink flex h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold shadow-[0_8px_20px_-8px_rgb(4_24_27/0.55)]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={label}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                >
                  {label}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
