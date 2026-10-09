"use client";

import { useSyncExternalStore } from "react";

import { PICKS, PICKS_SHOWN, type PickId } from "@/lib/develop/model";

// Welche Vorschläge im Editor stehen und in welcher Reihenfolge: auf diesem Gerät gemerkt (localStorage).

const KEY = "calima:vorschlaege";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: PickId[] } = { raw: null, value: PICKS_SHOWN };
// ohne Speicher (privates Fenster) gilt die Wahl, solange die Seite offen ist
let memory: PickId[] | null = null;

const clean = (x: unknown): PickId[] | null => (Array.isArray(x) ? [...new Set(x.filter((id): id is PickId => PICKS.some((p) => p.id === id)))] : null);

function read(): PickId[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return memory ?? PICKS_SHOWN;
  }
  if (raw !== cache.raw) {
    let value: PickId[] | null = null;
    try {
      value = raw ? clean(JSON.parse(raw)) : null;
    } catch {}
    cache = { raw, value: value ?? PICKS_SHOWN };
  }
  return cache.value;
}

export function setShownPicks(ids: PickId[] | null) {
  memory = ids;
  try {
    if (ids) localStorage.setItem(KEY, JSON.stringify(ids));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Die Vorschläge, die unter „Vorschläge“ stehen, in ihrer Reihenfolge */
export const useShownPicks = () => useSyncExternalStore(subscribe, read, () => PICKS_SHOWN);
