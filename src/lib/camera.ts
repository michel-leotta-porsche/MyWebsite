"use client";

import { registerPlugin } from "@capacitor/core";

import { IS_APP } from "@/lib/app-mode";
import { buildLut, GRAIN, type PhotoEdit } from "@/lib/develop/model";

// Brücke zu Calimas Kamera in der iPhone-App (ios/App/App/CalimaCamera.swift). Der Sucher liegt hinter der Webansicht,
// die Seite malt die Bedienung darüber. Der Look geht als derselbe 3D-LUT hinüber, den die Vorschau beim Bearbeiten nutzt.
// Im Browser gibt es die Kamera nicht: jeder Aufruf scheitert leise, die Oberfläche bietet sie dort gar nicht erst an.

export type Frame = { x: number; y: number; w: number; h: number };

type Plugin = {
  start(o: { frame: Frame; lut?: string; n?: number }): Promise<{ front: boolean }>;
  layout(o: { frame: Frame }): Promise<void>;
  stop(): Promise<void>;
  setLut(o: { lut: string; n: number }): Promise<void>;
  setOriginal(o: { on: boolean }): Promise<void>;
  setExposure(o: { ev: number }): Promise<void>;
  setZoom(o: { factor: number }): Promise<{ factor: number }>;
  focus(o: { x: number; y: number }): Promise<void>;
  flip(): Promise<{ front: boolean }>;
  capture(): Promise<{ path: string }>;
  discard(o: { path: string }): Promise<void>;
  /** Körnung live im Sucher: amount wie GRAIN.amount, cell wie GRAIN.cell (Anteil der Bildbreite); 0 schaltet sie ab */
  setGrain(o: { amount: number; cell: number }): Promise<void>;
  /**
   * Ereignisse aus der App: „shutter“ (Kamera-Knopf oder Lautstärketaste gedrückt), „zoom“ (am Kamera-Knopf gewischt,
   * data.factor relativ zur Hauptkamera). Vorgesehen auch für Erkenner (Vorschläge wie Ticket oder Bordkarte, Reisebuch-Workshop).
   */
  addListener(event: "event", fn: (e: CameraEvent) => void): Promise<{ remove: () => Promise<void> }>;
};

export type CameraEvent = { name: "shutter" | "zoom" | (string & {}); data: Record<string, unknown> };

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
