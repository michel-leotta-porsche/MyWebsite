"use client";

import type { ButtonHTMLAttributes } from "react";

import { haptic, type HapticKind } from "@/lib/haptics";

// Knöpfe der Werkzeuge. Werkzeuge sind rund (Pille), Bücher bleiben eckig.
// cloth: der eine Hauptknopf einer Ansicht, aus Buchleinen, ohne Glanz und Schein (Physical Light Rule). quiet: Nebenknöpfe auf dem Tisch. paper: auf Papier und Zettel.

export type ButtonVariant = "cloth" | "quiet" | "paper" | "ink";
export type ButtonSize = "md" | "sm" | "icon";

const VARIANT: Record<ButtonVariant, string> = {
  cloth:
    "linen overflow-hidden bg-cloth text-cloth-ink active:shadow-[inset_0_2px_4px_rgb(58_39_6/0.35)]",
  quiet: "bg-on-table/8 text-on-table shadow-[inset_0_0_0_1px_rgb(236_230_220/0.12)] hover:bg-on-table/12 active:bg-on-table/16",
  paper: "bg-ink/6 text-ink shadow-[inset_0_0_0_1px_rgb(27_28_26/0.14)] hover:bg-ink/10 active:bg-ink/14 focus-visible:outline-ink",
  ink: "bg-ink text-paper hover:bg-ink/90 focus-visible:outline-ink",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-12 gap-2.5 px-5 text-base",
  sm: "min-h-9 gap-1.5 px-3.5 text-sm pointer-coarse:min-h-11",
  icon: "size-11 shrink-0",
};

export function buttonClass(variant: ButtonVariant = "quiet", size: ButtonSize = "md", className = "") {
  return `inline-flex select-none items-center justify-center rounded-full font-semibold tracking-[-0.005em] whitespace-nowrap transition-[transform,background-color,box-shadow] duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.15em] [&_svg]:shrink-0 ${VARIANT[variant]} ${SIZE[size]} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Klopfen in der App beim Antippen; aus mit false */
  haptic?: HapticKind | false;
};

export function Button({ variant = "quiet", size = "md", haptic: kind = "tap", className = "", onClick, ...p }: Props) {
  return (
    <button
      type="button"
      {...p}
      onClick={(e) => {
        if (kind) haptic(kind);
        onClick?.(e);
      }}
      className={buttonClass(variant, size, className)}
    />
  );
}

/** Symbolknopf: braucht immer einen Namen für Screenreader (label) */
export function IconButton({ label, variant = "quiet", ...p }: Omit<Props, "size" | "aria-label"> & { label: string }) {
  return <Button {...p} variant={variant} size="icon" aria-label={label} title={label} />;
}

/** Mehrere Symbolknöpfe in einer Pille, z. B. Rückgängig, Ansehen, Mehr */
export function ToolGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="toolbar" aria-label={label} className="bg-on-table/7 inline-flex rounded-full shadow-[inset_0_0_0_1px_rgb(236_230_220/0.09)] [&_button]:bg-transparent [&_button]:shadow-none [&_button:active]:bg-on-table/12">
      {children}
    </div>
  );
}
