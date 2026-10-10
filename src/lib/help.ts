import { de, type Lang } from "@/lib/i18n";
import { FEATURE_GROUPS } from "@/lib/features";
import { HELP_PATH, TITLES, type Slug } from "@/lib/help-map";

// Hilfe als Landkarte (#215). /hilfe ist das Inhaltsverzeichnis: der Weg Fotografieren → Abendstapel → Buch → Hinlegen → Lesen,
// daneben das Fotostudio. Je Station eine Anleitung unter /hilfe/<slug>.
// Texte aus „Welle 1“ (geschaeft/marketing/landing-workshop-2026-10-10/material/calima-welle-1.md), Knopftexte gegen den Code geprüft.
// Wo App und Browser verschieden heißen, trägt ein Schritt beide Fassungen (app, web); gezeigt wird nur die passende (IS_APP).

export { ALSO, guidePath, HELP_PATH, MAP, type Slug } from "@/lib/help-map";

export type Step = {
  title: string;
  /** gilt überall */
  text: string;
  /** nur in der iOS-App, hängt hinter text */
  app?: string;
  /** nur im Browser, hängt hinter text */
  web?: string;
  /** Bild aus /funktionen (Id einer Funktion), im Testmodus aufgenommen, je Sprache */
  shot?: string;
};

export type Tip = { text: string; only?: "app" | "web"; link?: { href: string; label: string } };

export type Guide = {
  slug: Slug;
  /** kurzer Name der Station auf der Karte */
  label: string;
  /** die Frage, wie in Welle 1 (lib/help-map.ts) */
  title: string;
  /** ein Satz unter der Frage */
  lead: string;
  /** frühere Anker auf /hilfe (#buch-anlegen …), die jetzt auf diese Station zeigen */
  anchor?: string;
  intro?: string;
  steps: Step[];
  tips: Tip[];
  /** Kamera und Abendstapel gibt es nur in der iPhone-App */
  appOnly?: true;
  next?: Slug;
};

export const GUIDES: Guide[] = [
  {
    slug: "kamera",
    label: de("Fotografieren"),
    title: TITLES["kamera"],
    lead: de("Die Kamera in der App fotografiert gleich mit Look. Was du fotografierst, liegt abends im Abendstapel, bereit fürs Buch."),
    appOnly: true,
    steps: [
      {
        title: de("Kamera öffnen."),
        text: de("Im Bücherzimmer unten rechts auf den runden Auslöser („Fotografieren“). Oder halte das Calima-Symbol auf dem Home-Bildschirm gedrückt und wähl „Ins Reisebuch fotografieren“."),
      },
      {
        title: de("Einen Look wählen."),
        text: de("Unter dem Sucher liegen die Looks: „Original“, die zuletzt benutzten, deine eigenen und die von Calima. Das Foto entsteht gleich mit dem Look."),
      },
      {
        title: de("Halten und wischen."),
        text: de("Halten zeigt das Original, loslassen bringt den Look zurück. Wischen nach oben oder unten macht heller oder dunkler, ein Tipp stellt scharf."),
      },
      {
        title: de("Film einlegen."),
        text: de("„Film einlegen“ hält den Look für 24 Bilder fest. Die Bilder siehst du erst nach dem Entwickeln: Ein voller Film entwickelt sich von selbst, sonst tippst du auf „Entwickeln“ oder legst ihn mit „Beiseitelegen“ weg."),
      },
      {
        title: de("Einwegkamera."),
        text: de("Unter „Einwegkamera“ liegen sieben Filme mit je 27 Bildern: fester Ausschnitt, Blitz, nichts einzustellen."),
      },
      {
        title: de("Entwickelt."),
        text: de("Ein entwickelter Film liegt als Umschlag vorn im Fotostudio. Du öffnest ihn und sortierst die Bilder ins Buch wie einen Tag im Abendstapel."),
      },
    ],
    tips: [
      { text: de("Unter „Werkzeug“ stellst du Zeit, ISO, Fokus und Weiß ein. Fürs Weiß gibt es Kunstlicht, Neon, Sonne, Wolken und Schatten, oder du misst es mit „Weiß messen“ an etwas Weißem.") },
      { text: de("Der Look kommt als Rezept in die Datei. Im Buch liegt er als Zettel unter dem Foto, und „So fotografieren“ nimmt ihn wieder mit in die Kamera.") },
      { text: de("Beiseitegelegte Filme warten in der Kamera. Liegt einer schon länger als sieben Tage, steht das dran, und „Alle entwickeln“ entwickelt den ganzen Stapel.") },
      { text: de("Auch der Auslöser an der Seite des iPhones und die Lautstärketasten lösen aus.") },
    ],
    next: "abendstapel",
  },
  {
    slug: "abendstapel",
    label: de("Abendstapel"),
    title: TITLES["abendstapel"],
    lead: de("Was du ohne Film fotografierst, liegt auf dem Stapel des Tages. Abends sortierst du ihn ins Buch, ein Foto nach dem anderen."),
    appOnly: true,
    steps: [
      {
        title: de("Der Stapel."),
        text: de("Jedes Foto aus der Kamera kommt auf den Stapel von heute. Er liegt im Fotostudio, mit einem Zettel „Heute“ und der Zahl der Fotos. Der Tag wechselt um 4 Uhr früh."),
      },
      {
        title: de("Einsortieren."),
        text: de("Tipp auf den Stapel. Nach rechts wischen oder „Ins Buch“ nimmt ein Foto mit, nach links wischen oder „Weglegen“ legt es weg. Mit „Einen Satz dazu“ schreibst du etwas zum Foto."),
      },
      {
        title: de("Wie war der Tag?"),
        text: de("Am Ende steht „Fertig für heute“. Wenn du magst, schreibst du unter „Wie war der Tag?“ ein paar Worte."),
      },
      {
        title: de("Ins Buch legen."),
        text: de("Wähl das Buch, der Tag kommt hinten dazu. Beim ersten Mal schlägt Calima ein Tagebuch vor. Erst jetzt werden die Fotos hochgeladen."),
      },
      {
        title: de("Die Tagesseite."),
        text: de("Vorn steht eine Tagesseite mit Datum, deinen Worten und dem besten Foto, dahinter der Rest des Tages. „Seite gestalten“ öffnet sie auf der Werkbank."),
      },
    ],
    tips: [
      { text: de("„Später weiter“ schließt den Stapel. Er wartet, bis du wiederkommst.") },
      { text: de("Weggelegte Fotos bleiben sieben Tage unter dem Pult. „Zurückholen“ holt sie wieder.") },
      { text: de("Ein Tag kommt nur ganz in ein Buch, und ein Buch fasst 60 Fotos. Ist es zu voll, schlägt Calima einen neuen Band vor, etwa „Japan 2“.") },
      { text: de("Über „Mehr“ legst du Fotos aus der Mediathek dazu oder bearbeitest alle im Fotostudio.") },
    ],
    next: "erstes-buch",
  },
  {
    slug: "erstes-buch",
    label: de("Buch"),
    title: TITLES["erstes-buch"],
    lead: de("Ein paar Fotos auswählen, Calima setzt sie zu Doppelseiten. Den Rest machst du nur, wenn du willst."),
    anchor: "buch-anlegen",
    steps: [
      { title: de("Anmelden."), text: de("Mit Apple oder Google, das ist kostenlos.") },
      {
        title: de("Neues Buch."),
        text: de("Im Bücherzimmer wischst du zum leeren Buch „Neues Buch“ und tippst auf „Fotos wählen“."),
        web: de("Du kannst die Fotos auch einfach hineinziehen."),
      },
      {
        title: de("Warten, bis alles liegt."),
        text: de("Jedes Foto zeigt „liest …“, „lädt hoch …“, dann „fertig“. Danach stehen die Fotos als Doppelseiten da, nach Aufnahmezeit geordnet."),
        shot: "fotos",
      },
      {
        title: de("Eine Doppelseite ändern."),
        text: de("„Anderes Layout“ zeigt eine andere Anordnung. „Gestalten“ öffnet die Doppelseite, dort schiebst du Fotos frei, schneidest zu oder schreibst Text."),
        shot: "gestalten",
      },
      {
        title: de("Den Einband machen."),
        text: de("Unter „Titelbild …“ tippst du auf ein Foto, dann kommt es auf den Einband. Titel und „Farbe des Einbands“ stellst du gleich daneben ein."),
        shot: "einband",
      },
      { title: de("Ansehen."), text: de("Das Auge oben („Ansehen“) schlägt das Buch auf. Gespeichert wird von selbst, oben rechts steht „Gespeichert“.") },
    ],
    tips: [
      { text: de("In ein Buch passen bis zu 60 Fotos. Was darüber hinausgeht, passt in ein zweites Buch.") },
      { text: de("JPEG, HEIC und DNG gehen. Beim Hochladen werden die Fotos neu gespeichert, GPS und Seriennummer fallen weg.") },
      { text: de("Fotos aus der Fotos-App am Mac erst in den Finder ziehen oder „Fotos auswählen“ nutzen."), only: "web" },
      {
        text: de("Willst du eine Doppelseite so behalten, wie sie ist, dann fixiere sie mit dem Schloss. „Automatisch gestalten“ lässt sie dann in Ruhe."),
      },
      { text: de("Vor großen Änderungen und alle zehn Minuten legt Calima von selbst einen Zwischenstand an. Unter „Verlauf“ holst du ihn zurück, am Telefon über „Mehr“.") },
      { text: de("Ohne Netz speichert Calima auf dem Gerät und schickt es los, sobald wieder Netz da ist.") },
    ],
    next: "hinlegen",
  },
  {
    slug: "hinlegen",
    label: de("Hinlegen|Hilfe"),
    title: TITLES["hinlegen"],
    lead: de("Hinlegen heißt: Eine Person bekommt ihren eigenen Link zu deinem Buch. Sie liest ohne Konto und kann dir Zettel und Eselsohren dalassen."),
    anchor: "buch-teilen",
    steps: [
      {
        title: de("„Hinlegen …“ öffnen."),
        text: de("Auf der Werkbank oben „Hinlegen …“, oder im Bücherzimmer beim Buch „Hinlegen für …“. Liegt es schon bei jemandem, findest du das unter den drei Punkten („Mehr“)."),
      },
      {
        title: de("Für wen?"),
        text: de("Prüf den Titel und trag den Namen ein, so wie die Person ihn lesen soll. Bestätige, dass du nur teilst, woran du die Rechte hast. Dann „Link erstellen“."),
        shot: "link",
      },
      {
        title: de("Link schicken."),
        text: de("Bei der Person steht jetzt „Liegt bereit“."),
        app: de(
          "Das Teilen-Symbol öffnet Nachrichten, Mail und Co., mit dem Text „Ich hab dir ein Fotobuch hingelegt …“. Das Kopieren-Symbol daneben legt den Link in die Zwischenablage.",
        ),
        web: de("Das Kopieren-Symbol legt den Link in die Zwischenablage. Am Telefon öffnet das Teilen-Symbol daneben Nachrichten, Mail und Co."),
      },
      {
        title: de("Antworten lesen."),
        text: de(
          "Zettel und Eselsohren stehen im Bücherzimmer direkt unter dem Buch, etwa „1 Zettel · 1 Eselsohr“. „Alle“ zeigt jede Rückmeldung, ein Tipp darauf schlägt das Buch an der Stelle auf.",
        ),
      },
      {
        title: de("Zurückziehen."),
        text: de(
          "Im selben Fenster bei der Person auf das durchgestrichene Link-Symbol. Solange „Wird zurückgezogen“ dasteht, holt der Pfeil den Link zurück. Danach öffnet er nichts mehr.",
        ),
        shot: "zurueckziehen",
      },
    ],
    tips: [
      { text: de("Jede Person hat ihren eigenen Link. Wenn du einen zurückziehst, gelten die anderen weiter.") },
      { text: de("Wer den Link hat, kann das Buch ansehen, und sonst nichts.") },
      { text: de("Liegt das Buch im Papierkorb, zeigen alle seine Links nichts mehr. Leerst du den Papierkorb, sind auch die Zettel der Gäste weg.") },
      { text: de("Wem du schon etwas hingelegt hast, steht im Profil unter „Hingelegt für“.") },
    ],
    next: "lesen",
  },
  {
    slug: "lesen",
    label: de("Lesen und antworten"),
    title: TITLES["lesen"],
    lead: de("Du brauchst kein Konto und keine App. Öffne einfach den Link."),
    steps: [
      { title: de("Link öffnen."), text: de("Das Buch liegt auf dem Tisch, mit einem Zettel „Für Jana, von Michel“. „Buch aufschlagen“ öffnet es.") },
      {
        title: de("Blättern."),
        text: de("Am Telefon wischst du oder tippst auf den Rand. Am Computer scrollst du, klickst oder nimmst die Pfeiltasten ← →."),
      },
      {
        title: de("Ein Eselsohr knicken."),
        text: de(
          "Halte die obere Ecke einer Seite gedrückt. So merkst du dir ein Foto, und wer dir das Buch hingelegt hat, sieht, welche Seite dir gefällt. Ein paar Sekunden lang kannst du es noch rückgängig machen.",
        ),
        shot: "eselsohr",
      },
      {
        title: de("Einen Zettel schreiben."),
        text: de("Oben auf „Zettel“, dann schreib etwas zu dem Foto und tippe auf „Hinlegen“. Lesen kann ihn nur, wer dir das Buch hingelegt hat."),
        shot: "zettel",
      },
      {
        title: de("Behalten."),
        text: de("Mit „In mein Bücherzimmer legen“ (am Telefon „Behalten“) und einem kostenlosen Konto bleibt das Buch bei dir unter „Für dich“. Dann kannst du auch eigene Bücher machen."),
      },
    ],
    tips: [
      { text: de("Steht da „Dieses Buch liegt hier nicht mehr“, wurde der Link wahrscheinlich zurückgezogen.") },
      { text: de("Ist etwas nicht in Ordnung, tippe auf die drei Punkte („Mehr“) und dann auf „Buch melden“. Das geht ohne Konto, und ich sehe es mir innerhalb von 24 Stunden an.") },
      {
        text: de("Von einem Zettel wird gespeichert: der Text, ein Name, die Seite und die Uhrzeit. Mehr steht im"),
        link: { href: "/datenschutz", label: de("Datenschutz") },
      },
    ],
  },
  {
    slug: "fotostudio",
    label: de("Fotostudio"),
    title: TITLES["fotostudio"],
    lead: de("Licht und Farbe stellst du mit dem Finger direkt auf dem Foto ein. Ein Foto oder gleich mehrere auf einmal."),
    anchor: "fotos-bearbeiten",
    intro: de(
      "Zwei Wege hinein: Das Fotostudio liegt im Bücherzimmer unter den Büchern, dort geht es ganz ohne Buch. Auf der Werkbank kommst du über „Bearbeiten …“ bei einem Foto oder das Regler-Symbol bei einer Doppelseite („Fotos bearbeiten“) hinein.",
    ),
    steps: [
      { title: de("Fotos öffnen."), text: de("Im Bücherzimmer unten beim Fotostudio auf „Fotos wählen“, gern mehrere auf einmal.") },
      { title: de("Vorschläge."), text: de("Jede Kachel zeigt dein Foto schon fertig. Ein Tipp genügt."), shot: "fotostudio" },
      { title: de("Looks."), text: de("Tippe auf einen Look und wisch auf dem Foto, dann änderst du die Stärke. „Ohne Look“ nimmt ihn wieder weg."), shot: "looks" },
      { title: de("Feinschliff."), text: de("Wähle einen Regler und wisch waagerecht über das Foto. Der Wert steht groß im Bild, ↺ setzt ihn zurück.") },
      { title: de("Vorher sehen."), text: de("Halte den Finger auf dem Foto, dann siehst du das Original. Loslassen zeigt wieder die Bearbeitung.") },
      {
        title: de("Mehrere Fotos gleich machen."),
        text: de(
          "Stell ein Foto ein, dann „Auf alle 6“ (die Zahl ist die Anzahl deiner Fotos). Jedes Foto bekommt dabei sein eigenes Auto, der Zuschnitt bleibt bei jedem. „Angleichen“ rückt die Fotos in Licht und Farbe zusammen.",
        ),
      },
      {
        title: de("Zuschneiden."),
        text: de("Das Zuschneiden-Symbol unter dem Foto öffnet den Rahmen und Formate wie 1:1 oder 4:5. Zieh den Rahmen oder seine Ecken, mit dem Rad richtest du das Foto gerade."),
      },
      {
        title: de("Fertig."),
        text: de("Danach wählst du „In Fotos sichern …“ (in der App und am Handy), „Herunterladen“ (am Computer) oder „In ein Buch legen …“."),
      },
    ],
    tips: [
      { text: de("Im Fotostudio wird nichts hochgeladen. Ein Abzug öffnet das Foto später wieder so, wie du es bearbeitet hast.") },
      { text: de("Höchstens 20 Fotos auf einmal, jedes bis 60 MB.") },
      { text: de("Gefällt dir eine Einstellung, nimm „Als eigenen Look speichern“. Sie steht dann oben bei „Deine Looks“, für alle Fotos und Bücher.") },
      { text: de("Der Reiter „Rezept“ stellt die Werte ein wie an einer Fuji-Kamera, nachempfunden. Das geht auch mit Fotos vom iPhone.") },
      { text: de("Tasten: M oder \\ gedrückt halten zeigt das Original, 1 bis 4 wechseln die Reiter."), only: "web" },
    ],
  },
];

export const guideOf = (slug: string): Guide | undefined => GUIDES.find((g) => g.slug === slug);

/** Teile eines Schritts in der Fassung für App oder Browser, jeder für sich übersetzbar */
export const stepText = (s: Step, app: boolean): string[] => [s.text, ...((app ? s.app : s.web) ? [(app ? s.app : s.web)!] : [])];

/** „Gut zu wissen“ ohne die Punkte, die nur für die andere Fassung gelten */
export const tipsFor = (g: Guide, app: boolean): Tip[] => g.tips.filter((tip) => !tip.only || tip.only === (app ? "app" : "web"));

const FEATURES = FEATURE_GROUPS.flatMap((g) => g.features);

/** Bild zu einem Schritt: dasselbe Bildschirmfoto wie auf /funktionen, in der Sprache der Seite */
export function shotOf(id: string, lang: Lang): { src: string; width: number; height: number } {
  const f = FEATURES.find((x) => x.id === id && !x.app);
  if (!f) throw new Error(`Kein Bild für ${id}`);
  return { src: `/funktionen/${lang}/${id}.jpg`, width: 585, height: Math.round(585 / (f.ratio ?? 0.5)) };
}

/** Einmal beim ersten Start in der App: der Weg in einem Satz, mit Link in die Hilfe */
export const FIRST_HINT = {
  text: de("Fotografieren, abends im Abendstapel aussortieren, daraus wird ein Buch."),
  link: de("So geht’s"),
  href: HELP_PATH,
};

type Store = Pick<Storage, "getItem" | "setItem">;
const HINT_KEY = "calima:hinweis-weg";

/** Hinweis schon erledigt (weggetippt oder erstes Foto)? Ohne Speicher: ja, sonst käme er bei jedem Start */
export function hintDone(store: Store): boolean {
  try {
    return store.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

export function markHintDone(store: Store) {
  try {
    store.setItem(HINT_KEY, "1");
  } catch {}
}

/** localStorage, erst beim Aufruf angefasst: schon der Zugriff kann werfen (gesperrte Website-Daten) */
export const browserStore: Store = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
};
