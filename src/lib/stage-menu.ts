// Menü beim langen Drücken auf der Bühne am Handy (#275, #218): oben große Symbol-Kacheln,
// darunter, was zum Element gehört, unten die Ebene als eine Zeile. Am Rechner bleibt das Kontextmenü eine Liste.

/** worauf der Finger lag: ein Element oder das leere Papier */
export type MenuTarget = "photo" | "text" | "shape" | "ink" | "paper";
/** Kacheln oben; Löschen steht immer zuletzt (rot), Überschrift, Text und Notiz legen auf dem Papier etwas an */
export type MenuTile = "copy" | "duplicate" | "cut" | "paste" | "delete" | "heading" | "body" | "note";
/** Zeilen darunter: Zuschneiden, Unterschrift (Schalter), Text schreiben, Art (Segment), helle Schrift (Schalter), Formen, Einfügen */
export type MenuRow = "crop" | "caption" | "write" | "role" | "light" | "shapes" | "paste";
export type SheetPlan = { tiles: MenuTile[]; rows: MenuRow[]; layer: boolean };

/** so lange ohne Bewegung, dann öffnet das Menü beim Loslassen; gilt für Elemente und Papier */
export const LONG_PRESS_MS = 550;
/** so weit (px) darf der Finger wandern, ohne dass es ein Zug wird */
export const PRESS_SLOP = 8;

export const pressMoved = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y) > PRESS_SLOP;

const ROWS: Record<Exclude<MenuTarget, "paper">, MenuRow[]> = { photo: ["crop", "caption"], text: ["write", "role", "light"], shape: [], ink: [] };

/**
 * Aufbau des Blatts. Einfügen nur, wenn Calimas Zwischenablage etwas hält: aufs Papier als vierte Kachel,
 * am Element als Zeile, weil fünf Kacheln am iPhone die Namen umbrechen.
 */
export function sheetPlan(target: MenuTarget, { clip }: { clip: boolean }): SheetPlan {
  if (target === "paper") return { tiles: clip ? ["heading", "body", "note", "paste"] : ["heading", "body", "note"], rows: ["shapes"], layer: false };
  return { tiles: ["copy", "duplicate", "cut", "delete"], rows: clip ? [...ROWS[target], "paste"] : ROWS[target], layer: true };
}
