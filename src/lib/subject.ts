"use client";

// Wo liegt das Hauptmotiv? Zuerst Gesichter (FaceDetector, wo der Browser ihn kennt), sonst eine
// einfache Auffälligkeitskarte: Kanten und Sättigung, leicht zur Mitte gewichtet. Ergebnis 0..1.

type Detector = { detect: (src: CanvasImageSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> };

export async function findSubject(source: HTMLCanvasElement | HTMLImageElement): Promise<{ point: [number, number]; face: boolean }> {
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const FD = (globalThis as unknown as { FaceDetector?: new (o: object) => Detector }).FaceDetector;
  if (FD) {
    try {
      const faces = await new FD({ fastMode: true, maxDetectedFaces: 5 }).detect(source);
      if (faces.length) {
        const big = faces.reduce((a, b) => (b.boundingBox.width * b.boundingBox.height > a.boundingBox.width * a.boundingBox.height ? b : a));
        const r = big.boundingBox;
        return { point: [(r.x + r.width / 2) / w, (r.y + r.height / 2) / h], face: true };
      }
    } catch {}
  }
  const N = 48;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, N, N);
  const d = ctx.getImageData(0, 0, N, N).data;
  const lum = new Float32Array(N * N);
  const sat = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const r = d[i * 4] / 255;
    const g = d[i * 4 + 1] / 255;
    const b = d[i * 4 + 2] / 255;
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mx = Math.max(r, g, b);
    sat[i] = mx ? (mx - Math.min(r, g, b)) / mx : 0;
  }
  const energy: { i: number; e: number }[] = [];
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const gx = lum[i + 1] - lum[i - 1];
      const gy = lum[i + N] - lum[i - N];
      const center = 1 - 0.35 * Math.hypot(x / N - 0.5, y / N - 0.5);
      energy.push({ i, e: (Math.hypot(gx, gy) * 2 + sat[i] * 0.6) * center });
    }
  energy.sort((a, b) => b.e - a.e);
  const top = energy.slice(0, Math.round(energy.length * 0.08));
  const sum = top.reduce((a, t) => a + t.e, 0) || 1;
  const px = top.reduce((a, t) => a + (t.i % N) * t.e, 0) / sum / N;
  const py = top.reduce((a, t) => a + Math.floor(t.i / N) * t.e, 0) / sum / N;
  return { point: [Math.min(0.95, Math.max(0.05, px)), Math.min(0.95, Math.max(0.05, py))], face: false };
}
