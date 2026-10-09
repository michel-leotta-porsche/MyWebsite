"use client";

import { useSyncExternalStore } from "react";

import { cleanSettings, sameSettings, type CopiedSettings } from "@/lib/develop/settings";

// „Zuletzt mitgenommen“: die letzten drei Looks, die man von einem Foto, einem Fuji-Rezept oder einem fremden Buch
// mitgenommen hat, auf diesem Gerät gemerkt (localStorage). Unabhängig von der Zwischenablage der Seitenbühne.

const KEY = "calima:einstellungen";
const MAX = 3;
const listeners = new Set<() => void>();
const NONE: CopiedSettings[] = [];
let cache: { raw: string | null; value: CopiedSettings[] } = { raw: null, value: NONE };

function read(): CopiedSettings[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) {
    let value: CopiedSettings[] = NONE;
    try {
      const x: unknown = raw ? JSON.parse(raw) : null;
      // früher lag hier ein einzelner Zettel
      const list = Array.isArray(x) ? x : x ? [x] : [];
      value = list.map(cleanSettings).filter((s): s is CopiedSettings => !!s).slice(0, MAX);
    } catch {}
    cache = { raw, value };
  }
  return cache.value;
}

function write(list: CopiedSettings[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  // ohne Speicher (privates Fenster) bleibt es für diese Sitzung im Arbeitsspeicher
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  cache = { raw, value: list };
  listeners.forEach((l) => l());
}

/** Mitnehmen: rückt nach vorn, derselbe Look steht nur einmal da */
export const copySettings = (s: CopiedSettings) => write([s, ...read().filter((x) => !sameSettings(x, s))].slice(0, MAX));

export const forgetSettings = (s: CopiedSettings) => write(read().filter((x) => x !== s));

/** Der zuletzt mitgenommene Look, für ⇧⌘V */
export const copiedSettings = () => read()[0] ?? null;

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Zuletzt mitgenommen, neuester zuerst */
export const useRecentSettings = () => useSyncExternalStore(subscribe, read, () => NONE);

/** Der zuletzt mitgenommene Look, oder null */
export const useCopiedSettings = () => useRecentSettings()[0] ?? null;
