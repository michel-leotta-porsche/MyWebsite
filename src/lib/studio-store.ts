"use client";

import { isDayStack } from "@/lib/day-stack";
import type { PhotoEdit } from "@/lib/develop/model";
import type { PhotoMeta } from "@/lib/ingest";

// Abzüge im Fotostudio: die letzten bearbeiteten Fotos, nur auf diesem Gerät (IndexedDB), nie hochgeladen.
// Jeder Abzug gehört einem Konto: wer sich auf demselben Gerät anmeldet, sieht nur seine eigenen.
// Ein Abzug hält die Arbeitsfassung (4096 px), kleine Vorschauen, die Aufnahmedaten und die Bearbeitung.
// Geht IndexedDB nicht (privates Fenster, gesperrter Speicher), arbeitet das Studio ohne Gedächtnis weiter.

export type Print = {
  id: string;
  /** Dateiname ohne Endung, für den Namen der gesicherten Datei */
  name: string;
  /** zuletzt geändert, Millisekunden */
  at: number;
  w: number;
  h: number;
  work: Blob;
  page: Blob;
  thumb: Blob;
  meta: PhotoMeta;
  edit?: PhotoEdit;
  /** kleine eingerechnete Fassung fürs Pult */
  shot?: Blob;
  /** uid des Kontos; ältere Abzüge ohne Besitzer zeigt das Studio niemandem mehr */
  owner?: string;
  /** Stapel: zusammen gewählte Fotos tragen dieselbe Kennung und ihre Stelle darin */
  stack?: string;
  pos?: number;
  /** Abendstapel: eingeordnet ins Buch oder weggelegt, und wann (für Rückgängig); bleibt beim Schließen erhalten */
  pick?: "in" | "out";
  pickAt?: number;
  /** der Satz zum Foto, wird im Buch sein Titel */
  line?: string;
};

/** so viele Fotos lassen sich auf einmal wählen; mehr sprengt auf älteren iPhones den Speicher */
export const MAX_STACK = 20;
/** so viele Fotos bleiben je Konto höchstens liegen, über alle Stapel (je etwa 5 MB) */
const MAX_KEPT = 40;

/** Abzüge in Stapel gruppiert, neuester Stapel zuerst; ein einzelnes Foto ist ein Stapel aus einem */
export function piles(prints: Print[]): Print[][] {
  const by = new Map<string, Print[]>();
  for (const p of prints) {
    const k = p.stack ?? p.id;
    by.set(k, [...(by.get(k) ?? []), p]);
  }
  const at = (pile: Print[]) => Math.max(...pile.map((p) => p.at));
  return [...by.values()].map((pile) => pile.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))).sort((a, b) => at(b) - at(a));
}

/**
 * was liegen bleibt: höchstens MAX_PRINTS Stapel und MAX_KEPT Fotos, der neueste Stapel immer ganz.
 * Tagesstapel (Abendstapel) räumt das Studio nie selbst weg und zählt sie nicht mit: Fotos aus Calimas Kamera
 * gibt es nur hier, bis sie im Buch liegen.
 */
export function trimPiles(all: Print[][]): { keep: Print[][]; drop: Print[] } {
  const keep: Print[][] = [];
  let kept = 0;
  let n = 0;
  for (const pile of all) {
    if (isDayStack(pile[0].stack)) {
      keep.push(pile);
      continue;
    }
    if (kept && (kept >= MAX_PRINTS || n + pile.length > MAX_KEPT)) continue;
    keep.push(pile);
    kept++;
    n += pile.length;
  }
  return { keep, drop: all.filter((p) => !keep.includes(p)).flat() };
}

/** so viele Stapel (oder einzelne Abzüge) bleiben je Konto liegen; ältere räumt das Studio selbst weg */
export const MAX_PRINTS = 8;

const DB = "calima-studio";
const STORE = "prints";

function db(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((ok, fail) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      d.close();
      ok(req ? req.result : undefined);
    };
    tx.onerror = tx.onabort = () => {
      d.close();
      fail(tx.error);
    };
  });
}

/** Abzüge dieses Kontos, neueste zuerst */
export async function listPrints(uid: string): Promise<Print[]> {
  const all = (await run<Print[]>("readonly", (s) => s.getAll() as IDBRequest<Print[]>)) ?? [];
  return all.filter((p) => p.owner === uid).sort((a, b) => b.at - a.at);
}

/** Für dieses Konto speichern und, was über die Grenzen hinausgeht, wegräumen */
export async function putPrints(uid: string, ps: Print[]) {
  // ein Tag auf dem Pult: iOS soll den Speicher bei Platzmangel nicht von selbst leeren
  if (ps.some((p) => isDayStack(p.stack))) navigator.storage?.persist?.().catch(() => {});
  for (const p of ps) await run("readwrite", (s) => s.put({ ...p, owner: uid }));
  for (const old of trimPiles(piles(await listPrints(uid))).drop) await removePrint(old.id);
}

export async function removePrint(id: string) {
  await run("readwrite", (s) => s.delete(id));
}

/** Beim Löschen des Kontos: alle Abzüge dieses Kontos und die alten ohne Besitzer vom Gerät entfernen */
export async function clearPrints(uid: string) {
  const all = (await run<Print[]>("readonly", (s) => s.getAll() as IDBRequest<Print[]>)) ?? [];
  for (const p of all) if (!p.owner || p.owner === uid) await removePrint(p.id);
}
