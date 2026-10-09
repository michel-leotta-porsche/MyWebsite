"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useId } from "react";

import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";

// Farbwahl als Stoffproben wie im Musterbuch (zugeschnitten, darum rounded-cut), Pfeiltasten wechseln wie bei Radio-Knöpfen.
// Gewählt: Ring in Tinte und ein Haken, der kurz aufspringt.

export type Swatch = { id: string; label: string; color: string; ink: string };

export function Swatches({ label, items, value, onChange }: { label: string; items: Swatch[]; value: string; onChange: (id: string) => void }) {
  const lid = useId();
  const t = useT();
  return (
    <div>
      <p id={lid} className="text-ink-2 mb-2.5 text-[13px]">
        {label}
      </p>
      <RadioGroup
        aria-labelledby={lid}
        value={value}
        onValueChange={(v) => {
          haptic("select");
          onChange(v as string);
        }}
        className="flex flex-wrap gap-2.5"
      >
        {items.map((s) => (
          <Radio.Root
            key={s.id}
            value={s.id}
            aria-label={t(s.label)}
            title={t(s.label)}
            className="linen grid size-9 overflow-hidden place-items-center rounded-cut shadow-[inset_0_-2px_0_rgb(12_10_8/0.18)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] focus-visible:outline-ink active:scale-90 data-checked:scale-105 data-checked:shadow-[inset_0_-2px_0_rgb(12_10_8/0.18),0_0_0_2px_var(--paper),0_0_0_4px_var(--ink)] pointer-coarse:size-11"
            style={{ backgroundColor: s.color, color: s.ink }}
          >
            <Radio.Indicator
              keepMounted
              className="transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] data-unchecked:scale-50 data-unchecked:opacity-0"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current stroke-[2.6]" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </Radio.Indicator>
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  );
}
