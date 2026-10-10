import { de } from "@/lib/i18n";

// Aufbau der Landing (#264, Landing-Workshop 10.10.): Freunde öffnen den Link auf dem Telefon und sollen zuerst
// ein echtes Buch umblättern, erst danach kommt die Anmeldung. landing.tsx zeichnet die Abschnitte in dieser Reihenfolge.
export const SECTIONS = [{ id: "blaettern" }, { id: "eigenes" }, { id: "kann" }, { id: "so-gehts" }] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/** Eine Zeile Untertitel, Zeiten in Sekunden */
export type Cue = { from: number; to: number; de: string };

export type Clip = { src: string; poster: string; duration: number; cues: Cue[] };

// Michels Clips (englische Schrift im Bild), still und in Schleife, 720×1280. Auf der deutschen Seite laufen
// deutsche Untertitel darunter mit; auf der englischen nicht, dort steht der Text schon im Bild.
// „Make it yours“ zeigt Kamera und „Get Calima“ und kommt erst mit dem Store-Start.
export const CLIPS = {
  hinlegen: {
    src: "/clips/hinlegen.mp4",
    poster: "/clips/hinlegen.jpg",
    duration: 18,
    cues: [
      { from: 1, to: 3.5, de: "Ein ganzer Sommer … noch in einem Ordner." },
      { from: 3.5, to: 5, de: "Rein damit." },
      { from: 5, to: 7.2, de: "Calima bindet sie zu einem Buch." },
      { from: 7.4, to: 10.2, de: "Seiten, die man wirklich umblättert." },
      { from: 12, to: 13.5, de: "Nicht posten." },
      { from: 13.5, to: 15, de: "Einem Menschen hinlegen." },
      { from: 16.5, to: 18, de: "Deine Fotos, gebunden." },
    ],
  },
  rezept: {
    src: "/clips/ein-look.mp4",
    poster: "/clips/ein-look.jpg",
    duration: 18,
    cues: [
      { from: 0.5, to: 2.8, de: "Drei Kameras. Drei Looks." },
      { from: 3, to: 5.4, de: "Calima liest das Rezept …" },
      { from: 5.4, to: 7.9, de: "… und das Preset." },
      { from: 8, to: 9.4, de: "Einmal kopieren." },
      { from: 9.5, to: 11.6, de: "Jedes Foto bekommt ihn." },
      { from: 12, to: 13.3, de: "Ein Look." },
      { from: 13.5, to: 14.6, de: "Ein Buch." },
      { from: 16.5, to: 18, de: "Deine Fotos, gebunden." },
    ],
  },
} satisfies Record<string, Clip>;

/** Untertitel zur Abspielzeit t, null zwischen zwei Zeilen */
export function cueAt(cues: Cue[], t: number): string | null {
  return cues.find((c) => t >= c.from && t < c.to)?.de ?? null;
}

// Drei Schritte, jeder verweist auf die Hilfe. Sobald Hilfe Welle 1 freigegeben ist, zeigen sie auf die einzelnen Seiten.
export const HOWTO = [
  { title: de("Fotos reinziehen"), text: de("Im Bücherzimmer ein Buch anlegen und Fotos auswählen. Calima setzt sie nach Aufnahmezeit zu Doppelseiten."), href: "/hilfe" },
  { title: de("Gestalten, wenn du willst"), text: de("Bilder schieben, zuschneiden, Text dazu. Das Fuji-Rezept liegt als Zettel unter dem Foto."), href: "/hilfe" },
  { title: de("Hinlegen|Landing"), text: de("Für jede Person ein eigener Link. Sie blättert ohne Konto und lässt dir Zettel da."), href: "/hilfe" },
] as const;

/** Öffentlicher TestFlight-Link für Freunde (#265); bis er steht, sagt die Landing nur, dass die App kommt */
export const TESTFLIGHT_URL: string | null = null;
