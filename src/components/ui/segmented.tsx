"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

import { haptic } from "@/lib/haptics";

// Umschalter zwischen zwei bis vier Ansichten (z. B. Hoch/Quer, Fotos/Text). Der helle Daumen gleitet mit einer Feder.

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const group = useId();
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="bg-on-table/7 inline-flex rounded-full p-[3px] shadow-[inset_0_0_0_1px_rgb(236_230_220/0.1)]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (on) return;
              haptic("select");
              onChange(o.value);
            }}
            className={`relative min-h-9 rounded-full px-4 text-sm font-semibold transition-colors duration-150 pointer-coarse:min-h-11 ${on ? "text-table" : "text-on-table-2 hover:text-on-table"}`}
          >
            {on && (
              <motion.span
                layoutId={group}
                aria-hidden
                className="bg-on-table absolute inset-0 rounded-full"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
