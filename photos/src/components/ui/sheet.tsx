"use client";

import { Drawer } from "@base-ui/react/drawer";
import type { ReactNode } from "react";

// Blatt von unten (iPhone-Sheet) als zugeschnittener Zettel, darum nur leicht gerundet: Wischen nach unten schließt, Esc und Tippen daneben auch.
// Verhalten kommt aus Base UI (Fokus, inert, Wischen, Tastatur), das Aussehen von hier.
// Ab 768px steht das Blatt als Karte in der Mitte unten, nicht über die ganze Breite.

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Knopf, der das Blatt öffnet; ohne ihn steuert open von außen */
  trigger?: ReactElementLike;
  title: string;
  /** Titel nur für Screenreader, z. B. wenn der Inhalt schon eine Überschrift hat */
  hideTitle?: boolean;
  description?: ReactNode;
  children: ReactNode;
};

type ReactElementLike = Parameters<typeof Drawer.Trigger>[0]["render"];

export function Sheet({ open, onOpenChange, trigger, title, hideTitle = false, description, children }: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger render={trigger} />}
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop
            className={`fixed inset-0 z-[690] min-h-dvh bg-[rgb(12_10_8)] opacity-[calc(0.55*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ${EASE} data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute`}
          />
          <Drawer.Viewport className="fixed inset-0 z-[700] flex items-end justify-center">
            <Drawer.Popup
              className={`slip text-ink relative -mb-12 max-h-[calc(88svh+3rem)] w-full overflow-y-auto overscroll-contain rounded-t-cut px-5 pt-2.5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+3rem)] shadow-[0_-20px_40px_-24px_rgb(12_10_8/0.8)] outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] ${EASE} data-swiping:select-none data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] md:max-w-xl`}
            >
              <div aria-hidden className="bg-ink/20 mx-auto mb-3 h-[5px] w-10 rounded-full" />
              <Drawer.Content>
                <Drawer.Title className={hideTitle ? "sr-only" : "mb-1 text-xl font-bold tracking-[-0.02em]"} style={{ fontVariationSettings: '"wdth" 82' }}>
                  {title}
                </Drawer.Title>
                {description && <Drawer.Description className="text-ink-2 mb-4 text-sm leading-relaxed">{description}</Drawer.Description>}
                {children}
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}

export const SheetClose = Drawer.Close;
