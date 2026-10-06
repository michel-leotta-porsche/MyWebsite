import type { StaticImageData } from "next/image";

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

// Kleine Abzüge für den Einstieg (360px), aus den Originalen erzeugt
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

export type Plate = {
  /** Tafelnummer in der Buchfolge, ergibt sich aus der Reihenfolge unten */
  no: number;
  title: string;
  /** Kurzer Zusatz unter dem Titel, nur Fakten */
  note?: string;
  alt: string;
  src: StaticImageData;
  thumb: StaticImageData;
};

type Entry = Omit<Plate, "no">;

// Reihenfolge wie im Buch: Ankunft, Strand, Pflanzen, Gärten, Ort, Hunde
const entries: Entry[] = [
  {
    title: "Drachenbaum vor gelber Wand",
    note: "Im Fenster: der Fotograf.",
    alt: "Ein verzweigter Drachenbaum vor einer leuchtend gelben Hauswand. Im Fenster spiegelt sich der Fotograf mit Kamera.",
    src: drachenbaum,
    thumb: drachenbaumThumb,
  },
  {
    title: "Rettungsturm",
    note: "Playa El Bajo Negro",
    alt: "Ein gelber Rettungsturm auf Stelzen im Sand, dahinter das türkise Meer.",
    src: rettungsturm,
    thumb: rettungsturmThumb,
  },
  {
    title: "Am Wasser",
    alt: "Michel läuft lachend in weißem T-Shirt am Strand entlang, hinter ihm Brandung und Steilküste im Abendlicht.",
    src: strand,
    thumb: strandThumb,
  },
  {
    title: "Schild über der Bucht",
    alt: "Ein dreieckiges Warnschild, über und über mit Aufklebern beklebt, auf einer Klippe über dem Meer.",
    src: schild,
    thumb: schildThumb,
  },
  {
    title: "Palme",
    alt: "Eine einzelne Dattelpalme vor blauem Himmel, im Hintergrund kahle Berge.",
    src: palme,
    thumb: palmeThumb,
  },
  {
    title: "Kaktus und Dachkante",
    alt: "Grüne Säulenkakteen vor einer orange gestrichenen Dachkante und blauem Himmel.",
    src: kaktusDach,
    thumb: kaktusDachThumb,
  },
  {
    title: "Im Felsbogen",
    alt: "Michel steht in einem großen, vom Wind ausgehöhlten Sandsteinbogen, dahinter ein grüner Hang.",
    src: felsbogen,
    thumb: felsbogenThumb,
  },
  {
    title: "Sonnenschirm aus Stroh",
    alt: "Ein Sonnenschirm aus Stroh von unten gesehen, am türkisen Mast, vor hellem Himmel.",
    src: sonnenschirm,
    thumb: sonnenschirmThumb,
  },
  {
    title: "Wolfsmilch",
    alt: "Hohe, kandelaberartige Wolfsmilch mit gelben Blüten an den Spitzen vor blauem Himmel.",
    src: wolfsmilch,
    thumb: wolfsmilchThumb,
  },
  {
    title: "Bougainvillea im Oleander",
    alt: "Ein pinker Bougainvillea-Zweig zwischen schmalen grünen Blättern und gelben Blüten vor blauem Himmel.",
    src: bougainvillea,
    thumb: bougainvilleaThumb,
  },
  {
    title: "Mittagsblume",
    alt: "Eine lachsfarbene Mittagsblume mit gelber Mitte zwischen fleischigen, graugrünen Blättern.",
    src: mittagsblume,
    thumb: mittagsblumeThumb,
  },
  {
    title: "Seetraube",
    alt: "Runde grüne Blätter einer Seetraube mit rostroten Rändern und Flecken.",
    src: seetraube,
    thumb: seetraubeThumb,
  },
  {
    title: "Trompetenblume",
    alt: "Eine einzelne orangerote Trompetenblüte mit langen Staubfäden vor unscharfem Grün und gelber Wand.",
    src: trompetenblume,
    thumb: trompetenblumeThumb,
  },
  {
    title: "Weihnachtsstern im Garten",
    alt: "Ein großer roter Weihnachtsstern-Strauch in einem Garten, dahinter grüne Hügel im Dunst.",
    src: weihnachtsstern,
    thumb: weihnachtssternThumb,
  },
  {
    title: "Garten mit Auto",
    alt: "Ein altes graues Auto steht in einem wuchernden Garten mit Orangenbaum, Bananenstauden und Palmen, dahinter grüne Hügel. Das Kennzeichen ist unkenntlich gemacht.",
    src: gartenAuto,
    thumb: gartenAutoThumb,
  },
  {
    title: "Garten hinter dem Gitter",
    alt: "Durch ein rostiges Gitter gesehen: große Bananenblätter, rote Bougainvillea und Palmen vor hellen Häusern.",
    src: gitterGarten,
    thumb: gitterGartenThumb,
  },
  {
    title: "Blumentopf an der Mauer",
    alt: "Ein blauer Topf mit rosa-weiß gestreiften Blüten hängt an einer sandfarbenen Mauer aus Bruchstein.",
    src: blumentopf,
    thumb: blumentopfThumb,
  },
  {
    title: "Stuhl im Nebenraum",
    alt: "Durch eine Öffnung in der Wand gesehen: ein gepolsterter Stuhl mit Kreismuster in einem hellen Raum.",
    src: stuhl,
    thumb: stuhlThumb,
  },
  {
    title: "Stühle vor gelber Wand",
    alt: "Durch einen Fensterrahmen gesehen: ein verschnörkelter weißer Gartenstuhl und ein Plastikstuhl vor einer gelben Wand.",
    src: stuehleGelb,
    thumb: stuehleGelbThumb,
  },
  {
    title: "Raupe mit Kaktus",
    alt: "Zwischen weißen Zaunlatten hindurch: eine lachende Tonraupe mit einem runden Kaktus auf dem Rücken, auf einer Treppe aus Terrakottafliesen.",
    src: raupe,
    thumb: raupeThumb,
  },
  {
    title: "Nº 2",
    alt: "Eine grüne, verwitterte Doppeltür mit Kassetten unter einem Hausnummernschild „Nº 2“.",
    src: nr2,
    thumb: nr2Thumb,
  },
  {
    title: "Markisen",
    alt: "Eine weiße Hauswand mit blau-weiß gestreiften Markisen und einem Blumenkasten vor dem Fenster.",
    src: markisen,
    thumb: markisenThumb,
  },
  {
    title: "Spiegel mit Hand",
    alt: "Ein Spiegel zwischen bunten Mauern, Kakteen und Gipsfiguren, davor eine schwarze Hand-Skulptur; im Spiegel Wüste und ein Berg.",
    src: spiegel,
    thumb: spiegelThumb,
  },
  {
    title: "Platter Reifen",
    alt: "Der platte Hinterreifen eines staubigen, sandfarbenen Geländewagens auf sandigem Boden.",
    src: reifen,
    thumb: reifenThumb,
  },
  {
    title: "Padelplätze",
    alt: "Grüne Padelplätze hinter Gitterzäunen mit langen Schatten, darüber Wolken und Häuser am Hang.",
    src: padel,
    thumb: padelThumb,
  },
  {
    title: "Warten vor dem Laden",
    alt: "Vier kleine Hunde an der Leine warten neben einem Kinderwagen vor einer gelben Ladenfront.",
    src: hunde,
    thumb: hundeThumb,
  },
];

export const plates: Plate[] = entries.map((e, i) => ({ ...e, no: i + 1 }));
export const plate = (no: number) => plates[no - 1];
const byTitle = (title: string) => {
  const p = plates.find((x) => x.title === title);
  if (!p) throw new Error(`Tafel fehlt: ${title}`);
  return p.no;
};

/** Anzahl als Wort für Titelei und Kolophon */
export const countWord = "Sechsundzwanzig";

/** Eine Buchseite. `double` zeigt eine Hälfte eines Bildes über den Bund, `bleed` läuft bis an die Papierkante. */
export type Page =
  | { kind: "cover" }
  | { kind: "endpaper" }
  | { kind: "title" }
  | { kind: "caption"; no: number }
  | { kind: "plate"; no: number; withCaption?: boolean; bleed?: boolean }
  | { kind: "double"; no: number; half: "left" | "right" }
  | { kind: "colophon" }
  | { kind: "verso" };

export type Spread = { left: Page; right: Page; plates: number[] };

const single = (title: string): Spread => {
  const no = byTitle(title);
  return { left: { kind: "caption", no }, right: { kind: "plate", no }, plates: [no] };
};
// randabfallend: das Bild läuft bis an die Papierkante, die Unterschrift steht gegenüber
const bleed = (title: string): Spread => {
  const no = byTitle(title);
  return { left: { kind: "caption", no }, right: { kind: "plate", no, bleed: true }, plates: [no] };
};
const pair = (a: string, b: string): Spread => {
  const [x, y] = [byTitle(a), byTitle(b)];
  return {
    left: { kind: "plate", no: x, withCaption: true },
    right: { kind: "plate", no: y, withCaption: true },
    plates: [x, y],
  };
};
const double = (title: string): Spread => {
  const no = byTitle(title);
  return { left: { kind: "double", no, half: "left" }, right: { kind: "double", no, half: "right" }, plates: [no] };
};

// Doppelseiten nach dem Aufschlagen des Einbands
export const spreads: Spread[] = [
  { left: { kind: "endpaper" }, right: { kind: "title" }, plates: [] },
  single("Drachenbaum vor gelber Wand"),
  single("Rettungsturm"),
  double("Am Wasser"),
  pair("Schild über der Bucht", "Palme"),
  single("Kaktus und Dachkante"),
  double("Im Felsbogen"),
  bleed("Sonnenschirm aus Stroh"),
  pair("Wolfsmilch", "Bougainvillea im Oleander"),
  double("Mittagsblume"),
  pair("Seetraube", "Trompetenblume"),
  single("Weihnachtsstern im Garten"),
  bleed("Garten mit Auto"),
  pair("Garten hinter dem Gitter", "Blumentopf an der Mauer"),
  single("Stuhl im Nebenraum"),
  pair("Stühle vor gelber Wand", "Raupe mit Kaktus"),
  bleed("Nº 2"),
  pair("Markisen", "Spiegel mit Hand"),
  single("Platter Reifen"),
  bleed("Padelplätze"),
  single("Warten vor dem Laden"),
  { left: { kind: "colophon" }, right: { kind: "endpaper" }, plates: [] },
];

// Randabfallende Tafeln laufen auch auf dem Telefon bis an die Kante
const bleeds = new Set(spreads.flatMap((s) => (s.right.kind === "plate" && s.right.bleed ? [s.right.no] : [])));

/** Einzelseiten für schmale Bildschirme */
export const singlePages: Page[] = [
  { kind: "cover" },
  { kind: "title" },
  ...plates.map((p): Page => ({ kind: "plate", no: p.no, withCaption: true, bleed: bleeds.has(p.no) })),
  { kind: "colophon" },
];
