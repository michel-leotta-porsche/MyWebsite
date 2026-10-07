"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { signIn } from "@/lib/firebase";

// Kleine Bausteine für Tisch, Editor und Gastlink: Textknöpfe mit Unterstrich, Rahmenknopf, Anmeldung.

export const linkClass =
  "text-on-table underline decoration-mark decoration-2 underline-offset-4 hover:decoration-on-table disabled:opacity-50";

export function TextButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...p} className={`${linkClass} ${className}`} />;
}

/** Der eine betonte Knopf einer Ansicht: Rahmen statt Fläche, das Gelb bleibt Signal */
export function FrameButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...p}
      className={`border-on-table text-on-table hover:bg-on-table hover:text-table border px-4 py-2 text-sm font-semibold transition-colors duration-150 disabled:opacity-50 ${className}`}
    />
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-on-table text-lg font-bold tracking-[-0.02em]"
      style={{ fontVariationSettings: '"wdth" 80' }}
    >
      Fujiventura
    </Link>
  );
}

/** Leerer Tisch mit Anmeldung */
export function SignInTable({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="flex items-baseline justify-between px-4 pt-4 md:px-8 md:pt-6">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-on-table text-3xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          {title}
        </h1>
        <div className="text-on-table-2 mt-3 text-base leading-relaxed">{children}</div>
        <div className="mt-8">
          <FrameButton onClick={() => signIn().catch(() => {})}>Mit Google anmelden</FrameButton>
        </div>
      </div>
    </main>
  );
}

/**
 * Dialog auf Zettelpapier, mittig über dem Tisch. Natives <dialog> mit showModal(): der Fokus geht hinein und
 * bleibt drin, der Hintergrund ist inert, Esc schließt, danach kehrt der Fokus zum Auslöser zurück (UX-Kritik K2).
 */
export function SlipDialog({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    return () => {
      d.close();
      back?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className="fixed inset-0 z-[700] m-0 flex h-full max-h-none w-full max-w-none items-end justify-center bg-transparent p-3 backdrop:bg-[rgb(12_10_8/0.55)] md:items-center"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`slip text-ink relative max-h-full w-full overflow-y-auto ${wide ? "max-w-3xl" : "max-w-md"} p-5 shadow-[0_24px_40px_-18px_rgb(12_10_8/0.75)]`}
      >
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-ink/15 pb-3">
          <p className="text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            {label}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-ink text-sm underline decoration-mark decoration-2 underline-offset-4"
          >
            Schließen
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export const inputClass =
  "w-full border border-ink-2 bg-transparent px-3 py-2 text-ink placeholder:text-ink-2 focus-visible:outline-2 focus-visible:outline-ink";
