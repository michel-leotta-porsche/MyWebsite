"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

import { hitClass, linkClass } from "@/components/ui-classes";
import { IS_APP } from "@/lib/app-mode";

// Grundbausteine ohne Firebase: Landing und Rechtsseiten laden sie, ohne das SDK mitzuziehen.

export { hitClass, linkClass } from "@/components/ui-classes";

export function TextButton({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...p} className={`${linkClass} ${className}`} />;
}

export function Wordmark({ href = IS_APP ? "/zimmer" : "/" }: { href?: string }) {
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
