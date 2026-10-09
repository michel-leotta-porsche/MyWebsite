"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

import { haptic } from "@/lib/haptics";

// Umschalter zwischen zwei bis vier Ansichten (z. B. Hoch/Quer, Fotos/Text). Der helle Daumen gleitet mit einer Feder.

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "table",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** auf dem Tisch (hell auf dunkel) oder auf dem Zettel (wie die Reiter im Editor) */
  tone?: "table" | "paper";
}) {
  const group = useId();
  const reduce = useReducedMotion();
  const paper = tone === "paper";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex rounded-full p-[3px] ${paper ? "bg-ink/6 shadow-[inset_0_0_0_1px_rgb(27_28_26/0.12)]" : "bg-on-table/7 shadow-[inset_0_0_0_1px_rgb(236_230_220/0.1)]"}`}
    >
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
            className={`relative min-h-9 rounded-full px-4 text-sm font-semibold transition-colors duration-150 pointer-coarse:min-h-11 ${on ? (paper ? "text-paper" : "text-table") : paper ? "text-ink-2 hover:text-ink" : "text-on-table-2 hover:text-on-table"}`}
          >
            {on && (
              <motion.span
                layoutId={group}
                aria-hidden
                className={`${paper ? "bg-ink" : "bg-on-table"} absolute inset-0 rounded-full`}
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
