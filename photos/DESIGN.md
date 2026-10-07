---
name: Fujiventura
description: Sechsundzwanzig Fotografien von Fuerteventura, gebunden als Buch auf einem Leinentisch.
colors:
  table: "#1d4f55"
  table-deep: "#12363b"
  on-table: "#e6eee9"
  on-table-2: "#a9c3bf"
  cloth: "#e8a72c"
  cloth-deep: "#b97a12"
  cloth-ink: "#3a2706"
  paper: "#f6f6f2"
  paper-shade: "#e4e4dd"
  ink: "#1b1c1a"
  ink-2: "#5a5c56"
  shadow-petrol: "#04181b"
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

**Creative North Star: "Das Buch auf dem Leinentisch"**

Die ganze Oberfläche ist ein Gegenstand: ein Fotobuch der 70er Jahre im Geist von Egglestons „Guide“ und Shores „Uncommon Places“, das auf einem Tisch aus meer-petrolfarbenem Leinen liegt. Es gibt keine Seite im Web-Sinn, sondern Einband, Vorsatz, Titelei, Tafeln und Kolophon. Scrollen blättert das Buch in echtem 3D um. Alles, was nicht Buch ist (Wortmarke, Tafelzähler, Bildfolge-Linie), liegt klein und ruhig auf dem Tisch.

Die Dichte ist gering. Leere Gegenseiten sind gewollt und tragen nur eine Bildunterschrift; Panoramen laufen über den Bund. Farbe kommt aus den Fotos und aus zwei Materialien: dem Tischleinen und dem ringelblumengelben Buchleinen. Das Gelb ist zugleich die einzige Akzentfarbe und markiert nur die Position in der Bildfolge und den Fokus.

Licht und Tiefe sind physisch begründet: Schatten des Buchs auf dem Tisch, Wölbung zum Bund, Abdunkeln eines Blatts beim Aufrichten, das Eselsohr beim Hover. Nichts davon ist Dekoration, alles erklärt, wo Papier liegt und wohin es sich bewegt.

**Key Characteristics:**
- Ein einziger Gegenstand (das Buch) statt Raster, Karten oder Lightbox.
- Zwei Materialien mit Gewebestruktur (Tisch, Einband), glattes Bilderdruckpapier für die Seiten.
- Eine Schrift (Bricolage Grotesque) mit Breiten- und Optik-Achse, Ziffern tabellarisch.
- Keine Radien. Kanten sind Papierkanten.
- Bewegung mit Masse: Federn auf dem Scrollwert, Blätter beschleunigen und setzen weich auf.

## Colors

Monochromer Tisch in Petrol, ein warmes Buchleinen-Gelb als einzige Stimme, kühles Papier mit fast schwarzer Tinte.

### Primary
- **Ringelblumen-Buchleinen** (`cloth`): Fläche des Einbands, sonst nur Signal: gefüllter Teil der Bildfolge-Linie, aktiver Haltepunkt, Unterstrich bei Hover der Textknöpfe, Fokusrahmen auf dem Tisch, Textauswahl, Scrollbalken. Auf dem Tisch erreicht es 4.34:1, also nur für Nicht-Text (Linien, Balken, Rahmen) einsetzen.
- **Tiefes Buchleinen** (`cloth-deep`): Falz am Rücken des Einbands (25 % und 60 % Deckkraft) und Vorsatzpapier (90 %). Nie für Text.
- **Prägung** (`cloth-ink`): Titel und Autorname auf dem Einband (6.79:1 auf `cloth`), Textfarbe der Auswahl.

### Neutral
- **Meer-Petrol-Leinen** (`table`): der Tisch, Hintergrund der ganzen Bühne und `theme-color`.
- **Tiefes Petrol** (`table-deep`): Fuß der Seite, Hintergrund der vergrößerten Tafel, Spur des Scrollbalkens.
- **Leinenweiß** (`on-table`): Haupttext auf dem Tisch: Wortmarke, aktueller Abschnitt im Zähler, Knöpfe im Vollbild (7.72:1 auf `table`).
- **Salbei-Grau** (`on-table-2`): Nebentext auf dem Tisch, inaktive Haltepunkte, Grundlinie der Bildfolge mit 40 % Deckkraft (4.89:1 auf `table`).
- **Bilderdruckpapier** (`paper`): alle Innenseiten und der Rahmen um das eingeklebte Coverbild.
- **Papierschatten** (`paper-shade`): Papierkanten des Blockstapels, Unterseite im Eselsohr.
- **Tinte** (`ink`): Titelseite, Tafelnummer in der Bildunterschrift (15.79:1 auf `paper`).
- **Graue Tinte** (`ink-2`): Text der Bildunterschriften und des Kolophons (6.25:1 auf `paper`).

Im dunklen Farbschema des Systems wird nur der Tisch dunkler (`table` #143a3f, `table-deep` #0b2629, `on-table` #dfe9e4, `on-table-2` #9db9b4). Buch und Papier bleiben, wie sie sind: ein Buch ändert im Dunkeln nicht seine Farbe.

### Named Rules
**The One Voice Rule.** Das Buchleinen-Gelb ist außerhalb des Einbands nur Signal: Position in der Bildfolge, Fokus, Hover-Unterstrich. Nie als Fläche auf dem Tisch, nie als Textfarbe.

**The Material Rule.** Jede Fläche ist ein Material: Tischleinen, Buchleinen oder Papier. Eine neue Fläche muss sagen, welches davon sie ist; eine vierte Oberflächenfarbe gibt es nicht.

## Typography

**Display Font:** Bricolage Grotesque (mit system-ui, sans-serif)
**Body Font:** Bricolage Grotesque (mit system-ui, sans-serif)

**Character:** Eine einzige Grotesk mit Charakter, im Titel schmal und schwer wie auf einem Buchrücken der 70er, im Text ruhig und klein wie eine Bildunterschrift. Ziffern sind überall tabellarisch, weil Tafelnummern und Zähler untereinander stehen.

### Hierarchy
- **Einbandtitel** (700, 15.5cqw, Zeilenhöhe 0.86, Laufweite -0.035em, Breite 78, Optik 96): „Fujiventura“ auf dem Einband, die eine `h1`.
- **Titelseite** (700, 19cqw, 0.86, -0.04em, Breite 75, Optik 96): Titel auf der Titelei, darunter ein Satz in 4.2cqw.
- **Wortmarke** (700, 18px, -0.02em, Breite 80): oben links auf dem Tisch.
- **Einstieg** (700, `clamp(56px, 15.5vw, 230px)`, 0.82, -0.035em, Breite 75, Optik 96): „FUJIVENTURA“ in Versalien, Buchstabe für Buchstabe von unten, nur im Einstieg.
- **Bildunterschrift** (400, max(11px, 3.1cqw), 1.375): Nummer in `ink` halbfett, Abstand 2.4cqw, Titel und Zusatz in `ink-2`. Gleiche Größe im Kolophon. Breite höchstens 64 bis 76cqw der Seite.
- **Bedienung** (400, 14px): Tafelzähler, Hinweis „Scrollen zum Blättern“, Knöpfe im Vollbild, Fuß.
- **Haltepunkt-Etikett** (400, 12px): Nummer und Titel über einem Haltepunkt beim Hover.

### Named Rules
**The Container Type Rule.** Alles, was auf einer Seite gedruckt ist, wird in `cqw`/`cqh` der Seite gesetzt, nie in `px` oder `rem`. Das Buch skaliert als Ganzes, die Satzspiegel bleiben gleich. Einzige Untergrenze: Bildunterschriften fallen nie unter 11px.

**The Plate Number Rule.** Zahlen sind tabellarisch und die Tafelnummer steht immer vor dem Titel, halbfett in der dunkleren Farbe. Keine Kameradaten, keine erfundenen Fakten.

## Layout

Die Bühne ist ein Viewport hoch und klebt (`sticky`), darunter liegt eine Scrollspur von etwa 85dvh pro Blatt. Jedes aufgeschlagene Blatt ist ein Rastpunkt (`scroll-snap-type: y proximity`). Oben eine Zeile mit Wortmarke links und Zähler rechts (Seitenrand 16px, ab 768px 32px), in der Mitte das Buch, unten die Bildfolge-Linie (höchstens 680px breit).

Ab 768px wird das Buch als Doppelseite gebunden: Seitenbreite `min((100vw - 64px) / 2, (100dvh - 150px) / 1.3, 700px)`, Seitenformat 1:1.3. Darunter als Einzelseiten: Breite `min(100vw - 24px, (100dvh - 130px) / 1.46)`, Format 1:1.46, jede Tafel mit Unterschrift auf ihrer eigenen Seite.

Der Satzspiegel arbeitet mit großem, ungleichem Weißraum: Bildunterschriften sitzen unten links mit 12cqw Abstand, Hochformate stehen oben mit 8 bis 16cqw Einzug, Querformate mittig. Die Bilder laufen bis an die Papierkante, ohne weißen Rand. Drei Doppelseitentypen wechseln sich ab: eine Tafel randabfallend über die ganze rechte Seite mit der Unterschrift allein auf der Gegenseite; zwei Tafeln, die oben, außen und über den Bund bis an die Kante laufen und unten einen Papierstreifen von 15cqw für ihre Unterschrift lassen; ein Panorama über beide Seiten mit demselben Streifen. Auf dem Telefon läuft jede Hochformat-Tafel oben und seitlich bis an die Kante (Streifen 17cqw), Querformate laufen seitlich bis an die Kante. Randabfallend schneidet ein 2:3-Foto oben und unten etwa 13 % ab; das ganze Bild zeigt die vergrößerte Tafel.

### Named Rules
**The Empty Facing Page Rule.** Eine Tafel darf eine leere Gegenseite haben, die nur ihre Unterschrift trägt. Der Leerraum ist Teil der Erzählung und wird nicht aufgefüllt.

## Elevation & Depth

Tiefe ist physisch, nicht ornamental. Es gibt genau ein Objekt über dem Tisch, das Buch, und sein Licht folgt der Mechanik: Das geschlossene Buch liegt um 16° gekippt und leicht verkleinert, beim Öffnen richtet es sich auf 4° auf. Papierkanten (7px, Streifen aus `paper` und `paper-shade`) wachsen links und schrumpfen rechts mit dem Lesefortschritt.

### Shadow Vocabulary
- **Buch auf dem Tisch** (`box-shadow: 0 28px 50px -18px rgb(4 24 27 / 0.75), 0 6px 14px -6px rgb(4 24 27 / 0.5)`): nur unter dem aufgeschlagenen Teil, Farbe aus dem Petrol abgeleitet, nie neutralschwarz.
- **Eingeklebtes Bild** (`box-shadow: 1px 2px 3px rgb(58 39 6 / 0.35), 0 0 0 0.5px rgb(58 39 6 / 0.2)`): das Coverbild steht minimal vom Leinen ab.
- **Bundwölbung** (Verlauf `rgb(4 24 27 / 0.16)` über `rgb(4 24 27 / 0.05)` bei 30 % zu transparent, 14cqw breit): jede Innenseite dunkelt zum Bund hin.
- **Blattlicht** (Verlauf `rgb(4 24 27 / 0.55)` zu `rgb(4 24 27 / 0.15)`, Deckkraft 0 bis 0.42): die Vorderseite dunkelt beim Aufrichten, die Rückseite hellt beim Ablegen.
- **Biegung** (WebGL-Beleuchtung aus der Flächennormale, flach = 1.0, Glanzlicht auf der Wölbung, Petrol-Schatten auf der Seite darunter): steile Stellen werden dunkler, ohne Kanten oder Fugen.
- **Eselsohr-Loch** (Verlauf `rgb(4 24 27 / 0.28)` an der Falte zu `paper-shade`): die Seite unter der umgeklappten Ecke.
- **Palmenschatten** (Wedel in `rgb(4 24 27)`, Deckkraft 0.12, auf ein Neuntel der Auflösung gezeichnet und hochskaliert): Schatten einer Palme über Tisch und Buch, wiegt sich langsam (9s und 3.1s, `cubic-bezier(0.77, 0, 0.175, 1)`). Liegt unter Kopfzeile und Bildfolge, nie auf Bedienelementen.
- **Sonne** (`soft-light`: oben rechts `rgb(255 205 130 / 0.55)` zu transparent, unten links `rgb(4 24 27 / 0.35)`): Licht von draußen, gleiche Stelle wie der Ansatz der Palme.
- **Vergilbung** (Rand `rgb(196 160 92 / 0.16)` ab 72 % des Seitenradius, dazu feine Papierfaser bei 28 % Deckkraft): das Papier hat ein paar Sommer gesehen.
- **Eselsohr** (`drop-shadow(-3px -3px 5px rgb(4 24 27 / 0.28))`): die Lasche der umgeklappten Ecke.

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
- **Do** `cloth` auf dem Tisch nur für Linien, Balken, Unterstriche und Fokus einsetzen (4.34:1, kein Text).
- **Do** auf Papier den Fokus in `ink` setzen, auf dem Tisch in `cloth`.
- **Do** alles auf einer Seite in `cqw`/`cqh` setzen, Bildunterschriften nie unter 11px.
- **Do** nur `transform`, `opacity` und `clip-path` animieren, Easing `cubic-bezier(0.23, 1, 0.32, 1)` oder `cubic-bezier(0.77, 0, 0.175, 1)`.
- **Do** bei `prefers-reduced-motion` auf Stufen umschalten: Blätter springen, Feder, Einbandhinweis, Eselsohr und Fluganimation entfallen, Rastpunkte aus.
- **Do** Schatten aus Petrol (`rgb(4 24 27)`) oder Prägebraun (`rgb(58 39 6)`) mischen, nie aus neutralem Grau.

### Don't:
- **Don't** Masonry-Raster, Kartengitter oder eine Lightbox ohne Herkunft bauen; Bilder kommen aus dem Buch und kehren dorthin zurück.
- **Don't** Radien verwenden (`0px` überall).
- **Don't** `cloth` als Hintergrund einer Fläche auf dem Tisch oder als Textfarbe einsetzen.
- **Don't** Schatten oder Verläufe auf Bedienelemente legen; Licht gehört dem Papier.
- **Don't** Kameradaten, Brennweiten, Aufnahmedaten oder Fujifilm-Zeichen zeigen.
- **Don't** eine zweite Schrift einführen.

## Tische zum Vergleichen

Neben dem Petrol-Leinen gibt es drei Tische über `?tisch=`: `lava` (Basalt #1b1917, Korn plus Hauch Wolke, warmer Lichtkegel), `kalk` (gekalkte Wand #e8e4dc, feines Korn, Licht von oben rechts) und `sand` (#cdb594). Auf hellen Tischen wird die Marke (Zeitleiste, Fokus) dunkler (`--mark`, ≥ 4.1:1). Einband und Vorsatz bleiben Leinen.
