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
};

/** so viele Abzüge bleiben je Konto liegen; ältere räumt das Studio selbst weg */
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

/** Für dieses Konto speichern und, was über MAX_PRINTS hinausgeht, wegräumen; gibt die neue Liste zurück */
export async function putPrint(uid: string, p: Print): Promise<Print[]> {
  await run("readwrite", (s) => s.put({ ...p, owner: uid }));
  const all = await listPrints(uid);
  for (const old of all.slice(MAX_PRINTS)) await removePrint(old.id);
  return all.slice(0, MAX_PRINTS);
}

export async function removePrint(id: string) {
  await run("readwrite", (s) => s.delete(id));
}

/** Beim Löschen des Kontos: alle Abzüge dieses Kontos und die alten ohne Besitzer vom Gerät entfernen */
export async function clearPrints(uid: string) {
  const all = (await run<Print[]>("readonly", (s) => s.getAll() as IDBRequest<Print[]>)) ?? [];
  for (const p of all) if (!p.owner || p.owner === uid) await removePrint(p.id);
}
