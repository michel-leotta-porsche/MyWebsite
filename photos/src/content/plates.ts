import type { StaticImageData } from "next/image";

import drachenbaum from "../../public/photos/08-drachenbaum.jpg";
import rettungsturm from "../../public/photos/09-rettungsturm.jpg";
import strand from "../../public/photos/03-strand.jpg";
import schild from "../../public/photos/01-schild-am-meer.jpg";
import palme from "../../public/photos/02-palme.jpg";
import kaktusDach from "../../public/photos/05-kaktus-dach.jpg";
import felsbogen from "../../public/photos/11-felsbogen.jpg";
import wolfsmilch from "../../public/photos/07-wolfsmilch.jpg";
import bougainvillea from "../../public/photos/04-bougainvillea.jpg";
import mittagsblume from "../../public/photos/06-mittagsblume.jpg";
import seetraube from "../../public/photos/14-seetraube.jpg";
import trompetenblume from "../../public/photos/13-trompetenblume.jpg";
import weihnachtsstern from "../../public/photos/12-weihnachtsstern.jpg";
import stuhl from "../../public/photos/10-stuhl.jpg";
import hunde from "../../public/photos/15-hunde.jpg";

// Kleine Abzüge für den Einstieg (360px), aus den Originalen erzeugt
import drachenbaumThumb from "./thumbs/08-drachenbaum.jpg";
import rettungsturmThumb from "./thumbs/09-rettungsturm.jpg";
import strandThumb from "./thumbs/03-strand.jpg";
import schildThumb from "./thumbs/01-schild-am-meer.jpg";
import palmeThumb from "./thumbs/02-palme.jpg";
import kaktusDachThumb from "./thumbs/05-kaktus-dach.jpg";
import felsbogenThumb from "./thumbs/11-felsbogen.jpg";
import wolfsmilchThumb from "./thumbs/07-wolfsmilch.jpg";
import bougainvilleaThumb from "./thumbs/04-bougainvillea.jpg";
import mittagsblumeThumb from "./thumbs/06-mittagsblume.jpg";
import seetraubeThumb from "./thumbs/14-seetraube.jpg";
import trompetenblumeThumb from "./thumbs/13-trompetenblume.jpg";
import weihnachtssternThumb from "./thumbs/12-weihnachtsstern.jpg";
import stuhlThumb from "./thumbs/10-stuhl.jpg";
import hundeThumb from "./thumbs/15-hunde.jpg";

export type Plate = {
  /** Tafelnummer in der Buchfolge, 1 bis 15 */
  no: number;
  title: string;
  /** Kurzer Zusatz unter dem Titel, nur Fakten */
  note?: string;
  alt: string;
  src: StaticImageData;
  thumb: StaticImageData;
  /** Tischfarbe zu dieser Tafel: Farbton aus dem Bild, so dunkel, dass Text auf dem Tisch ≥ 7:1 hat */
  tone: string;
};

// Reihenfolge wie im Buch: Ankunft, Strand, Pflanzen, Ort, Hunde
export const plates: Plate[] = [
  {
    no: 1,
    tone: "#624700",
    title: "Drachenbaum vor gelber Wand",
    note: "Im Fenster: der Fotograf.",
    alt: "Ein verzweigter Drachenbaum vor einer leuchtend gelben Hauswand. Im Fenster spiegelt sich der Fotograf mit Kamera.",
    src: drachenbaum,
    thumb: drachenbaumThumb,
  },
  {
    no: 2,
    tone: "#00535d",
    title: "Rettungsturm",
    note: "Playa El Bajo Negro",
    alt: "Ein gelber Rettungsturm auf Stelzen im Sand, dahinter das türkise Meer.",
    src: rettungsturm,
    thumb: rettungsturmThumb,
  },
  {
    no: 3,
    tone: "#6f400c",
    title: "Am Wasser",
    alt: "Michel läuft lachend in weißem T-Shirt am Strand entlang, hinter ihm Brandung und Steilküste im Abendlicht.",
    src: strand,
    thumb: strandThumb,
  },
  {
    no: 4,
    tone: "#00554d",
    title: "Schild über der Bucht",
    alt: "Ein dreieckiges Warnschild, über und über mit Aufklebern beklebt, auf einer Klippe über dem Meer.",
    src: schild,
    thumb: schildThumb,
  },
  {
    no: 5,
    tone: "#005269",
    title: "Palme",
    alt: "Eine einzelne Dattelpalme vor blauem Himmel, im Hintergrund kahle Berge.",
    src: palme,
    thumb: palmeThumb,
  },
  {
    no: 6,
    tone: "#753a22",
    title: "Kaktus und Dachkante",
    alt: "Grüne Säulenkakteen vor einer orange gestrichenen Dachkante und blauem Himmel.",
    src: kaktusDach,
    thumb: kaktusDachThumb,
  },
  {
    no: 7,
    tone: "#723e14",
    title: "Im Felsbogen",
    alt: "Michel steht in einem großen, vom Wind ausgehöhlten Sandsteinbogen, dahinter ein grüner Hang.",
    src: felsbogen,
    thumb: felsbogenThumb,
  },
  {
    no: 8,
    tone: "#2d5524",
    title: "Wolfsmilch",
    alt: "Hohe, kandelaberartige Wolfsmilch mit gelben Blüten an den Spitzen vor blauem Himmel.",
    src: wolfsmilch,
    thumb: wolfsmilchThumb,
  },
  {
    no: 9,
    tone: "#72364f",
    title: "Bougainvillea im Oleander",
    alt: "Ein pinker Bougainvillea-Zweig zwischen schmalen grünen Blättern und gelben Blüten vor blauem Himmel.",
    src: bougainvillea,
    thumb: bougainvilleaThumb,
  },
  {
    no: 10,
    tone: "#773733",
    title: "Mittagsblume",
    alt: "Eine lachsfarbene Mittagsblume mit gelber Mitte zwischen fleischigen, graugrünen Blättern.",
    src: mittagsblume,
    thumb: mittagsblumeThumb,
  },
  {
    no: 11,
    tone: "#3f5213",
    title: "Seetraube",
    alt: "Runde grüne Blätter einer Seetraube mit rostroten Rändern und Flecken.",
    src: seetraube,
    thumb: seetraubeThumb,
  },
  {
    no: 12,
    tone: "#1d562d",
    title: "Trompetenblume",
    alt: "Eine einzelne orangerote Trompetenblüte mit langen Staubfäden vor unscharfem Grün und gelber Wand.",
    src: trompetenblume,
    thumb: trompetenblumeThumb,
  },
  {
    no: 13,
    tone: "#773736",
    title: "Weihnachtsstern im Garten",
    alt: "Ein großer roter Weihnachtsstern-Strauch in einem Garten, dahinter grüne Hügel im Dunst.",
    src: weihnachtsstern,
    thumb: weihnachtssternThumb,
  },
  {
    no: 14,
    tone: "#703f0e",
    title: "Stuhl im Nebenraum",
    alt: "Durch eine Öffnung in der Wand gesehen: ein gepolsterter Stuhl mit Kreismuster in einem hellen Raum.",
    src: stuhl,
    thumb: stuhlThumb,
  },
  {
    no: 15,
    tone: "#5f4900",
    title: "Warten vor dem Laden",
    alt: "Vier kleine Hunde an der Leine warten neben einem Kinderwagen vor einer gelben Ladenfront.",
    src: hunde,
    thumb: hundeThumb,
  },
];

export const plate = (no: number) => plates[no - 1];

/** Tischfarbe ohne Tafel (Einband, Titel, Kolophon) */
export const baseTone = "#1d4f55";

/** Eine Buchseite. `double` zeigt eine Hälfte eines Bildes über den Bund. */
export type Page =
  | { kind: "cover" }
  | { kind: "endpaper" }
  | { kind: "title" }
  | { kind: "caption"; no: number }
  | { kind: "plate"; no: number; withCaption?: boolean }
  | { kind: "double"; no: number; half: "left" | "right" }
  | { kind: "colophon" }
  | { kind: "verso" };

export type Spread = { left: Page; right: Page; plates: number[] };

const single = (no: number): Spread => ({
  left: { kind: "caption", no },
  right: { kind: "plate", no },
  plates: [no],
});
const pair = (a: number, b: number): Spread => ({
  left: { kind: "plate", no: a, withCaption: true },
  right: { kind: "plate", no: b, withCaption: true },
  plates: [a, b],
});
const double = (no: number): Spread => ({
  left: { kind: "double", no, half: "left" },
  right: { kind: "double", no, half: "right" },
  plates: [no],
});

// Doppelseiten nach dem Aufschlagen des Einbands
export const spreads: Spread[] = [
  { left: { kind: "endpaper" }, right: { kind: "title" }, plates: [] },
  single(1),
  single(2),
  double(3),
  pair(4, 5),
  single(6),
  double(7),
  pair(8, 9),
  double(10),
  pair(11, 12),
  single(13),
  single(14),
  single(15),
  { left: { kind: "colophon" }, right: { kind: "endpaper" }, plates: [] },
];

/** Einzelseiten für schmale Bildschirme */
export const singlePages: Page[] = [
  { kind: "cover" },
  { kind: "title" },
  ...plates.map((p): Page => ({ kind: "plate", no: p.no, withCaption: true })),
  { kind: "colophon" },
];
