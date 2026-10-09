"use client";

import { registerPlugin } from "@capacitor/core";

import { IS_APP } from "@/lib/app-mode";
import { buildLut, GRAIN, type PhotoEdit } from "@/lib/develop/model";

// Brücke zu Calimas Kamera in der iPhone-App (ios/App/App/CalimaCamera.swift). Der Sucher liegt hinter der Webansicht,
// die Seite malt die Bedienung darüber. Der Look geht als derselbe 3D-LUT hinüber, den die Vorschau beim Bearbeiten nutzt.
// Im Browser gibt es die Kamera nicht: jeder Aufruf scheitert leise, die Oberfläche bietet sie dort gar nicht erst an.

export type Frame = { x: number; y: number; w: number; h: number };

/** was die Kamera kann: echte Objektive als Zoomfaktoren zur Hauptkamera, Grenzen für Zeit und ISO */
export type CameraInfo = { front: boolean; lenses: number[]; limits: { minDuration: number; maxDuration: number; minISO: number; maxISO: number } };

/** Die Räder (Expertenmodus E1): null heißt „A“, die Kamera stellt selbst. duration in Sekunden, focus 0 (nah) bis 1 (fern), kelvin als Farbtemperatur. */
export type Dials = { duration: number | null; iso: number | null; focus: number | null; kelvin: number | null };
export const AUTO: Dials = { duration: null, iso: null, focus: null, kelvin: null };

/** Messung der Kamera, kommt als Ereignis „meter“: offset in EV zur Zielbelichtung, dazu die Werte, die gerade gelten */
export type Meter = { offset: number; duration: number; iso: number; lens: number; kelvin: number };

type Plugin = {
  start(o: { frame: Frame; lut?: string; n?: number }): Promise<CameraInfo>;
  layout(o: { frame: Frame }): Promise<void>;
  stop(): Promise<void>;
  setLut(o: { lut: string; n: number }): Promise<void>;
  setOriginal(o: { on: boolean }): Promise<void>;
  setExposure(o: { ev: number }): Promise<void>;
  setZoom(o: { factor: number }): Promise<{ factor: number }>;
  focus(o: { x: number; y: number }): Promise<void>;
  flip(): Promise<CameraInfo>;
  /** Räder stellen; fehlende oder null-Werte heißen A. Steht nur Zeit oder nur ISO, regelt die Kamera das andere nach (wie Fuji, Michels Wahl „Ausgleichen“) */
  setDials(o: Dials): Promise<void>;
  /** Lupe: der Sucher zeigt die Mitte dreifach vergrößert, zum Scharfstellen von Hand */
  setMagnify(o: { on: boolean }): Promise<void>;
  /** Wasserwaage: die App meldet die Neigung als Ereignis „level“ (data.roll in Grad, 0 = gerade) */
  setLevel(o: { on: boolean }): Promise<void>;
  capture(): Promise<{ path: string }>;
  discard(o: { path: string }): Promise<void>;
  /** Körnung live im Sucher: amount wie GRAIN.amount, cell wie GRAIN.cell (Anteil der Bildbreite); 0 schaltet sie ab */
  setGrain(o: { amount: number; cell: number }): Promise<void>;
  /** die Quick Action vom App-Symbol abholen, einmal: „kamera“ oder nichts (SceneDelegate.swift, CalimaLaunch) */
  launch(): Promise<{ action?: string }>;
  /**
   * Ereignisse aus der App: „shutter“ (Kamera-Knopf oder Lautstärketaste gedrückt), „zoom“ (am Kamera-Knopf gewischt,
   * data.factor relativ zur Hauptkamera), „launch“ (eine Quick Action wartet, abholen mit launch()). Vorgesehen auch für
   * Erkenner (Vorschläge wie Ticket oder Bordkarte, Reisebuch-Workshop).
   */
  addListener(event: "event", fn: (e: CameraEvent) => void): Promise<{ remove: () => Promise<void> }>;
};

export type CameraEvent = { name: "shutter" | "zoom" | "meter" | "level" | "launch" | (string & {}); data: Record<string, unknown> };

/* ----- Expertenmodus E1: Brennweiten, Räder, Messer (expertenmodus-workshop-2026-10-09/) ----- */

/** Brennweiten als Reihe, bezogen auf die Hauptkamera mit 24 mm. Was kein echtes Objektiv ist, ist ein Ausschnitt */
export const FOCALS = [13, 24, 28, 35, 50, 85, 120] as const;
export const MAIN_MM = 24;
export const focalZoom = (mm: number) => mm / MAIN_MM;
/** echte Objektive aus den Umschaltpunkten der Kamera (0,5 → 13 mm, 1 → 24 mm, 5 → 120 mm), auf die Reihe gerundet */
export const realFocals = (lenses: number[]): number[] =>
  lenses.map((f) => FOCALS.reduce((best, mm) => (Math.abs(focalZoom(mm) - f) < Math.abs(focalZoom(best) - f) ? mm : best), FOCALS[0]));

/** Zeiten in Drittelstufen von 1/8000 bis 1 s (Apples Grenze); die Kamera klemmt auf das, was sie kann */
export const SHUTTER_STOPS: number[] = (() => {
  const out: number[] = [];
  for (let i = 0; i <= 39; i++) out.push(2 ** (-13 + i / 3)); // 1/8192 … 1
  return out.map((s) => (s >= 1 ? 1 : s));
})();
/** ISO in Drittelstufen ab 25 */
export const ISO_STOPS: number[] = [25, 32, 40, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800];
/** Farbtemperatur in 100-Kelvin-Schritten */
export const KELVIN = { min: 2500, max: 8000, step: 100 };

/** Belichtungszeit lesbar: 1/250, 0,5 s, 1 s */
export function fmtDuration(s: number): string {
  if (s >= 1) return `${s % 1 ? s.toFixed(1).replace(".", ",") : s} s`;
  if (s >= 0.3) return `${s.toFixed(1).replace(".", ",")} s`;
  const d = Math.round(1 / s);
  return `1/${d >= 1000 ? Math.round(d / 10) * 10 : d}`;
}
export const fmtISO = (iso: number) => `ISO ${iso >= 1000 ? Math.round(iso / 10) * 10 : Math.round(iso)}`;
export const fmtKelvin = (k: number) => `${Math.round(k / 100) * 100} K`;
/** Lage der Linse als Wort: nah … fern */
export const fmtFocus = (f: number) => (f >= 0.98 ? "∞" : f <= 0.02 ? "nah" : `${Math.round(f * 100)} %`);

/** nächste Raststellung einer Reihe */
export const nearest = (list: readonly number[], v: number) => list.reduce((b, x) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(b / v)) ? x : b), list[0]);


/** Ereignis an das Fotostudio im Bücherzimmer: Kamera öffnen. Wer es übernimmt, ruft preventDefault() */
export const OPEN_CAMERA = "calima:kamera";

/** Ein Film: ein Look, so viele Bilder, dann ein Stapel. 24 wie ein kurzer Kleinbildfilm; mehr sprengt den Platz im Fotostudio (MAX_KEPT) */
export const FILM_FRAMES = 24;

/** Körnung des Looks für den Sucher; ohne Körnung 0 */
export const grainOf = (e: PhotoEdit | null): { amount: number; cell: number } =>
  e && e.rec.grain ? { amount: GRAIN.amount[e.rec.grain], cell: GRAIN.cell[e.rec.gsize] } : { amount: 0, cell: 0 };

export const LUT_N = 33;
export const CalimaCamera = registerPlugin<Plugin>("CalimaCamera");

/** gibt es die Kamera hier? nur in der App; ob das Gerät eine hat, zeigt erst start() */
export const hasCamera = () => IS_APP;

/** LUT als Base64 für die Brücke (143 kB bei 33 Punkten); in Stücken, damit kein Aufruf mit 140 000 Argumenten entsteht */
export function lutOf(e: PhotoEdit): { lut: string; n: number } {
  const lut = buildLut(e, LUT_N);
  let s = "";
  for (let i = 0; i < lut.length; i += 0x8000) s += String.fromCharCode(...lut.subarray(i, i + 0x8000));
  return { lut: btoa(s), n: LUT_N };
}

/** Das eben aufgenommene Foto aus dem Cache der App holen und die Datei dort wieder löschen */
export async function takeShot(path: string, name: string): Promise<File> {
  const { Capacitor } = await import("@capacitor/core");
  try {
    const res = await fetch(Capacitor.convertFileSrc(path));
    if (!res.ok) throw new Error("Foto nicht lesbar");
    const blob = await res.blob();
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    CalimaCamera.discard({ path }).catch(() => {});
  }
}

/** Fehlercode der Brücke, wenn die Kamera nicht erlaubt ist */
export const isDenied = (e: unknown) => typeof e === "object" && !!e && (e as { code?: string }).code === "denied";
