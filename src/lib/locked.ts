import type { PhotoEdit } from "@/lib/develop/model";

// Kamera vom Sperrbildschirm und Kamera-Knopf (#187, Grilling 10.10.: Umfang c). Gesperrt läuft keine Web-Oberfläche:
// eine kleine native Kamera (eigene Erweiterung, Mac-Sitzung) zeigt Looks, Brennweite, Auslöser und Pipette. Die Looks
// gibt ihr die Calima-Kamera beim Öffnen mit (shareLooks); was gesperrt aufgenommen wird, holt das Fotostudio beim
// nächsten Öffnen ab (takeLocked) und legt es mit seinem Look auf den Abendstapel.

export type LockedLook = { id: string; name: string; edit: PhotoEdit | null };
/** Foto der gesperrten Kamera: Datei im Cache der App, Aufnahmezeit (ms), Kennung des Looks */
export type LockedShot = { path: string; at: number; look?: string };

/** wo die Calima-Kamera die geteilten Looks mit ihrer Bearbeitung merkt, damit das Studio die Fotos zuordnen kann */
export const LOCKED_KEY = "calima:gesperrt";

/** so viele Looks bekommt die gesperrte Kamera; jeder ist ein Würfel von rund 190 kB */
export const LOCKED_MAX = 8;

/** der gewählte Look zuerst, dann die übrigen in ihrer Reihenfolge */
export function lockedLooks(looks: LockedLook[], active: string): LockedLook[] {
  const first = looks.find((l) => l.id === active);
  return [...(first ? [first] : []), ...looks.filter((l) => l !== first)].slice(0, LOCKED_MAX);
}

export const editFor = (shot: LockedShot, looks: LockedLook[]): PhotoEdit | undefined => looks.find((l) => l.id === shot.look)?.edit ?? undefined;

export function readLockedLooks(v: string | null): LockedLook[] {
  try {
    const a = JSON.parse(v ?? "null");
    return Array.isArray(a) ? a.filter((l): l is LockedLook => !!l && typeof l.id === "string" && typeof l.name === "string") : [];
  } catch {
    return [];
  }
}
