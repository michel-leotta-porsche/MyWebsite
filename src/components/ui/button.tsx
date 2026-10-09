"use client";

import type { ButtonHTMLAttributes } from "react";

import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button-class";
import { haptic, type HapticKind } from "@/lib/haptics";

export { buttonClass, type ButtonSize, type ButtonVariant };

// Knöpfe der Werkzeuge; Klassen in button-class.ts (ohne "use client", damit Server-Seiten sie auch nutzen)

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
