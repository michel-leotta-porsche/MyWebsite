import type { StaticImageData } from "next/image";

import type { CameraInfo, Recipe } from "@/content/recipes";
import type { PhotoEdit } from "@/lib/develop/model";
import { de, t } from "@/lib/i18n";

import drachenbaum from "../../public/photos/08-drachenbaum.jpg";
import rettungsturm from "../../public/photos/09-rettungsturm.jpg";
import strand from "../../public/photos/03-strand.jpg";
import schild from "../../public/photos/01-schild-am-meer.jpg";
import palme from "../../public/photos/02-palme.jpg";
import kaktusDach from "../../public/photos/05-kaktus-dach.jpg";
import felsbogen from "../../public/photos/11-felsbogen.jpg";
import sonnenschirm from "../../public/photos/sonnenschirm.jpg";
import wolfsmilch from "../../public/photos/07-wolfsmilch.jpg";
import bougainvillea from "../../public/photos/04-bougainvillea.jpg";
import mittagsblume from "../../public/photos/06-mittagsblume.jpg";
import seetraube from "../../public/photos/14-seetraube.jpg";
import trompetenblume from "../../public/photos/13-trompetenblume.jpg";
import weihnachtsstern from "../../public/photos/12-weihnachtsstern.jpg";
import gartenAuto from "../../public/photos/garten-auto.jpg";
import gitterGarten from "../../public/photos/gitter-garten.jpg";
import blumentopf from "../../public/photos/blumentopf.jpg";
import stuhl from "../../public/photos/10-stuhl.jpg";
import stuehleGelb from "../../public/photos/stuehle-gelb.jpg";
import raupe from "../../public/photos/raupe.jpg";
import nr2 from "../../public/photos/nr2.jpg";
import markisen from "../../public/photos/markisen.jpg";
import spiegel from "../../public/photos/spiegel.jpg";
import reifen from "../../public/photos/reifen.jpg";
import padel from "../../public/photos/padel.jpg";
import hunde from "../../public/photos/15-hunde.jpg";
import bruecke from "../../public/photos/japan/bruecke.jpg";
import fisch from "../../public/photos/japan/fisch.jpg";
import reiher from "../../public/photos/japan/reiher.jpg";
import bambus from "../../public/photos/japan/bambus.jpg";
import sakeSaeulen from "../../public/photos/japan/sake-saeulen.jpg";
import sakeSaeule from "../../public/photos/japan/sake-saeule.jpg";
import jizo from "../../public/photos/japan/jizo.jpg";
import torii from "../../public/photos/japan/torii.jpg";
import stadt from "../../public/photos/japan/stadt.jpg";
import fenster from "../../public/photos/japan/fenster.jpg";
import leuchtreklame from "../../public/photos/japan/leuchtreklame.jpg";
import ramen from "../../public/photos/japan/ramen.jpg";
import hirsche from "../../public/photos/japan/hirsche.jpg";
import neujahrsfahnen from "../../public/photos/japan/neujahrsfahnen.jpg";

// Kleine Abzüge (360px) für Einstieg und Bildverzeichnis, aus den Originalen erzeugt
import drachenbaumThumb from "./thumbs/08-drachenbaum.jpg";
import rettungsturmThumb from "./thumbs/09-rettungsturm.jpg";
import strandThumb from "./thumbs/03-strand.jpg";
import schildThumb from "./thumbs/01-schild-am-meer.jpg";
import palmeThumb from "./thumbs/02-palme.jpg";
import kaktusDachThumb from "./thumbs/05-kaktus-dach.jpg";
import felsbogenThumb from "./thumbs/11-felsbogen.jpg";
import sonnenschirmThumb from "./thumbs/sonnenschirm.jpg";
import wolfsmilchThumb from "./thumbs/07-wolfsmilch.jpg";
import bougainvilleaThumb from "./thumbs/04-bougainvillea.jpg";
import mittagsblumeThumb from "./thumbs/06-mittagsblume.jpg";
import seetraubeThumb from "./thumbs/14-seetraube.jpg";
import trompetenblumeThumb from "./thumbs/13-trompetenblume.jpg";
import weihnachtssternThumb from "./thumbs/12-weihnachtsstern.jpg";
import gartenAutoThumb from "./thumbs/garten-auto.jpg";
import gitterGartenThumb from "./thumbs/gitter-garten.jpg";
import blumentopfThumb from "./thumbs/blumentopf.jpg";
import stuhlThumb from "./thumbs/10-stuhl.jpg";
import stuehleGelbThumb from "./thumbs/stuehle-gelb.jpg";
import raupeThumb from "./thumbs/raupe.jpg";
import nr2Thumb from "./thumbs/nr2.jpg";
import markisenThumb from "./thumbs/markisen.jpg";
import spiegelThumb from "./thumbs/spiegel.jpg";
import reifenThumb from "./thumbs/reifen.jpg";
import padelThumb from "./thumbs/padel.jpg";
import hundeThumb from "./thumbs/15-hunde.jpg";
import brueckeThumb from "./thumbs/japan/bruecke.jpg";
import fischThumb from "./thumbs/japan/fisch.jpg";
import reiherThumb from "./thumbs/japan/reiher.jpg";
import bambusThumb from "./thumbs/japan/bambus.jpg";
import sakeSaeulenThumb from "./thumbs/japan/sake-saeulen.jpg";
import sakeSaeuleThumb from "./thumbs/japan/sake-saeule.jpg";
import jizoThumb from "./thumbs/japan/jizo.jpg";
import toriiThumb from "./thumbs/japan/torii.jpg";
import stadtThumb from "./thumbs/japan/stadt.jpg";
import fensterThumb from "./thumbs/japan/fenster.jpg";
import leuchtreklameThumb from "./thumbs/japan/leuchtreklame.jpg";
import ramenThumb from "./thumbs/japan/ramen.jpg";
import hirscheThumb from "./thumbs/japan/hirsche.jpg";
import neujahrsfahnenThumb from "./thumbs/japan/neujahrsfahnen.jpg";

export type Photo = {
  title: string;
  /** Kurzer Zusatz unter dem Titel, nur Fakten */
  note?: string;
  alt: string;
  src: StaticImageData;
  thumb: StaticImageData;
  /** Bildausschnitt beim Beschneiden (object-position), 0..1 */
  focus?: [number, number];
  /** Vergrößerung im Bildfeld (1 = füllt das Feld) */
  zoom?: number;
  /** contain: das ganze Foto im Feld, ohne Beschnitt */
  fit?: "cover" | "contain";
  /** Rezept und Kamera, wenn das Foto sie selbst mitbringt (hochgeladene Bücher) */
  recipe?: Recipe;
  camera?: CameraInfo;
  /** nachbearbeitet im Editor: steht dann auf dem Zettel */
  edit?: PhotoEdit;
};

/** Tafel: ein Foto mit seiner Nummer im Buch (Reihenfolge des ersten Auftritts) */
export type Plate = Photo & { no: number; key: string };

/**
 * Seitentypen nach dem Workshop-Konzept (docs/workshop-konzept.md):
 * full = randlos (T1), plate = füllt den Satzspiegel (T2), small = kleine Tafel auf dem Raster (T3),
 * landscape = Querformat über die Seitenbreite (T4), across = über den Bund (T5),
 * blank = leer bis auf die Unterschrift der Gegenseite (T6), tall = hohes Format am Bund (T7).
 */
export type Page =
  | { kind: "cover" }
  | { kind: "endpaper" }
  | { kind: "title" }
  | { kind: "index" }
  | { kind: "colophon" }
  | { kind: "verso" }
  | { kind: "full"; no: number }
  | { kind: "plate"; no: number }
  | { kind: "small"; no: number; cols: 2 | 3; row: "top" | "bottom"; align: "outer" | "inner" }
  | { kind: "landscape"; no: number }
  | { kind: "across"; no: number; half: "left" | "right" }
  | { kind: "blank"; no: number }
  | { kind: "tall"; no: number }
  /** Textseite: Überschrift und kurze Absätze im Satzspiegel */
  | { kind: "text"; heading?: string; body: string; style: TextStyle }
  /** frei gestaltete Seite (Editor V2): Fotos und Textrahmen auf dem Raster */
  | { kind: "free"; items: FreeEl[] };

export type TextStyle = "text" | "gross";

/** Lage auf einer Seite in % der Seitenbreite (x, w) und Seitenhöhe (y, h); x < 0 oder > 100 für Bilder über den Bund */
export type Box = { x: number; y: number; w: number; h: number };
/** Ausschnitt einer Platzierung */
export type Crop = { focus: [number, number]; zoom: number; fit: "cover" | "contain" };
export type TextRole = "heading" | "body" | "note";
export type FontKey = "grotesk" | "serif" | "mono" | "hand";
/** freie Gestaltung eines Textrahmens; was fehlt, kommt vom Stil (role) */
export type TextLook = { font?: FontKey; size?: number; color?: string; align?: "left" | "center" | "right"; bold?: boolean; italic?: boolean };
/** Formen: Linie, Pfeil und Klebestreifen laufen von Ecke zu Ecke ihrer Box, from ist die Ecke am Anfang (Standard oben links) */
export type Corner = "tl" | "tr" | "bl" | "br";
export type ShapeKind = "line" | "arrow" | "rect" | "ellipse" | "tape";
/** Aussehen einer Form; Strichstärke als Stufe, damit es ruhig bleibt */
export type ShapeLook = { color: string; fill?: string; weight: 1 | 2 | 3; dashed?: boolean };
/** Ein Strich mit Stift oder Maus: Farbe, Breite in cqw, Punkte flach [x, y, Druck, …], x/y in 0..1000 der Box, Druck 0..100 */
export type InkStroke = { c: string; s: number; p: number[]; /** Druck kommt vom Stift (sonst aus dem Tempo) */ pen?: true };
export type FreeEl =
  | { t: "photo"; no: number; box: Box; crop?: Crop; caption: "auto" | "off" }
  | { t: "text"; text: string; role: TextRole; box: Box; light?: boolean; look?: TextLook }
  | { t: "shape"; kind: ShapeKind; box: Box; look: ShapeLook; from?: Corner }
  | { t: "ink"; box: Box; strokes: InkStroke[] };
/** dasselbe mit Fotoschlüssel statt Nummer, so steht es im gespeicherten Buch */
export type FreeItem =
  | { t: "photo"; id: string; key: string; box: Box; crop?: Crop; caption: "auto" | "off"; pairId?: string; /** Stapelung auf der Doppelseite */ z?: number }
  | { t: "text"; id: string; text: string; role: TextRole; box: Box; /** helle Schrift, für Text auf dunklen Fotos */ light?: boolean; look?: TextLook; z?: number; /** Text über den Bund: beide Hälften gleich */ pairId?: string }
  | { t: "shape"; id: string; kind: ShapeKind; box: Box; look: ShapeLook; from?: Corner; z?: number; pairId?: string }
  | { t: "ink"; id: string; box: Box; strokes: InkStroke[]; z?: number; pairId?: string };

/** Form oder Zeichnung ohne Verwaltungsfelder (id, z, pairId) */
export const toEl = (it: Extract<FreeItem, { t: "shape" | "ink" }>): FreeEl =>
  it.t === "shape" ? { t: "shape", kind: it.kind, box: it.box, look: it.look, from: it.from } : { t: "ink", box: it.box, strokes: it.strokes };

/** Tafelnummern auf einer Seite; die leere Seite zählt nicht */
export const pageNos = (p: Page): number[] =>
  p.kind === "free" ? [...new Set(p.items.flatMap((i) => (i.t === "photo" ? [i.no] : [])))] : "no" in p && p.kind !== "blank" ? [p.no] : [];

export type Spread = { left: Page; right: Page; plates: number[] };

export type BookData = {
  id: string;
  /** Name auf Einband und Titelseite */
  author?: string;
  /** Titel auf Einband und Titelseite */
  title: string;
  /** Zeile unter dem Titel */
  subtitle: string;
  /** Orte, klein auf der Titelseite */
  places?: string;
  colophon: string[];
  /** Seitenhöhe durch Seitenbreite, wie die Fotos: 2:3 oder 3:4 */
  aspect: number;
  /** Breite im Verhältnis zum größten Buch */
  scale: number;
  /** Unterer Rand des Satzspiegels in cqw */
  bottom: number;
  cloth: { base: string; deep: string; ink: string };
  /** Tafel auf dem Einband */
  coverNo: number;
  /** Licht über dem Tisch beim Lesen */
  light: "sun" | "mist";
  plates: Plate[];
  spreads: Spread[];
  /** Einzelseiten für schmale Bildschirme */
  singlePages: Page[];
};

// Bausteine für die Folge: Seiten mit Fotoschlüssel, die Nummern ergeben sich danach
export type Spec =
  | { kind: "cover" | "endpaper" | "title" | "index" | "colophon" | "verso" }
  | { kind: "text"; heading?: string; body: string; style: TextStyle }
  | { kind: "full" | "plate" | "landscape" | "blank" | "tall" | "across"; key: string }
  | { kind: "small"; key: string; cols: 2 | 3; row: "top" | "bottom"; align: "outer" | "inner" }
  | { kind: "free"; items: FreeItem[] };

/** Lesereihenfolge auf einer freien Seite: oben nach unten, dann links nach rechts (2 % Toleranz) */
export const readingOrder = <T extends { box: Box }>(items: T[]) =>
  [...items].sort((a, b) => (Math.abs(a.box.y - b.box.y) > 2 ? a.box.y - b.box.y : a.box.x - b.box.x));

export const full = (key: string): Spec => ({ kind: "full", key });
export const framed = (key: string): Spec => ({ kind: "plate", key });
export const landscape = (key: string): Spec => ({ kind: "landscape", key });
export const blank = (key: string): Spec => ({ kind: "blank", key });
export const tall = (key: string): Spec => ({ kind: "tall", key });
export const small = (key: string, cols: 2 | 3, row: "top" | "bottom", align: "outer" | "inner"): Spec => ({
  kind: "small",
  key,
  cols,
  row,
  align,
});
export const across = (key: string): Spec => ({ kind: "across", key });
export const ENDPAPER: Spec = { kind: "endpaper" };
export const VERSO: Spec = { kind: "verso" };
export const textPage = (body: string, heading?: string, style: TextStyle = "text"): Spec => ({ kind: "text", body, heading, style });
export const TITLE: Spec = { kind: "title" };
export const INDEX: Spec = { kind: "index" };
export const COLOPHON: Spec = { kind: "colophon" };

export type BookSpec = Omit<BookData, "plates" | "spreads" | "singlePages" | "coverNo"> & {
  photos: Record<string, Photo>;
  coverKey: string;
  /** Doppelseiten nach dem Einband; `across` steht allein und belegt beide Seiten */
  sequence: (readonly [Spec, Spec] | readonly [Spec])[];
};

export function build(spec: BookSpec): BookData {
  const { photos, sequence, coverKey, ...meta } = spec;
  const order: string[] = [];
  const noOf = (key: string) => {
    if (!photos[key]) throw new Error(`Foto fehlt: ${key}`);
    // die leere Seite zählt nicht als Auftritt, sie trägt nur die Unterschrift der Gegenseite
    let i = order.indexOf(key);
    if (i < 0) i = order.push(key) - 1;
    return i + 1;
  };
  const page = (s: Spec, half?: "left" | "right"): Page => {
    switch (s.kind) {
      case "cover":
      case "endpaper":
      case "title":
      case "index":
      case "colophon":
      case "verso":
        return { kind: s.kind };
      case "text":
        return { kind: "text", heading: s.heading, body: s.body, style: s.style };
      case "small":
        return { kind: "small", no: noOf(s.key), cols: s.cols, row: s.row, align: s.align };
      case "free": {
        // Nummern in Lesereihenfolge, damit sie sich auf einer Mehrbildseite von oben links lesen
        const nos = new Map<string, number>();
        for (const it of readingOrder(s.items)) if (it.t === "photo" && !nos.has(it.key)) nos.set(it.key, noOf(it.key));
        return {
          kind: "free",
          items: s.items.map((it): FreeEl =>
            it.t === "photo"
              ? { t: "photo", no: nos.get(it.key)!, box: it.box, crop: it.crop, caption: it.caption }
              : it.t === "text"
                ? { t: "text", text: it.text, role: it.role, box: it.box, light: it.light, look: it.look }
                : toEl(it),
          ),
        };
      }
      case "across":
        return { kind: "across", no: noOf(s.key), half: half ?? "left" };
      default:
        return { kind: s.kind, no: noOf(s.key) } as Page;
    }
  };
  const platesOf = (...ps: Page[]) => [...new Set(ps.flatMap(pageNos))];

  // Unterschriften leerer Seiten zeigen auf die Gegenseite: erst die Bildseiten nummerieren
  const spreads: Spread[] = sequence.map((pair) => {
    if (pair.length === 1) {
      const left = page(pair[0], "left");
      const right = page(pair[0], "right");
      return { left, right, plates: platesOf(left, right) };
    }
    const [l, r] = pair;
    const right = l.kind === "blank" ? page(r) : undefined;
    // die leere Seite trägt nur die Unterschrift einer randlosen Gegenseite; hat die Gegenseite eine
    // eigene (Tafel, Querformat, kleine Tafel), stünde dieselbe Nummer doppelt: dann reines Papier
    const left = l.kind === "blank" && r.kind !== "full" ? page(VERSO) : page(l);
    const rr = right ?? page(r);
    return { left, right: rr, plates: platesOf(left, rr) };
  });

  const plates: Plate[] = order.map((key, i) => ({ ...photos[key], key, no: i + 1 }));
  const unused = Object.keys(photos).filter((k) => !order.includes(k));
  if (unused.length) throw new Error(`Fotos ohne Seite: ${unused.join(", ")}`);

  // Telefon: eine Seite nach der anderen; leere Seiten und Vorsatz fallen weg, der Bund-Übergang wird quer
  const singlePages: Page[] = [{ kind: "cover" }];
  for (const s of spreads) {
    for (const p of [s.left, s.right]) {
      if (p.kind === "endpaper" || p.kind === "blank" || p.kind === "verso") continue;
      if (p.kind === "across") {
        if (p.half === "left") singlePages.push({ kind: "landscape", no: p.no });
        continue;
      }
      singlePages.push(p);
    }
  }

  return { ...meta, coverNo: noOf(coverKey), plates, spreads, singlePages };
}

const fuerteventura = build({
  id: "fuerteventura",
  title: "Fuerteventura",
  subtitle: de("Sechsundzwanzig Fotografien"),
  colophon: [
    "Fuerteventura",
    "Sechsundzwanzig Fotografien, aufgenommen auf Fuerteventura mit einer Fuji.",
    "Fotografie und Gestaltung: Michel Leotta",
    "Gesetzt in Bricolage Grotesque.",
    "© 2026 Michel Leotta",
  ],
  aspect: 1.5,
  scale: 1,
  bottom: 18,
  cloth: { base: "#e8a72c", deep: "#b97a12", ink: "#3a2706" },
  light: "sun",
  coverKey: "rettungsturm",
  photos: {
    drachenbaum: {
      title: "Drachenbaum vor gelber Wand",
      note: "Im Fenster: der Fotograf.",
      alt: "Ein verzweigter Drachenbaum vor einer leuchtend gelben Hauswand. Im Fenster spiegelt sich der Fotograf mit Kamera.",
      src: drachenbaum,
      thumb: drachenbaumThumb,
    },
    rettungsturm: {
      title: "Rettungsturm",
      note: "Playa El Bajo Negro",
      alt: "Ein gelber Rettungsturm auf Stelzen im Sand, dahinter das türkise Meer.",
      src: rettungsturm,
      thumb: rettungsturmThumb,
    },
    strand: {
      title: "Am Wasser",
      alt: "Michel läuft lachend in weißem T-Shirt am Strand entlang, hinter ihm Brandung und Steilküste im Abendlicht.",
      src: strand,
      thumb: strandThumb,
    },
    schild: {
      title: "Schild über der Bucht",
      alt: "Ein dreieckiges Warnschild, über und über mit Aufklebern beklebt, auf einer Klippe über dem Meer.",
      src: schild,
      thumb: schildThumb,
    },
    palme: {
      title: "Palme",
      alt: "Eine einzelne Dattelpalme vor blauem Himmel, im Hintergrund kahle Berge.",
      src: palme,
      thumb: palmeThumb,
    },
    kaktusDach: {
      title: "Kaktus und Dachkante",
      alt: "Grüne Säulenkakteen vor einer orange gestrichenen Dachkante und blauem Himmel.",
      src: kaktusDach,
      thumb: kaktusDachThumb,
    },
    felsbogen: {
      title: "Im Felsbogen",
      alt: "Michel steht in einem großen, vom Wind ausgehöhlten Sandsteinbogen, dahinter ein grüner Hang.",
      src: felsbogen,
      thumb: felsbogenThumb,
      // die Figur steht links im Bogen, der Bund liegt im Himmel
      focus: [0.3, 0.5],
    },
    sonnenschirm: {
      title: "Sonnenschirm aus Stroh",
      alt: "Ein Sonnenschirm aus Stroh von unten gesehen, am türkisen Mast, vor hellem Himmel.",
      src: sonnenschirm,
      thumb: sonnenschirmThumb,
    },
    wolfsmilch: {
      title: "Wolfsmilch",
      alt: "Hohe, kandelaberartige Wolfsmilch mit gelben Blüten an den Spitzen vor blauem Himmel.",
      src: wolfsmilch,
      thumb: wolfsmilchThumb,
    },
    bougainvillea: {
      title: "Bougainvillea im Oleander",
      alt: "Ein pinker Bougainvillea-Zweig zwischen schmalen grünen Blättern und gelben Blüten vor blauem Himmel.",
      src: bougainvillea,
      thumb: bougainvilleaThumb,
    },
    mittagsblume: {
      title: "Mittagsblume",
      alt: "Eine lachsfarbene Mittagsblume mit gelber Mitte zwischen fleischigen, graugrünen Blättern.",
      src: mittagsblume,
      thumb: mittagsblumeThumb,
    },
    seetraube: {
      title: "Seetraube",
      alt: "Runde grüne Blätter einer Seetraube mit rostroten Rändern und Flecken.",
      src: seetraube,
      thumb: seetraubeThumb,
    },
    trompetenblume: {
      title: "Trompetenblume",
      alt: "Eine einzelne orangerote Trompetenblüte mit langen Staubfäden vor unscharfem Grün und gelber Wand.",
      src: trompetenblume,
      thumb: trompetenblumeThumb,
    },
    weihnachtsstern: {
      title: "Weihnachtsstern im Garten",
      alt: "Ein großer roter Weihnachtsstern-Strauch in einem Garten, dahinter grüne Hügel im Dunst.",
      src: weihnachtsstern,
      thumb: weihnachtssternThumb,
    },
    gartenAuto: {
      title: "Garten mit Auto",
      alt: "Ein altes graues Auto steht in einem wuchernden Garten mit Orangenbaum, Bananenstauden und Palmen, dahinter grüne Hügel. Das Kennzeichen ist unkenntlich gemacht.",
      src: gartenAuto,
      thumb: gartenAutoThumb,
    },
    gitterGarten: {
      title: "Garten hinter dem Gitter",
      alt: "Durch ein rostiges Gitter gesehen: große Bananenblätter, rote Bougainvillea und Palmen vor hellen Häusern.",
      src: gitterGarten,
      thumb: gitterGartenThumb,
    },
    blumentopf: {
      title: "Blumentopf an der Mauer",
      alt: "Ein blauer Topf mit rosa-weiß gestreiften Blüten hängt an einer sandfarbenen Mauer aus Bruchstein.",
      src: blumentopf,
      thumb: blumentopfThumb,
    },
    stuhl: {
      title: "Stuhl im Nebenraum",
      alt: "Durch eine Öffnung in der Wand gesehen: ein gepolsterter Stuhl mit Kreismuster in einem hellen Raum.",
      src: stuhl,
      thumb: stuhlThumb,
    },
    stuehleGelb: {
      title: "Stühle vor gelber Wand",
      alt: "Durch einen Fensterrahmen gesehen: ein verschnörkelter weißer Gartenstuhl und ein Plastikstuhl vor einer gelben Wand.",
      src: stuehleGelb,
      thumb: stuehleGelbThumb,
    },
    raupe: {
      title: "Raupe mit Kaktus",
      alt: "Zwischen weißen Zaunlatten hindurch: eine lachende Tonraupe mit einem runden Kaktus auf dem Rücken, auf einer Treppe aus Terrakottafliesen.",
      src: raupe,
      thumb: raupeThumb,
    },
    nr2: {
      title: "Nº 2",
      alt: "Eine grüne, verwitterte Doppeltür mit Kassetten unter einem Hausnummernschild „Nº 2“.",
      src: nr2,
      thumb: nr2Thumb,
    },
    markisen: {
      title: "Markisen",
      alt: "Eine weiße Hauswand mit blau-weiß gestreiften Markisen und einem Blumenkasten vor dem Fenster.",
      src: markisen,
      thumb: markisenThumb,
    },
    spiegel: {
      title: "Spiegel mit Hand",
      alt: "Ein Spiegel zwischen bunten Mauern, Kakteen und Gipsfiguren, davor eine schwarze Hand-Skulptur; im Spiegel Wüste und ein Berg.",
      src: spiegel,
      thumb: spiegelThumb,
    },
    reifen: {
      title: "Platter Reifen",
      alt: "Der platte Hinterreifen eines staubigen, sandfarbenen Geländewagens auf sandigem Boden.",
      src: reifen,
      thumb: reifenThumb,
    },
    padel: {
      title: "Padelplätze",
      alt: "Grüne Padelplätze hinter Gitterzäunen mit langen Schatten, darüber Wolken und Häuser am Hang.",
      src: padel,
      thumb: padelThumb,
    },
    hunde: {
      title: "Warten vor dem Laden",
      alt: "Vier kleine Hunde an der Leine warten neben einem Kinderwagen vor einer gelben Ladenfront.",
      src: hunde,
      thumb: hundeThumb,
    },
  },
  // Meer und Blau, dann Rot und Grün im Landesinneren, dann Wände, Türen und Gelb
  sequence: [
    [ENDPAPER, TITLE],
    [full("drachenbaum"), landscape("strand")],
    [full("schild"), full("palme")],
    [small("sonnenschirm", 3, "top", "outer"), full("rettungsturm")],
    [across("felsbogen")],
    [full("kaktusDach"), full("markisen")],
    [landscape("mittagsblume"), full("seetraube")],
    [full("weihnachtsstern"), full("gartenAuto")],
    [framed("wolfsmilch"), framed("bougainvillea")],
    [small("trompetenblume", 3, "bottom", "inner"), full("blumentopf")],
    [full("raupe"), full("gitterGarten")],
    [framed("stuhl"), framed("spiegel")],
    [full("nr2"), full("padel")],
    [small("reifen", 3, "bottom", "outer"), full("hunde")],
    [blank("stuehleGelb"), full("stuehleGelb")],
    [INDEX, COLOPHON],
  ],
});

const japan = build({
  id: "japan",
  title: "Japan",
  subtitle: de("Vierzehn Fotografien"),
  places: "Kyoto Tokio Osaka Miyajima",
  colophon: [
    "Japan",
    "Vierzehn Fotografien, aufgenommen in Japan.",
    "Fotografie und Gestaltung: Michel Leotta",
    "Gesetzt in Bricolage Grotesque.",
    "© 2026 Michel Leotta",
  ],
  aspect: 4 / 3,
  scale: 0.85,
  bottom: 15,
  // nebelgraues Leinen; Schrift darauf nur in Tinte (10.2:1)
  cloth: { base: "#c9c8c3", deep: "#a3a29c", ink: "#1b1c1a" },
  light: "mist",
  coverKey: "torii",
  photos: {
    bruecke: {
      title: "Rote Brücke im Nebel",
      alt: "Eine rote Holzbrücke über einer bewaldeten Schlucht, kahle Bäume, Nebel, rechts ein Weg.",
      src: bruecke,
      thumb: brueckeThumb,
    },
    bambus: {
      title: "Bambusweg",
      note: "Arashiyama",
      alt: "Ein Weg zwischen hohen Bambusstämmen, am Ende stehen Menschen.",
      src: bambus,
      thumb: bambusThumb,
    },
    sakeSaeule: {
      title: "Fässer an der roten Säule",
      alt: "Gestapelte, beschriftete Sakefässer, rechts eine breite zinnoberrote Säule.",
      src: sakeSaeule,
      thumb: sakeSaeuleThumb,
    },
    sakeSaeulen: {
      title: "Sakefässer zwischen Säulen",
      alt: "Gestapelte Sakefässer unter einem Dach mit roten Säulen.",
      src: sakeSaeulen,
      thumb: sakeSaeulenThumb,
    },
    jizo: {
      title: "Jizō mit roten Mützen",
      alt: "Steinfiguren mit roten Strickmützen in Reihen an einem Kiesweg.",
      src: jizo,
      thumb: jizoThumb,
    },
    reiher: {
      title: "Reiher im flachen Wasser",
      alt: "Ein weißer Reiher steht im klaren, flachen Wasser, unter ihm sein Spiegelbild.",
      src: reiher,
      thumb: reiherThumb,
    },
    fisch: {
      title: "Fisch an der Hauswand",
      note: "Tokio",
      alt: "Ein großer gemalter Fisch an der Fassade eines Hochhauses vor blauem Himmel.",
      src: fisch,
      thumb: fischThumb,
    },
    stadt: {
      title: "Blick über die Stadt",
      alt: "Von erhöhter Stelle über Straßen, Bahngleise und Häuser, tiefe Sonne im Dunst.",
      src: stadt,
      thumb: stadtThumb,
    },
    hirsche: {
      title: "Zwei Hirsche",
      alt: "Zwei Hirsche stehen dicht beieinander unter Bäumen auf einem Waldboden.",
      src: hirsche,
      thumb: hirscheThumb,
    },
    fenster: {
      title: "Am Verkaufsfenster",
      alt: "Eine Person in weißem Kittel und Kopftuch steht an einem Verkaufsfenster in einer bunt gemusterten Wand, davor eine Absperrung mit rotem Band.",
      src: fenster,
      thumb: fensterThumb,
    },
    ramen: {
      title: "Ramen",
      alt: "Eine Schale Ramen mit heller Brühe, Fleisch, halbierten Eiern und Kräutern auf einem Holztresen, dahinter Wassergläser.",
      src: ramen,
      thumb: ramenThumb,
    },
    leuchtreklame: {
      title: "Leuchtreklame",
      note: "Osaka",
      alt: "Nachts leuchtende Reklametafeln an den Fassaden, darunter eine große Tafel mit einem laufenden Mann, davor eine Menschenmenge.",
      src: leuchtreklame,
      thumb: leuchtreklameThumb,
    },
    neujahrsfahnen: {
      title: "Gasse mit Neujahrsfahnen",
      alt: "Eine leere, gepflasterte Einkaufsstraße, an den Laternen hängen weiße Fahnen mit roten Kreisen, am Ende Hochhäuser im Abendlicht.",
      src: neujahrsfahnen,
      thumb: neujahrsfahnenThumb,
    },
    torii: {
      title: "Torii im Wasser",
      note: "Miyajima",
      alt: "Ein orangefarbenes Torii steht im Meer, dahinter Berge und Wolken.",
      src: torii,
      thumb: toriiThumb,
    },
  },
  sequence: [
    [ENDPAPER, TITLE],
    [full("bruecke"), tall("bambus")],
    [full("sakeSaeule"), full("sakeSaeulen")],
    [full("jizo"), small("reiher", 2, "bottom", "outer")],
    [full("hirsche"), framed("fenster")],
    [small("ramen", 3, "top", "outer"), full("leuchtreklame")],
    [full("neujahrsfahnen"), framed("fisch")],
    [small("stadt", 3, "bottom", "outer"), full("torii")],
    [INDEX, COLOPHON],
  ],
});

/** Alle Bücher auf dem Tisch, in der Reihenfolge, in der sie liegen */
export const books: BookData[] = [fuerteventura, japan];
export const bookById = (id: string) => books.find((b) => b.id === id);
export const plateOf = (book: BookData, no: number) => book.plates[no - 1];

/** Name einer Tafel für Screenreader: „Tafel 3: Palme“, ohne Titel nur „Tafel 3“ (kein leerer Rest nach dem Doppelpunkt) */
export const plateName = (no: number, title?: string) => (title?.trim() ? t("Tafel {no}: {title}", { no, title: title.trim() }) : t("Tafel {no}", { no }));

/** Satzspiegel in cqw: Bund, oben, außen, unten; Breite 82 */
export function typeArea(book: Pick<BookData, "aspect" | "bottom">, side: "left" | "right") {
  const inner = 6;
  const outer = 12;
  const top = 9;
  const height = book.aspect * 100 - top - book.bottom;
  const x = side === "right" ? inner : outer;
  return { x, y: top, w: 82, h: height, inner, outer };
}

/** Breite einer Rasterspalte (6 Spalten, 2cqw Fuge) */
export const colWidth = (n: number) => n * ((82 - 5 * 2) / 6) + (n - 1) * 2;
