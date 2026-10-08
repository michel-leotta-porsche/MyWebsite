"use client";

// Einrechnen anstoßen: im Worker, wenn der Browser OffscreenCanvas mit 2D und JPEG kann, sonst im Hauptthread.

import { bake, type BakeJob, type BakeResult } from "@/lib/develop/bake-core";
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
  return worker;
}

const mainMake = (w: number, h: number) => Object.assign(document.createElement("canvas"), { width: w, height: h });
const mainEncode = (c: OffscreenCanvas | HTMLCanvasElement) =>
  new Promise<Blob>((ok, fail) => (c as HTMLCanvasElement).toBlob((b) => (b ? ok(b) : fail(new Error("Kodieren fehlgeschlagen"))), "image/jpeg", 0.86));

/** Ein Foto mit seinem LUT neu rechnen, drei Größen wie beim Hochladen */
export function bakePhoto(job: Omit<BakeJob, "sizes">): Promise<BakeResult> {
  const full: BakeJob = { ...job, sizes: SIZES };
  const w = getWorker();
  if (!w) return bake(full, mainMake, mainEncode);
  const id = ++seq;
  return new Promise((ok, fail) => {
    waiting.set(id, { ok, fail });
    w.postMessage({ id, job: full });
  }).catch(() => bake(full, mainMake, mainEncode)) as Promise<BakeResult>;
}
