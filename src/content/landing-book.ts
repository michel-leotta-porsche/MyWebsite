import { across, bookById, build, framed, full, type Photo } from "@/content/books";
import { de } from "@/lib/i18n";

// Vorführbuch für die Landing: drei Doppelseiten aus den stärksten Fotos des Fuerteventura-Buchs,
// gesetzt mit denselben Seitentypen wie jedes echte Buch. Am Ende ein Bild über den Bund:
// beim letzten Umblättern biegt sich das Blatt darüber, das zeigt die Biegung am schönsten.
const source = bookById("fuerteventura")!;
const pick = (...keys: string[]) =>
  // Nummer und Schlüssel der Tafel vergibt build() neu
  Object.fromEntries(keys.map((key): [string, Photo] => [key, source.plates.find((p) => p.key === key)!]));

export const landingBook = build({
  id: "landing",
  title: "Fuerteventura",
  subtitle: de("Fünf Fotografien"),
  author: "Michel Leotta",
  colophon: [],
  aspect: source.aspect,
  scale: 1,
  bottom: source.bottom,
  cloth: source.cloth,
  light: "sun",
  coverKey: "rettungsturm",
  photos: pick("schild", "drachenbaum", "palme", "rettungsturm", "felsbogen"),
  sequence: [
    [full("schild"), full("drachenbaum")],
    [full("palme"), framed("rettungsturm")],
    [across("felsbogen")],
  ],
});
