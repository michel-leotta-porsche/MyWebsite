import { t } from "@/lib/i18n";
import type { StoredBook, StoredPhoto } from "@/lib/store";

// Buchdatei („Projekt als Datei sichern“): schreiben ohne Kontodaten, beim Öffnen streng prüfen.
// Eine fremde Datei darf keine fremden Bildquellen oder Links ins Buch bringen, denn über geteilte Links
// landen sie bei jedem Gast (Workshop Paket 6, Murat).

/** Formatkennung bleibt aus der Zeit vor der Umbenennung, damit ältere Buchdateien weiter laden */
const FORMAT = "fujiventura-buch";
/** Firestore nimmt ein Buch bis 1 MiB; größer kann keine echte Buchdatei sein */
export const MAX_FILE = 1024 * 1024;
const MAX_PHOTOS = 200;
const MAX_SPREADS = 200;
const MAX_INLINE = 32 * 1024;

/** Eigene Fotos liegen im Storage des Projekts oder, im Testmodus und bei Michels Büchern, unter eigenen Pfaden */
const STORAGE = "https://firebasestorage.googleapis.com/v0/b/fujiventura.firebasestorage.app/o/";
const ownImage = (u: unknown) => typeof u === "string" && (u.startsWith(STORAGE) || (u.startsWith("/") && !u.startsWith("//")));
const ownPath = (u: unknown) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//");
const httpsUrl = (u: unknown) => {
  if (typeof u !== "string") return false;
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};
const text = (v: unknown, max: number) => v === undefined || (typeof v === "string" && v.length <= max);

export class BookFileError extends Error {}
const fail = (msg: string): never => {
  throw new BookFileError(msg);
};

/** Kennung, Konto und Papierkorb gehören nicht in die Datei; beim Öffnen setzt sie das eigene Konto neu */
function withoutAccount(b: StoredBook): Omit<StoredBook, "id" | "owner" | "ownerName"> {
  const rest: Partial<StoredBook> = { ...b };
  delete rest.id;
  delete rest.owner;
  delete rest.ownerName;
  delete rest.trashed;
  return rest as Omit<StoredBook, "id" | "owner" | "ownerName">;
}

/** Datei für „Projekt als Datei sichern“: Aufbau, Texte und Links zu den eigenen Fotos, ohne Kennung und Konto */
export function bookFileText(b: StoredBook, schema: number): string {
  return JSON.stringify({ format: FORMAT, schema, exportedAt: new Date().toISOString(), book: withoutAccount(b) }, null, 1);
}

function checkPhoto(p: StoredPhoto) {
  if (!p || typeof p !== "object" || typeof p.key !== "string") fail(t("Ein Foto in der Datei ist beschädigt."));
  if (!ownImage(p.src) || !ownImage(p.large) || !ownImage(p.thumb)) fail(t("Die Datei verweist auf Fotos außerhalb von Calima."));
  if (p.orig && (!ownImage(p.orig.src) || !ownImage(p.orig.large) || !ownImage(p.orig.thumb))) fail(t("Die Datei verweist auf Fotos außerhalb von Calima."));
  if (!Number.isFinite(p.w) || !Number.isFinite(p.h) || p.w <= 0 || p.h <= 0) fail(t("Ein Foto in der Datei ist beschädigt."));
  if (!text(p.title, 200) || !text(p.note, 2000) || !text(p.alt, 500)) fail(t("Ein Text in der Datei ist zu lang."));
  const r = p.recipe;
  if (r?.kind === "lightroom") {
    if (r.xmp !== undefined && !ownPath(r.xmp)) fail(t("Die Datei verweist auf ein Preset außerhalb von Calima."));
    if (r.source !== undefined && !httpsUrl(r.source?.url)) fail(t("Die Datei enthält einen ungültigen Link."));
    if (!text(r.inline, MAX_INLINE)) fail(t("Ein Preset in der Datei ist zu groß."));
  }
}

/**
 * Buchdatei lesen und prüfen. Gibt das Buch ohne Kennung und Konto zurück; die setzt der Aufrufer.
 * Wirft BookFileError mit einem Satz für die Nutzerin.
 */
export function parseBookFile(raw: string, schema: number): Omit<StoredBook, "id" | "owner" | "ownerName"> {
  if (raw.length > MAX_FILE) fail(t("Die Datei ist zu groß für eine Calima-Buchdatei."));
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    fail(t("Das ist keine Calima-Buchdatei. Sie endet auf .calima.json."));
  }
  const d = data as { format?: unknown; schema?: unknown; book?: unknown };
  if (!d || d.format !== FORMAT || !d.book || typeof d.book !== "object") fail(t("Das ist keine Calima-Buchdatei. Sie endet auf .calima.json."));
  if (d.schema !== undefined && (typeof d.schema !== "number" || d.schema > schema)) fail(t("Die Datei stammt aus einer neueren Calima-Version."));
  const b = d.book as StoredBook;
  if (!Array.isArray(b.photos) || b.photos.length > MAX_PHOTOS) fail(t("Die Datei enthält keine gültige Fotoliste."));
  if (!Array.isArray(b.spreads) || b.spreads.length > MAX_SPREADS) fail(t("Die Datei enthält keine gültigen Doppelseiten."));
  if (!text(b.title, 200) || !text(b.subtitle, 400) || !text(b.places, 400)) fail(t("Ein Text in der Datei ist zu lang."));
  if (!Number.isFinite(b.aspect)) fail(t("Das Seitenformat in der Datei ist beschädigt."));
  b.photos.forEach(checkPhoto);
  return withoutAccount(b);
}
