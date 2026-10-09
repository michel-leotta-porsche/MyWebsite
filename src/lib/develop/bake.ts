"use client";

// Einrechnen anstoßen: im Worker, wenn der Browser OffscreenCanvas mit 2D und JPEG kann, sonst im Hauptthread.

import { bake, bakeable, fetchBitmap, type BakeJob, type BakeResult } from "@/lib/develop/bake-core";
import { SIZES } from "@/lib/ingest";

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, { ok: (r: BakeResult) => void; fail: (e: Error) => void }>();

const workerReady = () =>
  typeof Worker !== "undefined" &&
  typeof OffscreenCanvas !== "undefined" &&
  "convertToBlob" in OffscreenCanvas.prototype &&
  (() => {
    try {
      return !!new OffscreenCanvas(1, 1).getContext("2d");
    } catch {
      return false;
    }
  })();

/** Worker verwerfen und alle Wartenden scheitern lassen; sie rechnen dann im Hauptthread weiter */
function reset(why: string) {
  worker?.terminate();
  worker = null;
  for (const [id, w] of waiting) {
    waiting.delete(id);
    w.fail(new Error(why));
  }
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (!workerReady()) return null;
  try {
    worker = new Worker(new URL("./bake.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  worker.onmessage = (e: MessageEvent<{ id: number; out?: BakeResult; error?: string }>) => {
    const w = waiting.get(e.data.id);
    waiting.delete(e.data.id);
    if (!w) return;
    if (e.data.out) w.ok(e.data.out);
    else w.fail(new Error(e.data.error ?? "Einrechnen fehlgeschlagen"));
  };
  // startet der Worker nicht (alte Datei nach einem Deploy, strenge CSP, App-Hülle), meldet das nur dieses Ereignis
  worker.onerror = (e) => {
    e.preventDefault();
    reset("Worker startet nicht");
  };
  worker.onmessageerror = () => reset("Worker-Antwort unlesbar");
  return worker;
}

const mainMake = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const mainEncode = (c: OffscreenCanvas | HTMLCanvasElement) =>
  new Promise<Blob>((ok, fail) => (c as HTMLCanvasElement).toBlob((b) => (b ? ok(b) : fail(new Error("Kodieren fehlgeschlagen"))), "image/jpeg", 0.86));

// Hauptthread: kann fetch das Original nicht holen, lädt ein img-Element mit CORS
const mainLoad = async (url: string) => {
  try {
    return await fetchBitmap(url);
  } catch (e) {
    if (!bakeable(url)) throw e;
    return new Promise<HTMLImageElement>((ok, fail) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => img.decode().then(() => ok(img), () => ok(img));
      img.onerror = () => fail(new Error("Original lädt nicht"));
      img.src = url;
    });
  }
};
const onMain = (job: BakeJob) => bake(job, mainMake, mainEncode, mainLoad);

/** Ein Foto mit seinem LUT neu rechnen, drei Größen wie beim Hochladen */
export function bakePhoto(job: Omit<BakeJob, "sizes">): Promise<BakeResult> {
  const full: BakeJob = { ...job, sizes: SIZES };
  const w = getWorker();
  if (!w) return onMain(full);
  const id = ++seq;
  return new Promise<BakeResult>((ok, fail) => {
    // ein Foto braucht im Worker etwa eine Sekunde; antwortet er nicht, hängt sonst „Fertig“ für immer
    const t = setTimeout(() => reset("Worker antwortet nicht"), 60_000);
    waiting.set(id, {
      ok: (r) => (clearTimeout(t), ok(r)),
      fail: (e) => (clearTimeout(t), fail(e)),
    });
    w.postMessage({ id, job: full });
  }).catch((e) => {
    console.warn("[bearbeiten] Worker", e instanceof Error ? e.message : e);
    return onMain(full);
  }) as Promise<BakeResult>;
}
