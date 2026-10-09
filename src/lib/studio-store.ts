"use client";

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

/** was liegen bleibt: höchstens MAX_PRINTS Stapel und MAX_KEPT Fotos, der neueste Stapel immer ganz */
export function trimPiles(all: Print[][]): { keep: Print[][]; drop: Print[] } {
  const keep: Print[][] = [];
  let n = 0;
  for (const pile of all) {
    if (keep.length && (keep.length >= MAX_PRINTS || n + pile.length > MAX_KEPT)) continue;
    keep.push(pile);
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

/*
 * Die Bilder liegen als Bytes in der Datenbank, nicht als Blob: WebKit legt Blobs aus IndexedDB als Dateien ab und
 * verliert sie in der iPhone-App, sobald die App aktualisiert wird (der Datenordner bekommt einen neuen Pfad). Ältere
 * Abzüge mit Blob werden beim Lesen angefasst; lassen sie sich nicht mehr lesen, fliegen sie leise raus.
 */
type Packed = { buf: ArrayBuffer; type: string };
const BLOBS = ["work", "page", "thumb", "shot"] as const;
type Stored = Omit<Print, (typeof BLOBS)[number]> & { work: Blob | Packed; page: Blob | Packed; thumb: Blob | Packed; shot?: Blob | Packed };

const pack = async (b: Blob): Promise<Packed> => ({ buf: await b.arrayBuffer(), type: b.type });
const unpack = (x: Blob | Packed): Blob => (x instanceof Blob ? x : new Blob([x.buf], { type: x.type }));
const readable = (b: Blob) =>
  b
    .slice(0, 8)
    .arrayBuffer()
    .then(() => true)
    .catch(() => false);

async function unpackPrint(s: Stored): Promise<Print | null> {
  const out = { ...s } as unknown as Print;
  for (const k of BLOBS) {
    const v = s[k];
    if (!v) continue;
    if (v instanceof Blob && !(await readable(v))) return null;
    out[k] = unpack(v);
  }
  return out;
}

/** Abzüge dieses Kontos, neueste zuerst; nicht mehr lesbare werden dabei entfernt */
export async function listPrints(uid: string): Promise<Print[]> {
  const all = (await run<Stored[]>("readonly", (s) => s.getAll() as IDBRequest<Stored[]>)) ?? [];
  const out: Print[] = [];
  for (const s of all.filter((p) => p.owner === uid)) {
    const p = await unpackPrint(s);
    if (p) out.push(p);
    else await removePrint(s.id).catch(() => {});
  }
  return out.sort((a, b) => b.at - a.at);
}

/** Für dieses Konto speichern und, was über die Grenzen hinausgeht, wegräumen */
export async function putPrints(uid: string, ps: Print[]) {
  for (const p of ps) {
    const s: Stored = { ...p, owner: uid, work: await pack(p.work), page: await pack(p.page), thumb: await pack(p.thumb), shot: p.shot ? await pack(p.shot) : undefined };
    await run("readwrite", (st) => st.put(s));
  }
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
