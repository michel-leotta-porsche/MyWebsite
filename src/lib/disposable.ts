import { MORE0, neutralEdit, REC0, type More, type PhotoEdit, type RecipeValues } from "@/lib/develop/model";
import { de } from "@/lib/i18n";

// Einwegkamera-Vorlagen (Workshop Einwegkamera, /mnt/project-files/einwegkamera-workshop-2026-10-09/vorlagen.md): eine Vorlage
// ist ein Film mit festen Regeln, kein Filter. 27 Bilder, fester Ausschnitt um 30 mm, kein Zoom, keine Räder, kein Tippen zum
// Scharfstellen, kein Heller/Dunkler, Blitz nach Vorlage. Eigene Namen statt Markennamen; die Werte sind ein erster Satz
// nach Datenblättern und müssen am iPhone gegen echte Einwegabzüge abgeglichen werden.

/** so viele Bilder hat eine Einwegkamera */
export const DISPOSABLE_FRAMES = 27;

export type Disposable = {
  id: string;
  name: string;
  txt: string;
  /** echter Blitz bei jedem Bild */
  flash: boolean;
  /** Brennweite der Vorlage, als fester Ausschnitt aus der Hauptkamera (24 mm) */
  mm: 30 | 32;
  rec: Partial<RecipeValues>;
  fine?: Partial<Pick<PhotoEdit, "exposure" | "contrast" | "warmth" | "sat">>;
  more?: Partial<Omit<More, "hsl">> & { hsl?: Partial<Record<Hue, [number, number, number]>> };
};

/** Stellen in HUES (model.ts) */
const HUE_AT = { rot: 0, orange: 1, gelb: 2, gruen: 3, tuerkis: 4, blau: 5, lila: 6, magenta: 7 } as const;
type Hue = keyof typeof HUE_AT;

export const DISPOSABLES: Disposable[] = [
  {
    id: "strandtag",
    name: de("Strandtag"),
    txt: de("warm und kräftig, ISO 800, mit Blitz"),
    flash: true,
    mm: 30,
    rec: { film: "sommer", wbR: 2, wbB: -3, hl: -1, sh: 0, color: 2, dr: 200, grain: 2, gsize: "klein" },
    fine: { exposure: 0.15 },
    more: { vignette: -0.35, blacks: 0.08 },
  },
  {
    id: "sonnenhut",
    name: de("Sonnenhut"),
    txt: de("hell und verwaschen wie in praller Sonne, ohne Blitz"),
    flash: false,
    mm: 32,
    rec: { film: "sommer", wbR: 2, wbB: -4, hl: -2, color: 1, dr: 400, grain: 1, gsize: "klein" },
    fine: { exposure: 0.35, contrast: -0.25 },
    more: {
      vignette: -0.3,
      curve: [
        [0, 0.06],
        [1, 0.97],
      ],
    },
  },
  {
    id: "kiosk",
    name: de("Kiosk"),
    txt: de("kühl, kräftiges Grün, mit Blitz"),
    flash: true,
    mm: 32,
    rec: { film: "salz", wbR: -1, wbB: 1, color: 1, dr: 100, grain: 1, gsize: "klein" },
    fine: { contrast: 0.2 },
    more: { tint: 0.15, hsl: { gruen: [0, 0.25, 0], tuerkis: [-0.2, 0, 0] }, vignette: -0.3 },
  },
  {
    id: "silberkorn",
    name: de("Silberkorn"),
    txt: de("Schwarzweiß mit sichtbarem Korn, mit Blitz"),
    flash: true,
    mm: 30,
    rec: { film: "kohle", hl: 0, sh: 0, grain: 2, gsize: "groß" },
    fine: { contrast: -0.1 },
    more: { vignette: -0.4 },
  },
  {
    id: "weiches-grau",
    name: de("Weiches Grau"),
    txt: de("Schwarzweiß weich, feines Korn, mit Blitz"),
    flash: true,
    mm: 30,
    rec: { film: "kohle", hl: -1, sh: -1, grain: 1, gsize: "klein" },
    fine: { warmth: 0.08, contrast: -0.2 },
    more: { vignette: -0.3 },
  },
  {
    id: "grossstadt",
    name: de("Großstadt"),
    txt: de("blass und hart, nur Rot bleibt, mit Blitz"),
    flash: true,
    mm: 30,
    rec: { grain: 2, gsize: "klein" },
    fine: { sat: -0.45, contrast: 0.45 },
    more: { tint: -0.15, hsl: { rot: [0, 0.4, 0], orange: [0, 0.1, 0] }, blacks: -0.1, vignette: -0.35 },
  },
  {
    id: "feldweg",
    name: de("Feldweg"),
    txt: de("natürlich und leicht gedämpft, mit Blitz"),
    flash: true,
    mm: 30,
    rec: { film: "sommer", wbR: 1, wbB: -1, color: -1, dr: 200, grain: 1, gsize: "klein" },
    more: { vignette: -0.25 },
  },
];

/** die Bearbeitung, die auf jedem Bild der Vorlage liegt (wie ein Look: das Original bleibt erhalten) */
export function disposableEdit(d: Disposable, name = d.name): PhotoEdit {
  const more = MORE0();
  const { hsl, ...rest } = d.more ?? {};
  Object.assign(more, rest);
  for (const [hue, v] of Object.entries(hsl ?? {})) more.hsl[HUE_AT[hue as Hue]] = v;
  return { ...neutralEdit(), ...d.fine, rec: { ...REC0(), ...d.rec }, recName: name, more };
}
