"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactNode } from "react";

import { haptic } from "@/lib/haptics";

// Menü auf Zettelpapier, z. B. hinter „Mehr“. Tastatur, Fokus und Position kommen aus Base UI.
// Es wächst aus dem Knopf (transform-origin) und schrumpft beim Schließen kurz zurück.

type Trigger = Parameters<typeof BaseMenu.Trigger>[0]["render"];

// container: in einem modalen <dialog> muss das Menü im Dialog hängen, sonst liegt es unter der obersten Ebene
export function Menu({ trigger, children, align = "end", container }: { trigger: Trigger; children: ReactNode; align?: "start" | "center" | "end"; container?: React.RefObject<HTMLElement | null> }) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal container={container}>
        <BaseMenu.Positioner className="z-[720] outline-none" sideOffset={8} align={align} collisionPadding={12}>
          <BaseMenu.Popup className="slip text-ink relative max-h-[var(--available-height)] min-w-56 origin-[var(--transform-origin)] overflow-y-auto overscroll-contain rounded-tool py-1.5 shadow-[0_24px_40px_-18px_rgb(12_10_8/0.75)] outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export function MenuItem({ icon, children, onClick, danger = false, disabled }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <BaseMenu.Item
      disabled={disabled}
      onClick={() => {
        haptic("select");
        onClick?.();
      }}
      className={`flex min-h-11 cursor-default items-center gap-3 px-4 text-[15px] outline-none select-none data-disabled:opacity-45 data-highlighted:bg-ink/8 [&_svg]:size-[18px] [&_svg]:shrink-0 ${danger ? "text-danger" : ""}`}
    >
      {icon && <span className={danger ? "" : "text-ink-2"}>{icon}</span>}
      {children}
    </BaseMenu.Item>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="bg-ink/12 mx-2 my-1 h-px" />;
}
