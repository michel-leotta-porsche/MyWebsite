// Abzüge auf dem Gerät (#285, #284): Fehler beim Sichern kommen an, statt verschluckt zu werden; Arbeitsfassung und
// Eintrag gehen zusammen oder gar nicht; das letzte Bild eines vollen Films liegt nach dem Entwickeln im Umschlag.
import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { envelopeOf } from "@/lib/envelope";
import { changeNotSaved, clearPrints, developFilm, isNoStore, isStorageFull, listPrints, notDeveloped, notSaved, patchShot, putPrints, removePrint, roomLow, workOf, type Print } from "@/lib/studio-store";

const blob = (s = "x") => new Blob([s], { type: "image/jpeg" });
const print = (id: string, more: Partial<Print> = {}): Print => ({ id, name: id, at: 1, w: 4, h: 3, page: blob(), thumb: blob(), meta: { exif: {} } as Print["meta"], ...more });

/** alles, was in einem Speicher der Datenbank liegt (Schlüssel) */
async function keys(store: "prints" | "work"): Promise<string[]> {
  const d = await new Promise<IDBDatabase>((ok, fail) => {
    const r = indexedDB.open("calima-studio", 2);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
  return new Promise((ok) => {
    const r = d.transaction(store).objectStore(store).getAllKeys();
    r.onsuccess = () => {
      d.close();
      ok((r.result as string[]).sort());
    };
  });
}

const realPut = IDBObjectStore.prototype.put;
/** das iPhone ist voll: Schreiben in diesen Speicher scheitert, wie WebKit es meldet */
function fillUp(store?: "prints" | "work") {
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
    if (!store || this.name === store) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    return realPut.apply(this, args);
  };
}
/** wie oft eine Arbeitsfassung geschrieben wird */
let workPuts = 0;
beforeEach(async () => {
  workPuts = 0;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
    if (this.name === "work") workPuts++;
    return realPut.apply(this, args);
  };
  await new Promise((ok) => {
    const r = indexedDB.deleteDatabase("calima-studio");
    r.onsuccess = r.onerror = ok;
  });
});
afterEach(() => {
  IDBObjectStore.prototype.put = realPut;
});

test("#285: ist der Speicher voll, scheitert das Sichern hörbar und nichts bleibt halb liegen", async () => {
  fillUp("prints");
  await assert.rejects(putPrints("u", [print("a", { work: blob("groß"), stack: "tag-2026-10-10" })]), (e) => isStorageFull(e));
  IDBObjectStore.prototype.put = realPut;
  assert.deepEqual(await keys("prints"), []);
  assert.deepEqual(await keys("work"), [], "die Arbeitsfassung bleibt nicht ohne Eintrag liegen");
});

test("#285: scheitert schon die Arbeitsfassung, entsteht auch kein Eintrag", async () => {
  fillUp("work");
  await assert.rejects(putPrints("u", [print("a", { work: blob("groß") })]), (e) => isStorageFull(e));
  IDBObjectStore.prototype.put = realPut;
  assert.deepEqual(await keys("prints"), []);
});

test("#285: Speicher voll erkennen, und knapp wird es unter dem Platz für ein paar Fotos", () => {
  assert.ok(isStorageFull(new DOMException("x", "QuotaExceededError")));
  assert.ok(!isStorageFull(new DOMException("x", "AbortError")));
  assert.ok(!isStorageFull(new Error("irgendwas")));
  assert.ok(!isStorageFull(undefined));
  assert.ok(roomLow({ usage: 990e6, quota: 1000e6 }));
  assert.ok(!roomLow({ usage: 100e6, quota: 1000e6 }));
  assert.ok(!roomLow({}), "ohne Angaben sperrt Calima nichts");
});

test("#285: Löschen nimmt Eintrag und Arbeitsfassung zusammen weg, auch Reste beim Konto löschen", async () => {
  await putPrints("u", [print("a", { work: blob(), stack: "tag-2026-10-10" }), print("b", { work: blob(), stack: "tag-2026-10-10" })]);
  await removePrint("a");
  assert.deepEqual(await keys("prints"), ["b"]);
  assert.deepEqual(await keys("work"), ["b"]);
  // eine verwaiste Arbeitsfassung aus älteren Fassungen
  IDBObjectStore.prototype.put = realPut;
  const d = await new Promise<IDBDatabase>((ok) => {
    const r = indexedDB.open("calima-studio", 2);
    r.onsuccess = () => ok(r.result);
  });
  await new Promise((ok) => {
    const tx = d.transaction("work", "readwrite");
    tx.objectStore("work").put({ id: "waise", buf: new ArrayBuffer(1), type: "image/jpeg" });
    tx.oncomplete = ok;
  });
  d.close();
  await clearPrints("u");
  assert.deepEqual(await keys("prints"), []);
  assert.deepEqual(await keys("work"), []);
});

test("#284: das Vorschaubild ergänzt nur shot, der Eintrag bleibt im Umschlag", async () => {
  await putPrints("u", [print("a", { work: blob("groß"), stack: "film1", pos: 0 })]);
  await developFilm("u", "film1", "Hafen");
  await patchShot("u", "a", blob("look"));
  const [p] = await listPrints("u");
  assert.equal(p.stack, envelopeOf("film1"));
  assert.equal(p.roll, "Hafen");
  assert.ok(p.dev);
  assert.equal(await p.shot!.text(), "look");
  assert.equal(await (await workOf(p)).text(), "groß");
});

test("#284: letztes Bild → Entwickeln → Vorschaubild, ohne aufeinander zu warten: alle Bilder im Umschlag, Arbeitsfassung einmal", async () => {
  await putPrints("u", [print("a", { work: blob(), stack: "film1", pos: 0, at: 1 })]);
  workPuts = 0;
  // so ruft die Kamera über dem Buch: Sichern des letzten Bilds, Entwickeln und Vorschaubild laufen gleichzeitig los
  const saving = putPrints("u", [print("b", { work: blob(), stack: "film1", pos: 1, at: 2 })]);
  const developing = developFilm("u", "film1", "Hafen");
  const look = patchShot("u", "b", blob("look"));
  await Promise.all([saving, look]);
  assert.equal(await developing, 2, "beide Bilder entwickelt");
  const all = await listPrints("u");
  assert.deepEqual(all.map((p) => p.stack), [envelopeOf("film1"), envelopeOf("film1")]);
  assert.equal(await all.find((p) => p.id === "b")!.shot!.text(), "look");
  assert.equal(workPuts, 1, "die Arbeitsfassung des letzten Bilds wird einmal geschrieben");
});

test("#284: ein Vorschaubild für ein schon gelöschtes Foto legt nichts Neues an", async () => {
  await patchShot("u", "weg", blob("look"));
  assert.deepEqual(await keys("prints"), []);
});

test("#284/#285: ein Film wird ganz entwickelt oder gar nicht, auch wenn der Speicher mittendrin voll wird", async () => {
  await putPrints("u", [print("p0", { stack: "film1", pos: 0 }), print("p1", { stack: "film1", pos: 1 }), print("p2", { stack: "film1", pos: 2 })]);
  let n = 0;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
    if (this.name === "prints" && ++n === 2) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    return realPut.apply(this, args);
  };
  await assert.rejects(developFilm("u", "film1", "Hafen"), (e) => isStorageFull(e));
  IDBObjectStore.prototype.put = realPut;
  assert.deepEqual((await listPrints("u")).map((p) => p.stack), ["film1", "film1", "film1"], "kein halber Umschlag");
});

test("#285: ohne Datenbank (privates Fenster) heißt der Fehler nicht „Speicher voll“", async () => {
  const open = indexedDB.open;
  indexedDB.open = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  try {
    await assert.rejects(putPrints("u", [print("a")]), (e) => isNoStore(e) && !isStorageFull(e));
  } finally {
    indexedDB.open = open;
  }
});

test("#285: die Hinweise sagen, was nicht gesichert ist", () => {
  const voll = new DOMException("x", "QuotaExceededError");
  assert.equal(notSaved(voll), "Der Speicher auf diesem Gerät ist voll. Das Foto ist nicht gesichert.");
  assert.equal(notSaved(voll, 3), "Der Speicher auf diesem Gerät ist voll. 3 Fotos sind nicht gesichert.");
  assert.equal(notSaved(new Error("x")), "Das Foto ließ sich nicht sichern. Versuch es noch einmal.");
  assert.match(notDeveloped(voll), /voll\. Der Film ist nicht entwickelt/);
  assert.match(changeNotSaved(voll), /voll\. Die Änderung ist nicht gesichert/);
});
