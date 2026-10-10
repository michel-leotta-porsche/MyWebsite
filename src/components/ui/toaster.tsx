"use client";

import { Toaster as Sonner, toast } from "sonner";

import { t, useT } from "@/lib/i18n";

// Hinweise von unten als dunkle Pille, wischbar, mit Rückgängig als Aktion. Einmal im Layout eines Raums einsetzen.
// Aufruf: notify("In die Ablage gelegt", { action: { label: "Rückgängig", onClick: undo } })

export const notify = toast;

/**
 * Ein Hinweis, der bleibt, bis man ihn bestätigt: wenn Fotos nicht gesichert sind (#285). iOS nähme dafür ein Alert;
 * Calima bleibt bei der Pille unten, weil sie nicht unterbricht (die Kamera kann weiterlaufen) und trotzdem nicht verschwindet.
 */
export const notifyLasting = (text: string) => toast(text, { id: "nicht-gesichert", duration: Infinity, cancel: { label: t("OK"), onClick: () => {} } });

export function Toaster() {
  const t = useT();
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      mobileOffset={{ bottom: "max(1rem, env(safe-area-inset-bottom))", left: "1rem", right: "1rem" }}
      gap={8}
      duration={6000}
      containerAriaLabel={t("Hinweise")}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-full bg-table-raised py-2 pr-2 pl-5 text-sm text-on-table shadow-[0_20px_30px_-14px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(236_230_220/0.1)] min-h-14",
          title: "flex-1 font-medium",
          description: "text-on-table-2 text-[13px]",
          icon: "text-cloth [&_svg]:size-5",
          actionButton:
            "shrink-0 rounded-full bg-on-table px-4 min-h-10 font-semibold text-table transition-transform duration-150 active:scale-[0.96]",
          cancelButton: "shrink-0 rounded-full px-3 min-h-10 text-on-table-2",
        },
      }}
    />
  );
}
