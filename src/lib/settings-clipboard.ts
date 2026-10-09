"use client";

import { useSyncExternalStore } from "react";

import { cleanSettings, type CopiedSettings } from "@/lib/develop/settings";

// Zwischenablage für Einstellungen: ein Zettel in der Tasche, auf diesem Gerät gemerkt (localStorage).
// Unabhängig von der Zwischenablage der Seitenbühne, die Elemente kopiert.

const KEY = "calima:einstellungen";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CopiedSettings | null } = { raw: null, value: null };

function read(): CopiedSettings | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) {
    let value: CopiedSettings | null = null;
    try {
      value = raw ? cleanSettings(JSON.parse(raw)) : null;
    } catch {}
    cache = { raw, value };
  }
  return cache.value;
}

export function copySettings(s: CopiedSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  // ohne Speicher (privates Fenster) bleibt es für diese Sitzung im Arbeitsspeicher
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  cache = { raw, value: s };
  listeners.forEach((l) => l());
}

export const copiedSettings = () => read();

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Was gerade kopiert ist, oder null */
export const useCopiedSettings = () => useSyncExternalStore(subscribe, read, () => null);
