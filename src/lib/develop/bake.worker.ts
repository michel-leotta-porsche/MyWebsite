// Einrechnen im Hintergrund: der Hauptthread bleibt frei, die Werkbank ruckelt nicht.

import { bake, type BakeJob } from "@/lib/develop/bake-core";

const make = (w: number, h: number) => new OffscreenCanvas(w, h);
const encode = (c: OffscreenCanvas | HTMLCanvasElement) => (c as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality: 0.86 });

self.onmessage = async (e: MessageEvent<{ id: number; job: BakeJob }>) => {
  const { id, job } = e.data;
  try {
    const out = await bake(job, make, encode);
    self.postMessage({ id, out });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : "Einrechnen fehlgeschlagen" });
  }
};
