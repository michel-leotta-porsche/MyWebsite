"use client";

import type { PhotoEdit } from "@/lib/develop/model";
import type { PhotoMeta } from "@/lib/ingest";

// Abzüge im Fotostudio: die letzten bearbeiteten Fotos, nur auf diesem Gerät (IndexedDB), nie hochgeladen.
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
};

/** so viele Abzüge bleiben liegen; ältere räumt das Studio selbst weg */
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

/** Neueste zuerst */
export async function listPrints(): Promise<Print[]> {
  const all = (await run<Print[]>("readonly", (s) => s.getAll() as IDBRequest<Print[]>)) ?? [];
  return all.sort((a, b) => b.at - a.at);
}

/** Speichern und, was über MAX_PRINTS hinausgeht, wegräumen; gibt die neue Liste zurück */
export async function putPrint(p: Print): Promise<Print[]> {
  await run("readwrite", (s) => s.put(p));
  const all = await listPrints();
  for (const old of all.slice(MAX_PRINTS)) await removePrint(old.id);
  return all.slice(0, MAX_PRINTS);
}

export async function removePrint(id: string) {
  await run("readwrite", (s) => s.delete(id));
}
