"use client";

import { useId, type InputHTMLAttributes } from "react";

// Textfeld auf Papier: Linie statt Kasten, die Beschriftung schwebt beim Tippen nach oben,
// eine Tintenlinie wächst beim Fokus von links. Der Wert bleibt immer lesbar (keine Platzhalter-Tricks).

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & { label: string; hint?: string };

export function Field({ label, hint, className = "", id, ...p }: Props) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={`group relative ${className}`}>
      <input
        id={fid}
        {...p}
        placeholder=" "
        aria-describedby={hint ? `${fid}-hint` : undefined}
        className="peer border-ink/25 text-ink w-full rounded-none border-0 border-b-[1.5px] bg-transparent pt-[22px] pb-2 text-lg outline-none focus-visible:outline-none"
      />
      <label
        htmlFor={fid}
        className="text-ink-2 pointer-events-none absolute top-[22px] left-0 origin-top-left text-lg transition-transform duration-300 ease-out peer-focus:-translate-y-5 peer-focus:scale-[0.72] peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:scale-[0.72]"
      >
        {label}
      </label>
      <span aria-hidden className="bg-ink absolute right-0 bottom-0 left-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100" />
      {hint && (
        <p id={`${fid}-hint`} className="text-ink-2 mt-1.5 text-[13px]">
          {hint}
        </p>
      )}
    </div>
  );
}
