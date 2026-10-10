import type { Dials } from "@/lib/camera";

// Langzeitbelichtung (#249). Apple erlaubt je Bild höchstens 1 s; länger entsteht durch Verrechnen vieler Einzelbilder
// in der App (CalimaCamera.swift, captureLong). Zwei Arten (Michel, Entscheidungskarte 10.10.): „Fließend“ mittelt viele
// kurze Bilder (Wasser wird weich, Helligkeit bleibt), „Lichtspuren“ behält je Pixel das Hellste (Autos, Sterne).

/** Zeiten über 1 s auf dem Zeit-Rad */
export const LONG_STOPS = [2, 4, 8, 15, 30];
export type LongMode = "fliessend" | "spuren";
/** gemerkte Art je Gerät */
export const LONG_MODE_KEY = "calima:langzeit";
/** so viele Einzelbilder je Sekunde liefert der Sucher höchstens */
const FPS = 30;

export const readLongMode = (v: string | null): LongMode => (v === "spuren" ? "spuren" : "fliessend");

/** Zeiten der Kamera plus die langen dahinter */
export const withLong = (stops: number[]) => [...stops, ...LONG_STOPS.filter((s) => s > (stops.at(-1) ?? 0))];

export const isLong = (d: Dials) => (d.duration ?? 0) > 1;

/** was die Kamera selbst bekommt: bei lang stellt sie die Einzelbilder (Zeit auf A), ISO bleibt, wie gewählt */
export const deviceDials = (d: Dials): Dials => (isLong(d) ? { ...d, duration: null } : d);

/**
 * wie viele Einzelbilder und wie lang jedes. meterDuration: was die Belichtung gerade für richtig hält. Lichtspuren
 * belichten jedes Bild so lang (höchstens 1 s); fließend kommen sie im Takt des Suchers, höchstens 30 je Sekunde
 */
export function longPlan(seconds: number, mode: LongMode, meterDuration: number): { frames: number; each: number } {
  const each = Math.min(1, meterDuration);
  const step = mode === "spuren" ? each : Math.max(each, 1 / FPS);
  return { frames: Math.max(1, Math.round(seconds / step)), each };
}
