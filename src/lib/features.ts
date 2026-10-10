import { de, type Lang } from "@/lib/i18n";
import { APP_FEATURES } from "@/lib/landing";

/** Seite „Was Calima kann“ (#267); auf Englisch derselbe Inhalt unter /features */
export const FEATURES_PATH = "/funktionen";

export type Feature = {
  id: string;
  title: string;
  /** höchstens zwei Sätze, gekürzt aus der Hilfe (Welle 1) */
  text: string;
  /** nur in der iPhone-App: dafür gibt es kein Bild aus dem Browser */
  app?: true;
  /** Seitenverhältnis des Bilds (Breite / Höhe), damit nichts springt */
  ratio?: number;
};

export type FeatureGroup = { id: string; title: string; lead: string; help: string; features: Feature[] };

// Bilder: im Testmodus aufgenommen (Telefon, 390 px breit), je Sprache unter public/funktionen/<lang>/<id>.jpg
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "buch",
    title: de("Buch machen"),
    lead: de("Ein paar Fotos auswählen, Calima setzt sie zu Doppelseiten. Den Rest machst du nur, wenn du willst."),
    help: "/hilfe/erstes-buch",
    features: [
      {
        id: "fotos",
        title: de("Fotos rein"),
        text: de("Fotos auswählen oder hineinziehen, Calima ordnet sie nach Aufnahmezeit zu Doppelseiten. JPEG, HEIC und DNG gehen, bis zu 60 Fotos pro Buch."),
        ratio: 585 / 1050,
      },
      {
        id: "layouts",
        title: de("Layouts"),
        text: de("„Anderes Layout“ zeigt eine andere Anordnung der Doppelseite. Fixierst du sie, lässt die Automatik sie in Ruhe."),
        ratio: 585 / 930,
      },
      {
        id: "gestalten",
        title: de("Frei gestalten"),
        text: de("„Gestalten“ öffnet die Doppelseite: Fotos frei schieben, zuschneiden, Text schreiben, zeichnen."),
        ratio: 585 / 1266,
      },
      {
        id: "einband",
        title: de("Einband"),
        text: de("Unter „Titelbild …“ kommt ein Foto auf den Einband. Daneben wählst du Titel und Farbe des Einbands."),
        ratio: 585 / 1050,
      },
    ],
  },
  {
    id: "fotos",
    title: de("Fotos bearbeiten"),
    lead: de("Licht und Farbe stellst du mit dem Finger direkt auf dem Foto ein. Ein Foto oder gleich mehrere auf einmal."),
    help: "/hilfe/fotostudio",
    features: [
      {
        id: "looks",
        title: "Looks",
        text: de("Tippe auf einen Look und wisch auf dem Foto, dann änderst du die Stärke. Gefällt dir eine Einstellung, speicherst du sie als eigenen Look."),
        ratio: 585 / 1266,
      },
      {
        id: "fotostudio",
        title: de("Fotostudio"),
        text: de("Mehrere Fotos auf einmal, „Auf alle“ gibt jedem sein eigenes Auto. Im Fotostudio wird nichts hochgeladen."),
        ratio: 585 / 1266,
      },
    ],
  },
  {
    id: "rezepte",
    title: de("Rezepte"),
    lead: de("Wie ein Foto entstanden ist, liegt als Zettel dabei."),
    help: "/hilfe/fotostudio",
    features: [
      {
        id: "fuji",
        title: de("Fuji-Rezept"),
        text: de("Filmsimulation, Körnung, Weißabgleich: Was die Fuji in die Datei schreibt, liegt als Zettel unter dem Foto. Der Reiter „Rezept“ stellt die Werte nachempfunden auch für andere Fotos ein."),
        ratio: 585 / 1155,
      },
      {
        id: "lightroom",
        title: de("Lightroom-Preset als Zettel"),
        text: de("Kommt ein Foto aus Lightroom, liegen seine Einstellungen als Zettel dabei, mit Tonkurve und Farben. Du sicherst sie als Preset (.xmp) oder nimmst sie für eigene Fotos mit."),
        ratio: 585 / 1266,
      },
    ],
  },
  {
    id: "hinlegen",
    title: de("Hinlegen|Funktionen"),
    lead: de("Hinlegen heißt: Eine Person bekommt ihren eigenen Link zu deinem Buch."),
    help: "/hilfe/hinlegen",
    features: [
      {
        id: "link",
        title: de("Ein Link pro Person"),
        text: de("Jede Person liest ohne Konto und ohne App. Wer den Link hat, kann das Buch ansehen, und sonst nichts."),
        ratio: 585 / 966,
      },
      {
        id: "zettel",
        title: de("Zettel"),
        text: de("Wer dein Buch liest, kann dir einen Zettel zu einem Foto dalassen. Lesen kannst ihn nur du."),
        ratio: 585 / 1116,
      },
      {
        id: "eselsohr",
        title: de("Eselsohren"),
        text: de("Die obere Ecke einer Seite gedrückt halten knickt ein Eselsohr. So siehst du, welche Seite gefallen hat."),
        ratio: 585 / 1116,
      },
      {
        id: "zurueckziehen",
        title: de("Zurückziehen|Funktionen"),
        text: de("Ein Tipp macht einen Link ungültig, die anderen gelten weiter. Solange „Wird zurückgezogen“ dasteht, holst du ihn noch zurück."),
        ratio: 585 / 966,
      },
    ],
  },
  {
    id: "kamera",
    title: de("Kamera"),
    lead: de("Fotografieren wie mit der Fuji, und die Bilder landen gleich im Buch. Sie kommt bald in den App Store."),
    help: "/hilfe/kamera",
    features: APP_FEATURES.map((f) => ({ id: f.icon, title: f.title, text: f.text, app: true as const })),
  },
];

/** Bild einer Funktion in der Sprache der Seite; App-only hat keins */
export const shotOf = (f: Feature, lang: Lang): string | null => (f.app ? null : `/funktionen/${lang}/${f.id}.jpg`);
