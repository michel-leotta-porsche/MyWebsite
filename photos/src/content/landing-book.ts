import { across, bookById, build, ENDPAPER, framed, full, landscape, small, TITLE, type Photo } from "@/content/books";

// Vorführbuch für die Landing: ein kurzer Band aus Fotos des Fuerteventura-Buchs,
// gesetzt mit denselben Seitentypen wie jedes echte Buch.
const source = bookById("fuerteventura")!;
const pick = (...keys: string[]) =>
  // Nummer und Schlüssel der Tafel vergibt build() neu
  Object.fromEntries(keys.map((key): [string, Photo] => [key, source.plates.find((p) => p.key === key)!]));

export const landingBook = build({
  id: "landing",
  title: "Sommer",
  subtitle: "Fuerteventura, sieben Fotografien",
  author: "Dein Name",
  colophon: [],
  aspect: source.aspect,
  scale: 1,
  bottom: source.bottom,
  cloth: source.cloth,
  light: "sun",
  coverKey: "rettungsturm",
  photos: pick("palme", "rettungsturm", "sonnenschirm", "bougainvillea", "felsbogen", "strand", "markisen"),
  sequence: [
    [ENDPAPER, TITLE],
    [full("palme"), framed("rettungsturm")],
    [small("sonnenschirm", 3, "top", "outer"), full("bougainvillea")],
    [across("felsbogen")],
    [landscape("strand"), full("markisen")],
  ],
});
