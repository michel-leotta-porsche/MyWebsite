"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

import { hitClass, linkClass } from "@/components/ui-classes";

// Grundbausteine ohne Firebase: Landing und Rechtsseiten laden sie, ohne das SDK mitzuziehen.

export { hitClass, linkClass } from "@/components/ui-classes";

export function TextButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...p} className={`${linkClass} ${className}`} />;
}

/** Der eine betonte Knopf einer Ansicht: Rahmen statt Fläche, das Gelb bleibt Signal */
export function FrameButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...p}
      className={`border-on-table text-on-table hover:bg-on-table hover:text-table border px-4 py-2 pointer-coarse:min-h-11 text-sm font-semibold transition-colors duration-150 disabled:opacity-50 ${className}`}
    />
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className={`${hitClass} text-on-table text-lg font-bold tracking-[-0.02em]`}
      style={{ fontVariationSettings: '"wdth" 80' }}
    >
      Calima
    </Link>
  );
}
