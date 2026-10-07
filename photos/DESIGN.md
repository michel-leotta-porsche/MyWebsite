---
name: Fujiventura
description: Fotobücher (Fuerteventura, Japan) auf einem Basalttisch, zum Aufschlagen und Durchblättern.
colors:
  table: "#1b1917"
  table-deep: "#121110"
  on-table: "#ece6dc"
  on-table-2: "#a39a8e"
  cloth: "#e8a72c"
  cloth-deep: "#b97a12"
  cloth-ink: "#3a2706"
  paper: "#eee9df"
  paper-shade: "#dcd5c8"
  ink: "#1b1c1a"
  ink-2: "#5a5c56"
  cloth-mist: "#c9c8c3"
  cloth-mist-deep: "#a3a29c"
  shadow-basalt: "#0c0a08"
  mistlight: "#d6e2e8"
  table-light: "#ffecd2"
  sunlight: "#ffcd82"
  yellowing: "#c4a05c"
typography:
  cover-title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "15.5cqw"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 78, \"opsz\" 96"
  title-page:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "19cqw"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.04em"
    fontVariation: "\"wdth\" 75, \"opsz\" 96"
  wordmark:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 80"
  caption:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "max(11px, 3.1cqw)"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "\"tnum\""
  ui:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\""
  stop-label:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  intro-word:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(56px, 15.5vw, 230px)"
    fontWeight: 700
    lineHeight: 0.82
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 75, \"opsz\" 96"
rounded:
  none: "0px"
spacing:
  gutter-sm: "16px"
  gutter-md: "32px"
  page-margin: "12cqw"
components:
  button-text:
    textColor: "{colors.on-table}"
    typography: "{typography.ui}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  sequence-stop:
    backgroundColor: "{colors.on-table-2}"
    width: "3px"
    height: "10px"
    rounded: "{rounded.none}"
  sequence-stop-active:
    backgroundColor: "{colors.cloth}"
    width: "3px"
    height: "19px"
  page-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  cover:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.cloth-ink}"
    rounded: "{rounded.none}"
  table-surface:
    backgroundColor: "{colors.table}"
    textColor: "{colors.on-table}"
---

# Design System: Fujiventura

## Overview

**Creative North Star: "Bücher auf dem Basalttisch"**

Die ganze Oberfläche ist ein Gegenstand: ein Fotobuch der 70er Jahre im Geist von Egglestons „Guide“ und Shores „Uncommon Places“, das mit seinen Geschwistern auf einem dunklen Basalttisch liegt (Fuerteventura in Ringelblumen-Leinen, Japan in nebelgrauem Leinen; weitere Bände kommen dazu). Der Tisch ist die Navigation: Klick auf einen Band nimmt ihn auf, Esc, die Wortmarke, die Zurück-Taste oder Weiterscrollen nach dem Kolophon legt ihn zurück. Kein Menü, kein Regal. Es gibt keine Seite im Web-Sinn, sondern Einband, Vorsatz, Titelei, Tafeln und Kolophon. Scrollen blättert das Buch in echtem 3D um. Alles, was nicht Buch ist (Wortmarke, Tafelzähler, Bildfolge-Linie), liegt klein und ruhig auf dem Tisch.

Die Seiten haben das Format der Fotos (Fuji 2:3, iPhone 3:4) und einen Satzspiegel auf einem 6-Spalten-Raster. Sieben Seitentypen wechseln sich ab, damit ein Rhythmus entsteht statt eines Metronoms; pro Band gibt es höchstens eine leere Seite. Farbe kommt aus den Fotos und aus zwei Materialien: dem Tischleinen und dem ringelblumengelben Buchleinen. Das Gelb ist zugleich die einzige Akzentfarbe und markiert nur die Position in der Bildfolge und den Fokus.

Licht und Tiefe sind physisch begründet: Schatten des Buchs auf dem Tisch, Wölbung zum Bund, Abdunkeln eines Blatts beim Aufrichten, das Eselsohr beim Hover. Nichts davon ist Dekoration, alles erklärt, wo Papier liegt und wohin es sich bewegt.

**Key Characteristics:**
- Ein einziger Gegenstand (das Buch) statt Raster, Karten oder Lightbox.
- Zwei Materialien mit Gewebestruktur (Tisch, Einband), glattes Bilderdruckpapier für die Seiten.
- Eine Schrift (Bricolage Grotesque) mit Breiten- und Optik-Achse, Ziffern tabellarisch.
- Keine Radien. Kanten sind Papierkanten.
- Bewegung mit Masse: Federn auf dem Scrollwert, Blätter beschleunigen und setzen weich auf.

## Colors

Monochromer Tisch aus Basalt, ein warmes Buchleinen-Gelb als einzige Stimme, Naturpapier mit fast schwarzer Tinte. Jeder Band hat sein eigenes Leinen.

### Primary
- **Ringelblumen-Buchleinen** (`cloth`): Fläche des Einbands, sonst nur Signal: gefüllter Teil der Bildfolge-Linie, aktiver Haltepunkt, Unterstrich bei Hover der Textknöpfe, Fokusrahmen auf dem Tisch, Textauswahl, Scrollbalken. Auf dem Tisch erreicht es 8.34:1, bleibt aber Signal: nur für Nicht-Text (Linien, Balken, Rahmen) einsetzen. Auf Papier und Zettel hat es nur 1.7:1.
- **Tiefes Buchleinen** (`cloth-deep`): Falz am Rücken des Einbands (25 % und 60 % Deckkraft) und Vorsatzpapier (90 %). Nie für Text.
- **Prägung** (`cloth-ink`): Titel und Autorname auf dem Einband (6.79:1 auf `cloth`), Textfarbe der Auswahl.

### Neutral
- **Basalt** (`table`): der Tisch, feines Steinkorn statt Gewebe, ein warmer Lichtkegel in der Mitte; Hintergrund der ganzen Bühne und `theme-color`.
- **Tiefer Basalt** (`table-deep`): Fuß der Seite, Hintergrund der vergrößerten Tafel, Spur des Scrollbalkens.
- **Leinenweiß** (`on-table`): Haupttext auf dem Tisch: Wortmarke, aktueller Abschnitt im Zähler, Knöpfe im Vollbild (14.1:1 auf `table`).
- **Aschgrau** (`on-table-2`): Nebentext auf dem Tisch, inaktive Haltepunkte, Grundlinie der Bildfolge mit 40 % Deckkraft (voll 6.3:1 auf `table`, die Linie mit 40 % etwa 2.1:1, nur Deko).
- **Naturpapier** (`paper`): alle Innenseiten.
- **Nebelgraues Leinen** (`cloth-mist`, Falz und Vorsatz `cloth-mist-deep`): Einband des Japan-Bands, Schrift darauf nur in `ink` (10.2:1).
- **Papierschatten** (`paper-shade`): Papierkanten des Blockstapels, Unterseite im Eselsohr.
- **Tinte** (`ink`): Titelseite, Tafelnummer in der Bildunterschrift (14.1:1 auf `paper`).
- **Graue Tinte** (`ink-2`): Text der Bildunterschriften und des Kolophons (5.6:1 auf `paper`).

Der Tisch ist immer dunkel, ein eigenes dunkles Farbschema gibt es nicht. Schatten mischen aus warmem Basalt (`rgb(12 10 8)`), nie aus neutralem Grau.

### Named Rules
**The One Voice Rule.** Das Buchleinen-Gelb ist außerhalb des Einbands nur Signal: Position in der Bildfolge, Fokus, Hover-Unterstrich. Nie als Fläche auf dem Tisch, nie als Textfarbe.

**The Material Rule.** Jede Fläche ist ein Material: Tischleinen, Buchleinen oder Papier. Eine neue Fläche muss sagen, welches davon sie ist; eine vierte Oberflächenfarbe gibt es nicht.

## Typography

**Display Font:** Bricolage Grotesque (mit system-ui, sans-serif)
**Body Font:** Bricolage Grotesque (mit system-ui, sans-serif)

**Character:** Eine einzige Grotesk mit Charakter, im Titel schmal und schwer wie auf einem Buchrücken der 70er, im Text ruhig und klein wie eine Bildunterschrift. Ziffern sind überall tabellarisch, weil Tafelnummern und Zähler untereinander stehen.

### Hierarchy
- **Einbandtitel** (700, 11cqw, Zeilenhöhe 0.9, Laufweite -0.035em, Breite 78, Optik 96): Titel des Bands unten links auf der Satzspiegelkante, darunter der Name in 3.6cqw.
- **Titelseite** (700, 7cqw an der oberen Satzspiegellinie): leise, darunter Anzahl und Orte in 3cqw, der Name am Fuß.
- **Wortmarke auf dem Tisch** ist die eine `h1`; im Buch ist sie der Knopf „zurück zum Tisch“.
- **Wortmarke** (700, 18px, -0.02em, Breite 80): oben links auf dem Tisch.
- **Einstieg** (700, `clamp(56px, 15.5vw, 230px)`, 0.82, -0.035em, Breite 75, Optik 96): „FUJIVENTURA“ in Versalien, Buchstabe für Buchstabe von unten, nur im Einstieg.
- **Bildunterschrift** (400, max(11px, 2.6cqw), 1.375): Nummer in `ink` halbfett, Titel und Zusatz in `ink-2`, an der Außenkante des Bildes, 3cqw darunter. Gleiche Größe im Kolophon. Randlose Tafeln (Vollbild, über den Bund) tragen keine Unterschrift auf der Seite; ihr Titel steht in der Mitte der Kopfzeile (auf dem Telefon darunter).
- **Bedienung** (400, 14px): Tafelzähler, Hinweis „Scrollen zum Blättern“, Knöpfe im Vollbild, Fuß.
- **Haltepunkt-Etikett** (400, 12px): Nummer und Titel über einem Haltepunkt beim Hover.

### Named Rules
**The Container Type Rule.** Alles, was auf einer Seite gedruckt ist, wird in `cqw`/`cqh` der Seite gesetzt, nie in `px` oder `rem`. Das Buch skaliert als Ganzes, die Satzspiegel bleiben gleich. Einzige Untergrenze: Bildunterschriften fallen nie unter 11px.

**The Plate Number Rule.** Zahlen sind tabellarisch und die Tafelnummer steht immer vor dem Titel, halbfett in der dunkleren Farbe. Keine Kameradaten, keine erfundenen Fakten.

## Layout

**Tisch:** alle Bände nebeneinander, leicht gedreht (−4°, +3°, …) und versetzt, darunter klein Titel und Tafelzahl. Einbandbreite `min(22vw, (100svh - 280px) / 1.5, 360px)` mal Maßstab des Bands (Japan 0.85), auf dem Telefon 54vw, abwechselnd links und rechts. Der Buchblock zeigt Papierkanten so dick, wie der Band Seiten hat. Hover hebt einen Band um 8px (`scale(1.015)`, 500ms), ein weicherer Schatten blendet dazu.

**Lesen:** Die Bühne ist ein Viewport hoch und klebt (`sticky`), darunter liegt eine Scrollspur von etwa 85svh pro Blatt plus ein Auslauf, auf dem sich das Buch zurück auf den Tisch legt. Kein Snapping. Kopfzeile: Wortmarke links, Titel der randlosen Tafel in der Mitte, rechts „Band · Tafel 4–5 / 26“. Unten die Bildfolge-Linie des Bands (höchstens 680px).

Ab 768px Doppelseite, Seitenbreite `min((100vw - 64px) / 2, (100svh - 150px) / Format, 640px)` mal Maßstab. Darunter Einzelseiten: `min(100vw - 24px, (100svh - 150px) / Format)`; leere Seiten und Vorsatz entfallen, das Bild über den Bund wird quer.

**Satzspiegel** (cqw, Seitenbreite 100): Bund 6, oben 9, außen 12, unten 18 (Japan 15); Breite 82, Höhe passend zum Fotoformat. Raster: 6 Spalten, 2cqw Fuge. Geometrie für HTML und WebGL-Textur kommt aus derselben Funktion (`src/content/layout.ts`).

**Seitentypen:** Vollbild (randlos, ohne Text) · Tafel (füllt den Satzspiegel, Unterschrift darunter) · kleine Tafel (2 oder 3 Spalten, oben oder unten, außen oder am Bund) · Querformat (volle Breite an der oberen Satzspiegellinie) · über den Bund (beide Seiten, Ausschnitt über `focus`) · leer (nur die Unterschrift der Gegenseite) · hohes Format (9:16 am Bund, außen ein Papierstreifen mit gestapelter Unterschrift). Am Ende jedes Bands: Bildverzeichnis als Kontaktbogen (Klick springt zur Tafel) und Kolophon.

**Bildverzeichnis:** eine Seite, bündig im Satzspiegel, 2cqw Fuge. Die Spaltenzahl folgt der Zahl der Tafeln: die größten Daumen, bei denen alle Tafeln samt Nummer in den Satzspiegel passen (4, 6, 8, 10, Reserve 12; `indexGrid` in `layout.ts`). Bis 60 Tafeln reichen 10 Spalten in beiden Formaten. Klickfläche: Bei 10 Spalten ist ein Daumen auf dem Telefon knapp unter 24px breit. Weil Daumen plus Fuge dann 8.4cqw messen (≥ 24px ab 286px Seitenbreite), gilt die Abstandsausnahme von WCAG 2.5.8.

### Named Rules
**The Rhythm Rule.** Zwei randlose Paare stehen nie direkt hintereinander; spätestens nach drei Doppelseiten kommt eine Seite mit viel Papier. Höchstens eine leere Seite pro Band.

**The Gutter Rule.** Ein Bild über den Bund legt sein Motiv nie in die Mitte.

## Elevation & Depth

Tiefe ist physisch, nicht ornamental. Es gibt genau ein Objekt über dem Tisch, das Buch, und sein Licht folgt der Mechanik: Das geschlossene Buch liegt um 16° gekippt und leicht verkleinert, beim Öffnen richtet es sich auf 4° auf. Papierkanten (7px, Streifen aus `paper` und `paper-shade`) wachsen links und schrumpfen rechts mit dem Lesefortschritt.

### Shadow Vocabulary
- **Buch auf dem Tisch** (`box-shadow: 0 28px 50px -18px rgb(12 10 8 / 0.75), 0 6px 14px -6px rgb(12 10 8 / 0.5)`): nur unter dem aufgeschlagenen Teil, Farbe aus dem Petrol abgeleitet, nie neutralschwarz.
- **Eingeklebtes Bild** (`box-shadow: 1px 2px 3px rgb(58 39 6 / 0.35), 0 0 0 0.5px rgb(58 39 6 / 0.2)`): das Coverbild steht minimal vom Leinen ab.
- **Bundwölbung** (Verlauf `rgb(12 10 8 / 0.16)` über `rgb(12 10 8 / 0.05)` bei 30 % zu transparent, 14cqw breit): jede Innenseite dunkelt zum Bund hin.
- **Blattlicht** (Verlauf `rgb(12 10 8 / 0.55)` zu `rgb(12 10 8 / 0.15)`, Deckkraft 0 bis 0.42): die Vorderseite dunkelt beim Aufrichten, die Rückseite hellt beim Ablegen.
- **Biegung** (WebGL-Beleuchtung aus der Flächennormale, flach = 1.0, Glanzlicht auf der Wölbung, Basalt-Schatten auf der Seite darunter): steile Stellen werden dunkler, ohne Kanten oder Fugen.
- **Eselsohr-Loch** (Verlauf `rgb(12 10 8 / 0.28)` an der Falte zu `paper-shade`): die Seite unter der umgeklappten Ecke.
- **Palmenschatten** (Wedel in `rgb(12 10 8)`, Deckkraft 0.12, auf ein Neuntel der Auflösung gezeichnet und hochskaliert): Schatten einer Palme über Tisch und Buch, wiegt sich langsam (9s und 3.1s, `cubic-bezier(0.77, 0, 0.175, 1)`). Liegt unter Kopfzeile und Bildfolge, nie auf Bedienelementen.
- **Sonne** (`soft-light`: oben rechts `rgb(255 205 130 / 0.55)` zu transparent, unten links `rgb(12 10 8 / 0.35)`): Licht von draußen, gleiche Stelle wie der Ansatz der Palme.
- **Vergilbung** (Rand `rgb(196 160 92 / 0.16)` ab 72 % des Seitenradius, dazu feine Papierfaser bei 28 % Deckkraft): das Papier hat ein paar Sommer gesehen.
- **Eselsohr** (`drop-shadow(-3px -3px 5px rgb(12 10 8 / 0.28))`): die Lasche der umgeklappten Ecke.

### Named Rules
**The Physical Light Rule.** Ein Schatten oder Verlauf ist nur erlaubt, wenn er eine Stelle beschreibt, an der Papier oder Leinen liegt, sich biegt oder dreht. Keine Schatten auf Bedienelementen, keine Glanz- oder Glas-Effekte.

## Shapes

Keine Radien, nirgends (`0px`). Seiten, Tafeln, Einband und Vollbild sind Rechtecke mit Papierkanten. Die einzigen anderen Formen entstehen aus dem Material: das Dreieck des Eselsohrs (per `clip-path`), die 3px schmalen Balken der Haltepunkte, der Falz am Rücken (5cqw breit, mit 1px-Linie). Die Gewebestruktur von Tisch und Einband ist ein Rauschen in zwei Fadenrichtungen (`soft-light`, 32 % Deckkraft, unter 768px 18 %), ohne Bilddatei.

## Components

### Textknöpfe (Vollbild)
Ruhig, nur Wort, kein Kasten.
- **Shape:** keine Fläche, kein Rahmen, eckig.
- **Default:** `on-table`, 14px, Innenabstand 4px × 8px („Zurück“, „Weiter“), „Schließen“ mit 8px × 12px.
- **Hover:** Unterstrich in `cloth`, 2px dick, 4px Abstand zur Schrift.
- **Focus:** 2px Rahmen in `cloth`, 3px Abstand (global).

### Blätterflächen und Tafelflächen
Unsichtbare Knöpfe, die auf dem Papier liegen.
- **Blättern:** je 7 % Breite an den Außenkanten des Buchs, Cursor `w-resize`/`e-resize`, Klick irgendwo aufs Papier blättert ebenfalls.
- **Tafel:** deckt das Bild ab, Cursor `zoom-in`, öffnet die vergrößerte Tafel.
- **Focus:** 2px Rahmen in `ink`, nach innen versetzt (-4px), weil `cloth` auf Papier zu schwach wäre.

### Bildfolge-Linie (Signatur)
Die Bildfolge als Fahrplan-Linie mit einem Haltepunkt pro Tafel (26). Die ganze Linie ist eine Scrub-Leiste: Tippen oder Ziehen springt zur Tafel unter dem Finger; die Knöpfe bleiben für die Tastatur.
- **Linie:** 1px `on-table-2` bei 40 %, darüber die gefüllte Strecke in `cloth`, die per `scaleX` mit dem Blättern mitläuft.
- **Haltepunkt:** Balken 3px × 10px in `on-table-2`. Klickfläche: die ganze 24px hohe Linie; jeder Knopf höchstens 24px breit, auf schmalen Schirmen schmaler, weil die Leiste den Treffer übernimmt.
- **Hover:** Balken wächst auf 150 % Höhe und wird `on-table`, darüber erscheint Nummer und Titel (12px, steigt 4px auf).
- **Aktiv:** `cloth`, 190 % Höhe, `aria-current`.
- **Übergang:** Größe 500ms `ease-out`, Farbe 160ms.

### Kopfzeile
Wortmarke links, rechts „Tafel 3 / 15 Tafeln“ (Abschnitt in `on-table`, Rest in `on-table-2`, Live-Region). Kein Menü.

### Einband
Ringelblumen-Leinen mit Falz am Rücken, eingeklebte Tafel (64cqw breit, 4:5, mit 1.6cqw Papierrand), Titel als flacher Druck in `cloth-ink` unten links. Beim ersten Laden hebt sich der Einband einmal um 28° an (1.8s, nach 0.9s), als Hinweis zum Blättern.

### Blatt und Eselsohr
Jedes Blatt dreht um den Bund (`rotateY` 0 bis -180°, Perspektive 2600px) mit kubischem ease-in-out pro Blatt. Während es sich bewegt, zeichnet eine WebGL-Fläche das Blatt (64 Segmente, Winkel pro Spalte φ = θ + 70°·sin(πs)·(2u−1)), Vorder- und Rückseite als Canvas-Texturen; das HTML-Blatt ist solange unsichtbar. Ohne WebGL oder mit `?ohne=biegung` dreht das HTML-Blatt flach.

### Vergrößerte Tafel
Die Tafel fliegt aus ihrer Position im Buch auf volle Größe (620ms `ease-out`, nur `transform`) über einem Hintergrund aus `table-deep`-Leinen, darunter Nummer, Titel und Zurück/Weiter. Schließen fliegt sie zurück an ihre Stelle (480ms), die Bedienung blendet vorher in 120ms aus. Tafelwechsel im Vollbild: 260ms Einblenden aus 98.5 %.

## Do's and Don'ts

### Do:
- **Do** jede neue Fläche einem der drei Materialien zuordnen: Tischleinen (`table`), Buchleinen (`cloth`) oder Papier (`paper`).
- **Do** `cloth` auf dem Tisch nur für Linien, Balken, Unterstriche und Fokus einsetzen (Signal, kein Text).
- **Do** auf Papier den Fokus in `ink` setzen, auf dem Tisch in `cloth`.
- **Do** alles auf einer Seite in `cqw`/`cqh` setzen, Bildunterschriften nie unter 11px.
- **Do** nur `transform`, `opacity` und `clip-path` animieren, Easing `cubic-bezier(0.23, 1, 0.32, 1)` oder `cubic-bezier(0.77, 0, 0.175, 1)`.
- **Do** bei `prefers-reduced-motion` auf Stufen umschalten: Blätter springen, Feder, Einbandhinweis, Eselsohr und Fluganimation entfallen, Rastpunkte aus.
- **Do** Schatten aus Basalt (`rgb(12 10 8)`) oder Prägebraun (`rgb(58 39 6)`) mischen, nie aus neutralem Grau.

### Don't:
- **Don't** Masonry-Raster, Kartengitter oder eine Lightbox ohne Herkunft bauen; Bilder kommen aus dem Buch und kehren dorthin zurück.
- **Don't** Radien verwenden (`0px` überall).
- **Don't** `cloth` als Hintergrund einer Fläche auf dem Tisch oder als Textfarbe einsetzen.
- **Don't** Schatten oder Verläufe auf Bedienelemente legen; Licht gehört dem Papier.
- **Don't** Kameradaten, Brennweiten, Aufnahmedaten oder Fujifilm-Zeichen zeigen.
- **Don't** eine zweite Schrift einführen.
