// Mitgelieferte Bücher (Beispielbuch, Michels Bände), die jemand aus dem Zimmer genommen hat.
// Nur auf diesem Gerät (localStorage), wie „gesehen“ in seen.ts; fehlt der Speicher, liegt einfach alles da.

import { useSyncExternalStore } from "react";

const KEY = "calima:weggelegt";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw === cache.raw) return cache.ids;
  let ids = EMPTY;
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(v)) ids = v.filter((x): x is string => typeof x === "string");
  } catch {}
  cache = { raw, ids };
  return ids;
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
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

/** Kennungen der weggelegten mitgelieferten Bücher, mit Weglegen und Zurücklegen */
export function useShelf() {
  const hidden = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    hidden,
    putAway: (id: string) => write([...new Set([...read(), id])]),
    putBack: (id: string) => write(read().filter((x) => x !== id)),
  };
}
