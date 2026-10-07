# Editor V2: freies Layout auf dem Raster

Simulierter Design-Workshop, 7. Oktober 2026. Grundlage sind die QFD-Ergebnisse (`src/content/qfd.json`), die Marktrecherche (`docs/qfd-marktrecherche.json`), das Buchkonzept (`docs/workshop-konzept.md`) und der Code des Editors V1 (Commit `ee5c2e3`).

**Runde**
- **Mara Lindqvist**, Buchgestaltung (Typografie, Satzspiegel, Raster). Sie war schon beim Buchkonzept dabei.
- **Lena Okafor**, Interaction Design (direkte Manipulation, Touch, Undo, Tastatur, Barrierefreiheit). Auch sie war beim Buchkonzept dabei.
- **Ruth Achterberg**, Engineering-Leitung (Datenmodell, Rendering über `layout.ts` in HTML und Canvas, Aufwand).
- **Michel Leotta**, Gründer und Kunde.

Alle Aussagen sind simuliert. Wo die Runde uneinig blieb, steht **Entscheidung** und dahinter in einem Satz, was verworfen wurde.

---

## 0. Anlass

> **Michel:** „Mir fehlen die Funktionen, die wir aus dem Workshop ableiten wollten. Z. B. mehrere Bilder auf einer Seite platzieren und easy bearbeiten (verkleinern, vergrößern, schneiden). Den Text per Click & Drop auf den Seiten platzieren. Einfach mehr Möglichkeiten.“

Aus dem QFD bringt Michel zwei eigene Sätze mit, die sich widersprechen:
- S7: „Eigentlich mag ich das feste Raster ja […]. Und trotzdem will ich manchmal ein Foto einfach frei irgendwo hinsetzen. Ich weiß, das beißt sich.“
- S11: „Ich will nicht hundert Klicks für eine Doppelseite. Wenn ich zehn Varianten durchklicken muss, bis eine passt, stimmt was nicht.“

---

## 1. Gap-Analyse: was der Editor V1 heute nicht erfüllt

Ist-Zustand in Kürze: Eine Doppelseite ist `SpreadDraft = { keys (1–2 Fotos), layout (Index in variantsOf), pinned, text }`. Ihre Form ergibt sich aus einer festen Variante (T1–T7). Bearbeitet wird auf Miniaturen mit 132 bis 150px Seitenbreite. Ein Klick auf eine Seite wählt das ganze Foto. Den Ausschnitt stellt ein modaler Dialog ein, und er gilt **pro Foto**, nicht pro Platzierung.

| ID | Anforderung (Kano, Bedeutung) | Heute im Code | Lücke |
|---|---|---|---|
| **K8** (O, 4) | Fotos und Seiten frei umstellen, einfügen, entfernen | Fotos lassen sich über Seitengrenzen verschieben (`movePhoto`). Pro Doppelseite passen **höchstens 2 Fotos**, sonst wird das letzte verdrängt. Eine leere Bild-Doppelseite lässt sich nicht einfügen, nur eine Textseite. | Es gibt keine Seite mit 3 oder mehr Fotos und keine Position innerhalb der Seite. Beim Verschieben setzt `movePhoto` auf Quelle und Ziel `layout: 0` zurück, die Quellseite ändert sich also ungefragt mit. |
| **K9** (A, 2) | Ruhige Ordnung, die man bewusst brechen darf | Es gibt nur die Varianten aus `variants()`. | Das Raster lässt sich weder nutzen noch brechen. Weder Snap noch Ausnahme sind möglich (F20 ist offen). |
| **K10** (O, 4) | Wenige Handgriffe, sofort finden | Der Knopf „Layout“ schaltet blind durch bis zu 6 Varianten. | Das ist genau S11 und S49 („zehn Layouts durchklicken“). Bearbeitet wird auf 150px-Miniaturen, man sieht nicht, was man trifft. |
| **K11** (M, 2) | Ausschnitt selbst bestimmen, Seitenverhältnis respektiert | `CropDialog`: Fokus ziehen, Zoom 1–3×, „ganz zeigen“, Motivpunkt mit Warnung | (a) Er ist modal und nicht auf der Seite. (b) Der Ausschnitt hängt am Foto (`StoredPhoto.focus/zoom`), und `layoutPage` nutzt ihn auch für den **Einband**: Wer das Foto für ein hohes Feld beschneidet, verschiebt damit den Einband mit. (c) Die Feldform ist nicht wählbar (T6 Punkt 6). Ein Querformat im Hochformatfeld bleibt Beschnitt (S61). |
| **K13** (O, 1) | Ein paar Sätze, die genau so stehen bleiben | Es gibt nur ganze Textseiten (Überschrift + Absatz, 2 Stile, feste Breite 66cqw). Das Foto daneben steht immer auf der Gegenseite. | Text lässt sich nicht auf eine Bildseite setzen, und es gibt keinen Rahmen und keine Lage. Der Umbruch wird dreimal verschieden berechnet: CSS im HTML, `wrap()` mit `measureText` in der Textur, `estimateLines` für „passt?“. Damit kann T11 schon an seiner Gültigkeitsbedingung scheitern („ungültig, wenn der Umbruch abweicht“). Auch S76 der Gestalterin trifft zu. |
| **K4** (M, 5) | Was ich entschieden habe, bleibt | `pinned`, `relayoutFree` lässt Fixiertes in Ruhe | **Formatsprung:** `relayout()` setzt bei jedem Upload, jedem Stern und jedem „Ins Buch“ `aspect: aspectFor(photos)` neu. Kippt der Durchschnitt von 2:3 auf 3:4, ändern sich Satzspiegel und Feldformen **aller** Seiten, auch der fixierten (T4 > 0). Für freies Layout ist das der kritischste Punkt. |
| **K5** (A, 3) | Verstehen, warum ein Foto dort steht | nichts | Es gibt kein „Warum hier?“ (F9). Für V2 ist es nur indirekt relevant, nämlich für Vorschläge. |
| **K22** (O, 4) | Ehrliche Vorschau (Falz, Beschnitt) | Die Warnungen erscheinen nur im Ausschnitt-Dialog. | Auf der Seite gibt es keine Falz-Zone und keine Warnung. |

**Freiheitsgrade T6** (QFD-Ist: 3 von 8, Ziel 7 von 8 „bewusst ohne pixelfreies Platzieren“). Mit V1 sind 5 erreicht: Seite, Feld (über die Variante), Wichtigkeit, Ausschnitt-Position und Zoom. Es fehlen (6) Feldform, (7) Anschnitt nach eigener Wahl und (8) die Raster-Ausnahme.

**Nebenbefund, gehört nicht zu V2:** Das Bildverzeichnis (`layoutPage`, `index`) fasst bei 2:3 nur 30 Daumen (5 Zeilen × 6) und bei 3:4 nur 24. Der Editor erlaubt aber 60 Fotos, darüber läuft das Verzeichnis aus der Seite. Mit Mehrbildseiten wird das häufiger.

---

## 2. Diskussion und Ergebnis: Interaktionsmodell

### 2.1 Wo bearbeitet wird

**Lena:** Auf 150px kann niemand einen Griff treffen. Eine Seite braucht eine Bühne: Klick auf eine Doppelseite öffnet sie groß, auf dem Desktop etwa 1000px breit wie beim Lesen, auf 375px eine Seite nach der anderen, wischen wechselt die Seite. Die Übersicht bleibt fürs Sortieren.
**Ruth:** Die Bühne rendert mit derselben `PageView`. Darüber liegt eine eigene Bearbeitungsebene mit Trefferflächen, die aus denselben Boxen gerechnet wird. Die heutigen `absolute inset-0`-Knöpfe pro Seite fallen auf der Bühne weg.
**Mara:** Auf der Bühne sieht man die Falz-Zone und auf Wunsch das Raster. Sonst ist sie ruhig, ohne Werkzeugleiste über der Seite.

**Ergebnis:** Die Übersicht dient der Folge (sortieren, Fotos zwischen Doppelseiten ziehen). Die **Bühne** dient der Seite (Lage, Größe, Ausschnitt, Text). `Esc` oder „Zur Übersicht“ führt zurück. Die Werkzeuge sitzen in der Seitenleiste und im Kontextmenü (Rechtsklick oder langes Drücken), so wie es die QFD-Notiz zum Dach T6/T7 empfiehlt: Kontextmenü statt Werkzeugleiste.

### 2.2 Mehrere Bilder pro Seite: frei oder Raster

**Michel:** „Ich will ein Foto einfach hinsetzen, wo ich will.“
**Mara:** Dann sieht dein Buch aus wie CEWE. Die Ruhe deiner beiden Bände kommt aus 6 Spalten und 9 Zeilen im Satzspiegel. Kleine Bilder stehen auf Rasterlinien, nie mittig. Ich will, dass im Datenmodell nur Rasterzellen stehen: Spalte, Spaltenzahl, Zeile, Zeilenzahl.
**Lena:** Zellen allein reichen nicht. Randlos (T1), Querformat über die Seitenbreite (T4) und hohes Format am Bund (T7) enden an der Seitenkante, nicht am Satzspiegel. Und Michel bricht das Raster sonst eben mit einem Trick. Mein Vorschlag: Einrasten als Standard, Ausnahme nur bewusst.
**Ruth:** Gespeichert werden Koordinaten, nicht Zellen. Einrasten ist ein Verhalten des Editors, kein Datentyp. Sonst brauchen wir für jede Kante einen eigenen Ankertyp (Raster, Seitenkante, Bund) und für die Ausnahme ein zweites Modell. Koordinaten bilden alle sieben Seitentypen ab, auch das Bild über den Bund, das heute mit `x: -100, w: 200` arbeitet.
**Mara:** Dann verrutscht alles vom Raster, sobald sich das Seitenformat ändert.
**Ruth:** Darum frieren wir das Format ein, siehe 3.3. Ein Format, das sich unter fixierten Seiten ändert, ist ohnehin ein K4-Fehler, auch ohne freies Layout.

**Entscheidung: Rasterzellen mit Snap am Satzspiegel, gespeichert als Seitenkoordinaten.** Verworfen ist das freie Platzieren als Standard, weil es die Ordnung zerstört, auf der die Qualität des Erstentwurfs beruht (Dach T6/T3 „−“, QFD-Ziel T6 „ohne pixelfreies Platzieren“, S77). Verworfen sind auch reine Rasterzellen im Modell, weil Anschnitt und Bund-Formen damit nicht ausdrückbar sind.

Einrastziele, in dieser Rangfolge:
1. Spalten- und Zeilenlinien des Rasters: 6 Spalten mit 2cqw Fuge, 9 Zeilen mit 2cqw Fuge. Bei 2:3 ist eine Zeile ≈ 11,9cqw hoch, bei 3:4 ≈ 10,4cqw.
2. Seitenkanten und Bund. Eine Kante dort heißt randlos.
3. Kanten anderer Elemente auf derselben Seite oder Doppelseite.
4. **Nicht** die Seitenmitte, weil Mara keine zentrierten Bilder will.

Der Schwellwert liegt bei 8 CSS-px am Bildschirm, nicht in cqw, damit Einrasten auf 375px genauso greift wie auf 1440px.

**Ausnahme:** Wer beim Ziehen `Alt` hält oder am Touchgerät im Kontextmenü „Frei setzen“ wählt, schaltet das Einrasten für dieses Element ab. Das Element bekommt `offGrid: true` und auf der Bühne ein kleines Zeichen „außerhalb des Rasters“. Das ist F20 in der leichten Form: eine bewusste Handlung, die nie als Vorschlag kommt und nie getadelt wird.
Grenzen pro Seite: höchstens **4 Fotos**, Bilder überlappen nicht, und Text liegt nie auf einem Foto. Das Buchkonzept sagt unter „Kommt nicht“: Text auf Fotos.

### 2.3 Größe ändern über Griffe

**Lena:** Acht Griffe, sichtbar 8×8px, Trefffläche 24×24px mit Maus und 44×44px bei Touch (`pointer: coarse`). Ziehen an einer Ecke ändert Breite und Höhe, an einer Kante nur eine Richtung. `Shift` hält das aktuelle Seitenverhältnis.
**Mara:** Eine Rahmengröße frei zu ziehen heißt, den Beschnitt zu ändern. Das Originalformat muss deshalb ein Magnet sein: Kommt die Rahmenform in die Nähe von 2:3, 3:2, 3:4 oder 9:16 des Fotos, rastet sie dort ein, und an der Box steht klein „Original 2:3“.
**Ruth:** Das Foto bleibt dabei `cover` mit Fokus und Zoom des Elements. Es wird nie verzerrt. Damit ist auch K11 erfüllt: „mein Seitenverhältnis bleibt respektiert“.
**Lena:** Beim Ziehen zeigt die Seite nur eine Vorschau, und gespeichert wird erst beim Loslassen: **eine Geste ist ein Rückgängig-Schritt**. Heute würde jedes `pointermove` über `update()` laufen, Speichern und Rückgängig-Stapel inklusive.

**Ergebnis:** Griffe wie oben, Originalformat als Magnet, Einrasten an allen bewegten Kanten. Die Mindestgröße ist 1 Spalte × 1 Zeile, damit weder Daumenbilder noch Briefmarken entstehen.

### 2.4 Zuschneiden direkt auf der Seite

**Lena:** Doppelklick aufs Foto, `Enter` oder am Touchgerät der Eintrag „Ausschnitt“ im Kontextmenü startet den Ausschnitt-Modus. Das ganze Foto erscheint über den Rahmen hinaus mit 35 % Deckkraft. Ziehen verschiebt das Foto im Rahmen, Mausrad, Pinch oder die Griffe am Foto ändern den Zoom, und der Rahmen bleibt stehen. `Enter`, `Esc` oder ein Klick daneben beendet den Modus.
**Mara:** Der Motivpunkt und die Warnungen aus `CropDialog` bleiben: Gesicht angeschnitten, Motiv im Falz. Auf der Bühne sieht man den Falz ohnehin.
**Ruth:** Der Ausschnitt gehört dann zur **Platzierung**, nicht zum Foto. Sonst zieht das Beschneiden auf Seite 7 den Einband mit, und beim Verschieben in ein anderes Feld passt der alte Ausschnitt nicht mehr. Der Ausschnitt am Foto bleibt nur als Startwert für automatische Seiten und den Einband. Die Rechnung (Lage = Fokus × (Feld − Bild × Zoom)) steht heute dreimal da, in `crop-dialog.tsx`, `page-view.tsx` und `page-texture.ts`. Sie kommt in eine Funktion.
**Michel:** „Und rauszoomen?“ (S4)
**Mara:** „Ganz zeigen“ (`contain`) bleibt. Besser ist meist ein Rahmen im Originalformat, dafür gibt es den Magneten.

**Entscheidung: Ausschnitt pro Platzierung, Bearbeitung auf der Seite.** Für Paket 1 öffnet der Doppelklick noch den vorhandenen Dialog mit der Rahmenform des Elements. Erst Paket 2 bringt den Modus auf der Seite. Verworfen ist es, den Ausschnitt am Foto zu lassen, weil er Einband und Mehrfachplatzierung koppelt.

### 2.5 Text als Rahmen per Drag aus einer Palette

**Michel:** „Den Text per Click & Drop auf den Seiten platzieren.“
**Lena:** Dazu eine Palette in der Seitenleiste mit drei Steinen: **Überschrift**, **Absatz**, **Notiz**. Es gibt drei Wege, die zum selben Ergebnis führen:
1. den Stein auf die Seite ziehen,
2. den Stein antippen und dann auf die Seite tippen (Touch, Ein-Finger-Bedienung),
3. den Stein mit `Enter` wählen. Dann landet der Text in der ersten freien Rasterzelle der aktiven Seite (Tastatur und Screenreader).

Danach ist der Rahmen sofort im Schreibmodus.
**Mara:** Der neue Rahmen ist 3 Spalten breit und rastet an Spaltenlinien ein. Er hängt links oder rechts, zentriert gibt es nicht. Die Breite bestimmt man selbst, die Höhe folgt dem Text. Er liegt nie auf einem Foto, und auf randlosen Seiten gibt es deshalb keinen Text. Läuft Text unten aus dem Satzspiegel, zeigt die Seite das an. Gekürzt wird nie von selbst.
**Michel (S76 für die Gestalterin):** „Zeilenabstand und Laufweite will die Gestalterin einstellen.“
**Mara:** Nein, keine Regler, sondern drei gesetzte Stile, dazu bei Absatz und Notiz eine Größe S/M. Dass ihr der Umbruch wegspringt, ist das eigentliche Problem. Die Regler sind es nicht.
**Ruth:** Den Umbruch rechnen wir **einmal**, mit `measureText` auf einem Canvas und derselben Schrift. `layout.ts` legt die fertigen Zeilen ins Element. Das HTML setzt diese Zeilen mit `white-space: pre`, die Textur zeichnet sie. So bricht beides per Konstruktion gleich um, und `estimateLines` fällt für freie Rahmen weg. Getippt wird in einer `textarea`, die genau über dem Rahmen liegt, mit gleicher Schrift, Größe und Zeilenhöhe. Ein `contentEditable` kommt nicht infrage, weil es Formatierung einschleppt. Kopieren und Einfügen nimmt nur reinen Text (albelli-Schmerz).
**Lena:** Getippter Text wird zu einem Rückgängig-Schritt pro Pause zusammengefasst, das gibt es mit `tag` schon.

**Entscheidung: drei Stile ohne freie Regler, Rahmenbreite auf dem Raster, Höhe folgt dem Text.** Verworfen sind Zeilenabstand und Laufweite als Regler (S6, S75 „Kitsch“, K10) und Text auf Fotos (Buchkonzept). Ob es dabei bleibt, ist die offene Frage 1.

### 2.6 Ausrichtungshilfen und Hilfslinien

**Lena:** Die Marktrecherche ist eindeutig. ifolor nervt mit falschen „grünen Linien“, Mixbook mit enttäuschendem Snapping. Eine Hilfslinie, die lügt, ist schlimmer als keine.
**Ergebnis:**
- Beim Ziehen erscheint das Raster mit 6 Spalten und 9 Zeilen als 1px-Linien in `ink` bei 12 % Deckkraft, und der Satzspiegel ist umrandet.
- Die Linie, an der gerade eine Kante einrastet, wird 1px in `mark` gezeigt. Es gibt nur echte Treffer, keine Vorschläge.
- Bei gleichen Abständen zwischen drei Elementen erscheinen zwei kurze Marken.
- `G` blendet das Raster dauerhaft ein oder aus. Das wird im Gerät gemerkt (localStorage), nicht im Buch.
- Die Falz-Zone (±3cqw am Bund) ist auf der Bühne immer als leichte Schraffur sichtbar.

### 2.7 Ebenen

**Lena:** Ich will `⌘]` und `⌘[` für nach vorn und nach hinten.
**Mara:** Wenn Bilder nicht überlappen und Text nie auf einem Bild liegt, gibt es nichts zu stapeln.
**Ruth:** Die Reihenfolge im Array ist die Ebene, das kostet nichts. Ein Ebenen-Panel baue ich nicht.

**Entscheidung: kein Ebenen-Panel.** Überlappung gibt es nur bei Elementen mit `offGrid`. Dann gelten `⌘]` und `⌘[` sowie die Einträge „Nach vorn“ und „Nach hinten“ im Kontextmenü. Verworfen ist ein Panel, weil es S37 („so viele Knöpfe“) widerspricht, und das für einen Fall, den die Regeln fast ausschließen.

### 2.8 Mehrfachauswahl

**Lena:** Mit `Shift`-Klick oder einem Rahmen, den man auf leerem Papier aufzieht. Gemeinsam gehen: verschieben, löschen (Fotos in die Ablage), Kanten angleichen (oben, unten, Außenkante, Bundkante), gleiche Größe, gleiche Abstände. Am Touchgerät öffnet langes Drücken das Kontextmenü mit „Mehrere wählen“, danach fügt jedes Antippen hinzu.
**Ruth:** Das ist Aufwand M und für die Kernaufgabe nicht nötig. Es kommt in Paket 4.
**Michel:** „Damit kann ich leben, wenn die Vorschläge die Grundaufteilung machen.“

### 2.9 Tastatur, Screenreader, Touch

| Aktion | Tastatur (Bühne) | Touch |
|---|---|---|
| Element wählen | `Tab` / `Shift+Tab` in Lesereihenfolge (oben links nach unten rechts) | antippen |
| Verschieben | Pfeile: 1 Raster-Einheit (Spalte bzw. Zeile); `Alt`+Pfeil: 0,5cqw, setzt `offGrid` | gewähltes Element mit einem Finger ziehen |
| Größe | `Shift`+Pfeil: rechte bzw. untere Kante um 1 Einheit | Griffe (44px) |
| Ausschnitt | `Enter`; darin Pfeile zum Verschieben, `+`/`−` zum Zoomen | Kontextmenü „Ausschnitt“, dann Pinch und Ziehen |
| Text schreiben | `Enter` auf einem Textrahmen | antippen, wenn gewählt |
| Auf die Nachbarseite | `⌘⇧←` / `⌘⇧→` (heute `Alt`+Pfeil, das braucht jetzt die Feinbewegung) | ziehen auf die Seitenleiste mit den Doppelseiten |
| Entfernen | `Entf` (Foto in die Ablage, Text löschen) | Kontextmenü |
| Zurück | `Esc`: erst Modus verlassen, dann Auswahl aufheben, dann zur Übersicht | Knopf „Zur Übersicht“ |

- Jedes Element auf der Bühne ist ein Knopf mit Namen und Lage, z. B. „Foto 3, Palme, Spalte 1 bis 3, Zeile 1 bis 4, randlos oben“. Nach jeder Änderung meldet eine Live-Region kurz: „Auf Spalte 4 verschoben“.
- Ein Finger auf leerem Papier scrollt die Seite und verschiebt nichts. Verschoben wird nur, was vorher gewählt war. Das schützt vor versehentlichem Ziehen beim Scrollen. Zwei Finger zoomen die Bühne, im Ausschnitt-Modus das Foto.
- Bei `prefers-reduced-motion` gibt es kein Nachfedern beim Einrasten, die Elemente springen.
- Rückgängig und Wiederholen bleiben wie heute (`⌘Z`, `⇧⌘Z`, Kopfzeile). Jede Geste ist ein Schritt, und Zwischenstände (`snapshot`) entstehen vor „Vorschlag anwenden“ und „Automatisch gestalten“.

### 2.10 Automatik und Handarbeit

**Michel:** „Ich will beides: dass es von selbst gut aussieht und dass ich überall reingreifen kann.“
**Ruth:** Das geht ohne zweites System. Jede heutige Variante lässt sich in freie Elemente umrechnen: `layoutPage` liefert für jede Variante Boxen in cqw, und daraus werden Seitenkoordinaten. Der erste Handgriff auf der Bühne **materialisiert** die Doppelseite. Sie ist danach frei gestaltet, sieht exakt so aus wie vorher und ist fixiert. Alte Bücher bleiben unverändert, bis jemand hineingreift.
**Lena:** Den Knopf „Layout“ mit blindem Durchschalten ersetzen wir durch eine Reihe von **Vorschlägen**: 3 bis 6 kleine Seitenbilder für genau die Fotos dieser Doppelseite, sichtbar nebeneinander. Ein Klick wendet einen an (S11, S49).
**Mara:** Die Vorschläge kommen aus einem kleinen Vorrat an Rasteraufteilungen für 1 bis 4 Fotos pro Seite, unterschieden nach Hoch- und Querformat. Es gibt kein Kitsch und keine Rahmen. Die heutigen T1 bis T7 sind die Vorschläge für 1 Foto pro Seite.
**Ruth:** „Automatisch gestalten“ bleibt, wie es ist: Frei gestaltete Doppelseiten sind fixiert, `relayoutFree` fasst sie nicht an. Neu ist ein Eintrag pro Doppelseite: „Auf Vorschlag zurücksetzen“. Er verwirft die Handarbeit nur dieser Doppelseite (mit Zwischenstand) und löst die Fixierung.
**Michel:** „Und wenn ich ein Foto aus der Ablage auf eine volle freie Seite ziehe?“
**Lena:** Liegt eine Rasterzelle frei, landet es dort, wo man es loslässt. Ist die Seite voll (4 Fotos) oder kein Platz frei, kommt ein Hinweis mit zwei Wegen: „Platz machen“ wendet den passenden Vorschlag für ein Foto mehr an, „Tauschen“ ersetzt das Foto unter dem Finger. Nichts passiert ungefragt.

**Entscheidung: Materialisieren statt zweier Welten, Vorschläge statt Durchschalten, frei gestaltet heißt fixiert.** Verworfen ist eine Automatik, die freie Seiten „sanft nachbessert“, weil das T4 > 0 bedeutet (S1, S2).

---

## 3. Datenmodell

### 3.1 Typen

Seitenkoordinaten in Prozent: `x` und `w` in % der Seitenbreite, `y` und `h` in % der Seitenhöhe, alle Werte von 0 bis 100. Werte außerhalb sind erlaubt, z. B. `x = -100` für die rechte Hälfte eines Bildes über den Bund, wie heute bei `across`.

```ts
// src/lib/auto-sequence.ts (bzw. eigenes Modul src/lib/free-layout.ts)

/** Box auf einer Seite, in % von Seitenbreite (x, w) und Seitenhöhe (y, h) */
export type Box = { x: number; y: number; w: number; h: number };

/** Ausschnitt einer Platzierung; dieselbe Rechnung für HTML, Textur und Ausschnitt-Modus */
export type Crop = { focus: [number, number]; zoom: number; fit: "cover" | "contain" };

type ItemBase = {
  id: string;
  box: Box;
  /** bewusst ohne Einrasten gesetzt (Raster-Ausnahme, F20) */
  offGrid?: true;
};

export type PhotoItem = ItemBase & {
  t: "photo";
  key: string;
  /** fehlt er, gilt der Ausschnitt des Fotos (Startwert) */
  crop?: Crop;
  /** auto: Unterschrift an der Außenkante unter dem Bild, sonst in der Kopfzeile */
  caption: "auto" | "off";
  /** nur bei einem Bild über den Bund: beide Hälften tragen dieselbe pairId und bewegen sich gemeinsam */
  pairId?: string;
};

export type TextRole = "heading" | "body" | "note";
export type TextItem = ItemBase & {
  t: "text";
  text: string;
  role: TextRole;
  size: "s" | "m";
  /** Kante, an der der Rahmen hängt; zentriert gibt es nicht */
  align: "left" | "right";
  // box.h ist die vom Satz gemessene Höhe, nur zur Kollision und Warnung gespeichert
};

export type Item = PhotoItem | TextItem;

/** Eine frei gestaltete Seite; die Reihenfolge der Items ist die Ebene */
export type PageDraft = { items: Item[] };

export type SpreadDraft = {
  id?: string;
  /** alle Fotos der Doppelseite; bei freien Seiten aus den Items abgeleitet (syncKeys) */
  keys: string[];
  layout: number;
  pinned?: boolean;
  text?: SpreadText;
  /** frei gestaltet: hat Vorrang vor layout und text, gilt immer als fixiert */
  pages?: [PageDraft, PageDraft];
};

// src/lib/store.ts
export const SCHEMA = 3;
export type StoredBook = {
  // … wie heute
  /** gesetzt, sobald eine Doppelseite frei gestaltet ist: aspect ändert sich dann nicht mehr von selbst */
  aspectLocked?: boolean;
};
```

**Invarianten** (eine Funktion `normalize(spread)` hält sie, Tests prüfen sie):
- `pages` gesetzt ⇒ `keys` = Fotos aller Items, und `pinned` gilt als wahr.
- Ein Foto steht höchstens einmal im Buch, wie heute. Die einzige Ausnahme sind die beiden Hälften eines Bildes über den Bund mit gleicher `pairId`.
- Pro Seite höchstens 4 `PhotoItem`.
- Ohne `offGrid` liegt jede Kante auf einer Rasterlinie, einer Seitenkante oder dem Bund.

### 3.2 Migration vom heutigen SpreadDraft

- **Schema 2 → 3:** keine Datenänderung, weil `pages` und `aspectLocked` optional sind. `migrate()` hebt nur `schema`. Alte Bücher und alte Versionen im Verlauf öffnen pixelgleich.
- **Materialisieren beim ersten Handgriff:** `materialize(spread, data, i)`
  1. nimmt die aktuelle Variante `variantsOf(s)[s.layout]` und die schon gebaute Doppelseite aus `toBookData`,
  2. ruft für jede Seite `layoutPage(data, page, side)` auf,
  3. macht aus jedem `img` mit `plate: true` ein `PhotoItem`: Box von cqw in Prozent, also `y% = y / H × 100`, dazu `crop` aus dem Foto und `caption: "auto"`; ist die Seite `full` oder `across`, wird `caption: "off"` gesetzt,
  4. macht eine Textseite zu `TextItem`s (Überschrift → `heading`, Text → `body`),
  5. setzt `pages`, `pinned` und `book.aspectLocked = true`.

  Die Doppelseite sieht danach exakt so aus wie vorher. Der Prüftest ist ein Pixelvergleich vorher/nachher.
- **`blank` (T6):** Die leere Seite trägt heute die Unterschrift der Gegenseite. Beim Materialisieren wird daraus `caption: "auto"` am Foto der Gegenseite, und der Satz stellt sie auf die leere Seite, wenn diese leer ist. Diese Sonderregel steht in `layout.ts`, nicht im Datenmodell.
- **`across` (T5):** Daraus werden zwei `PhotoItem`s mit demselben `key`, eines pro Seite, links mit `x: 0, w: 200` und rechts mit `x: -100, w: 200`, `pairId` gleich. Das ist die einzige erlaubte Doppelplatzierung, und der Editor bewegt beide Hälften gemeinsam. *(Alternative für Paket 6: Elemente auf Doppelseiten-Ebene. Für Paket 1 verworfen, weil die Einzelseiten am Telefon dann geteilt werden müssten.)*

### 3.3 Format einfrieren

`relayout()` ruft `aspectFor()` nur auf, solange `!aspectLocked`. Danach ändert sich das Format nur durch ausdrückliche Wahl. Wer das Format dann wechselt, bekommt einen Zwischenstand und ein **Neu-Einrasten**: Jede Kante, die auf einer Rasterlinie oder Seitenkante lag, wird in der neuen Geometrie auf dieselbe Linie gesetzt. Die übrigen Kanten skalieren mit. Damit ist Maras Einwand gelöst, ohne Rasterzellen zu speichern. Unabhängig vom freien Layout behebt das auch den heutigen K4-Fehler (Formatsprung).

### 3.4 Rendern über `layout.ts` und `page-texture.ts`

Die freie Seite wird ein neuer Seitentyp. HTML und Textur bleiben eine einzige Elementliste.

```ts
// src/content/books.ts
export type FreeEl =
  | { t: "photo"; no: number; box: Box; crop?: Crop; caption: "auto" | "off"; offGrid?: true }
  | { t: "text"; text: string; role: TextRole; size: "s" | "m"; align: "left" | "right"; box: Box };
export type Page = /* … */ | { kind: "free"; items: FreeEl[] };
export type Spec = /* … */ | { kind: "free"; items: Item[] };
```

- **`build()`:** Im Fall `free` werden die Foto-Items nach Lesereihenfolge sortiert (y, dann x, mit 2 % Toleranz), dann ergibt `noOf(key)` die Tafelnummern. Die Nummern lesen sich auf einer Mehrbildseite also von oben links nach unten rechts. `platesOf` nimmt die Nummern freier Seiten mit. Die Einzelseiten fürs Telefon übernehmen `free` unverändert.
- **`toBookData()`:** `s.pages ? [free(s.pages[0]), free(s.pages[1])] : vs[s.layout]`.
- **`layoutPage()`, Fall `free`:** Er erzeugt nur Element-Typen, die es schon gibt:
  ```ts
  case "free": {
    const els: El[] = [];
    for (const it of page.items) {
      const b = { x: it.box.x, w: it.box.w, y: (it.box.y / 100) * H, h: (it.box.h / 100) * H };
      if (it.t === "photo") {
        els.push({ t: "img", no: it.no, ...b, ...(it.crop ?? view(book, it.no)), plate: true });
        const cap = it.caption === "auto" ? autoCaption(b, side, ta, H, page.items) : null; // unter dem Bild, Außenkante, sonst null
        if (cap) els.push(cap);
      } else els.push(setText(it, b)); // fertige Zeilen, siehe unten
    }
    return paper(els);
  }
  ```
  `autoCaption` setzt die Unterschrift wie heute an die Außenkante, 3cqw unter das Bild, sofern bis zur Seitenkante Platz ist und dort kein anderes Element liegt. Sonst gibt es keine Unterschrift auf der Seite, und die Kopfzeile zeigt sie, so wie `captionless` es heute für T1 und T5 macht. `captionless(page)` gilt deshalb bei `free`, wenn kein Foto eine Unterschrift auf der Seite hat.
- **`page-texture.ts`:** Für Bilder und Unterschriften ändert sich nichts, weil `drawLayout` `img` und `caption` schon mit Fokus, Zoom und `contain` zeichnet. Für Text bekommt `El` ein Feld `rows?: string[]`. Ist es gesetzt, zeichnen Textur und HTML genau diese Zeilen (`white-space: pre`). `setText` erzeugt die Zeilen mit einem Canvas-`measureText` in derselben Schrift, Stärke, Größe und Breitenachse. Die Wortfuge bleibt `wrap()`, die Funktion zieht nur von der Textur nach `layout.ts` um.
  *Einschränkung:* Beim statischen Export gibt es auf dem Server kein Canvas. Freie Textrahmen kommen nur in hochgeladenen Büchern vor, und die rendert der Client aus Firestore. Michels feste Bücher brauchen `rows` nicht. Für den Server bleibt `estimateLines` als Rückfall, mit Neuberechnung nach dem Hydrieren.
- **Ausschnitt:** Eine Funktion `cropRect(box, img, crop)` in `layout.ts` liefert die Bildlage. `page-view.tsx` (CSS `object-position` plus `scale`) muss zur Textur passen, und Ausschnitt-Modus sowie Dialog nutzen sie direkt.
- **Bearbeitungsebene:** Die Bühne setzt über `PageView` eine eigene `EditLayer`. Sie rechnet die Trefferflächen aus denselben Boxen (`b` oben) und kennt Raster, Satzspiegel und Falz aus `typeArea()` plus der neuen Funktion `gridLines(book, side)` in `books.ts`, die 6 Spalten- und 9 Zeilenlinien liefert.
- **WebGL:** Es gibt keine Änderung. Eine freie Seite ist für `drawPage` eine Seite wie jede andere, und die Grenze von drei Doppelseiten-Texturen bleibt.
- **Größe in Firestore:** 60 Fotos mit je ~120 Byte pro Item ergeben unter 10 KB zusätzlich, weit unter der Grenze von 1 MB pro Dokument. Stabile `id`s pro Item sind schon die Voraussetzung für spätere Zusammenführung zu zweit (F19).

---

## 4. Feature-Liste V2

Reihenfolge nach Nutzen für Michels Satz („mehrere Bilder, verkleinern, vergrößern, schneiden, Text per Click & Drop“) und nach QFD-Gewicht (T6 ≈ 387, T11 ≈ 254, T7 und T9 je ≈ 175–190). Bedingung für alle Pakete: T4 bleibt 0.

### Paket 1: Freie Seite mit mehreren Fotos (Aufwand M, in einem Durchgang baubar)

**Nutzen:** Erfüllt den Kern von K8 und K11 (Feldform). T6 steigt auf 6 von 8. Die Aufgaben „Layout wechseln“ und „Foto groß machen“ werden direkt lösbar (T7). Der Formatsprung (K4) ist behoben.

**Umfang:**
- Schema 3, `Box`/`PhotoItem`/`PageDraft`, `aspectLocked`, `normalize`, `materialize`.
- `Page`/`Spec` `free`, `build()` mit Nummern in Lesereihenfolge, `layoutPage` Fall `free` mit `autoCaption`, `gridLines()`.
- Bühne: Doppelseite groß, am Telefon eine Seite. Der erste Handgriff materialisiert, die Doppelseite gilt dann sofort als fixiert.
- Wählen, Ziehen und 8 Griffe mit Einrasten an Raster, Seitenkante, Bund und Nachbarkanten, Originalformat als Magnet. Raster und Einrastlinie sind beim Ziehen sichtbar.
- Ein Foto aus der Ablage oder aus der Liste der Doppelseiten auf die Bühne ziehen: Es landet in der Rasterzelle unter dem Zeiger, höchstens 4 pro Seite, eine volle Seite meldet sich mit Hinweis. `movePhoto` lässt bei freien Seiten das Layout der Quelle in Ruhe.
- Doppelklick oder `Enter` öffnet den **vorhandenen** `CropDialog` mit der Rahmenform des Elements, das Ergebnis geht nach `item.crop`.
- Tastatur aus 2.9 (ohne Ausschnitt-Modus), Live-Region, eine Geste ist ein Rückgängig-Schritt.
- „Auf Vorschlag zurücksetzen“ pro Doppelseite.
- Nicht drin: Textrahmen, Ausschnitt auf der Seite, Mehrfachauswahl, Vorschlagsreihe, `offGrid`.

**Akzeptanzkriterien:**
1. Eine Seite mit 3 Fotos ist ab „Doppelseite öffnen“ in höchstens 6 Interaktionen fertig (T7-Zählweise).
2. Nach dem Loslassen liegt jede Kante auf einer Rasterlinie, einer Seitenkante oder dem Bund. Ein Eigenschaftstest prüft das mit 500 zufälligen Gesten.
3. HTML (`PageView`) und Textur (`drawPage`) sind deckungsgleich. Bei 500px Seitenbreite weichen die Bildkanten höchstens 1px ab, geprüft per Pixelvergleich auf 10 Testseiten.
4. Materialisieren ändert nichts Sichtbares: Pixelvergleich vorher/nachher für alle Varianten aus `variants()` und `textVariants()`.
5. T4-Test: 20 Entscheidungen setzen, 100 zufällige Bearbeitungen an anderer Stelle, dazu „Automatisch gestalten“, Fotos hochladen und Sterne setzen. Danach 0 Unterschiede an freien Seiten und 0 Formatwechsel.
6. Jede Ziehen- oder Griff-Geste ist genau ein `⌘Z`-Schritt.
7. Nur mit Tastatur lässt sich ein Foto wählen, um 2 Spalten verschieben, um 1 Zeile vergrößern und in die Ablage legen. Der Screenreader nennt dabei Name und Lage.
8. Bei 375px zeigt die Bühne eine Seite, die Griffe haben 44px Trefffläche, und nichts scrollt horizontal. Ein Wisch auf leerem Papier verschiebt nichts.
9. Bücher mit Schema 2 und alte Versionen öffnen unverändert.

### Paket 2: Ausschnitt direkt auf der Seite (M)

**Nutzen:** K11 und T9, Michels größtes Problem (S4). Ersetzt den Modal-Dialog.
**Umfang:** Ausschnitt-Modus aus 2.4, `cropRect` als einzige Rechnung, Motivpunkt und Warnungen (Gesicht angeschnitten, im Falz) direkt auf der Bühne, Pinch, `+`/`−`. Der Dialog bleibt nur als Rückfall.
**Akzeptanz:** Ein Doppelklick führt in den Modus, ein `Esc` verlässt ihn. Die Lage ist danach in HTML, Textur und Modus identisch (±1px). Die Warnung erscheint, sobald der Motivpunkt im 8-%-Rand oder in der Falz-Zone liegt. Ein Ausschnitt auf Seite 7 ändert den Einband nicht.

### Paket 3: Textrahmen aus der Palette (M bis L)

**Nutzen:** K13 (heute 1, Ziel 4), T11 ≈ 254. Michels „Click & Drop“.
**Umfang:** Palette mit Überschrift, Absatz und Notiz. Ziehen, Antippen-dann-Tippen und `Enter` führen zum selben Ergebnis. Schreiben in der `textarea` über dem Rahmen. Breite auf Spalten, Höhe folgt dem Text. `rows` aus einem einzigen Satz (`setText`), die heutige Textseite wird zur freien Seite mit Textrahmen materialisiert. Eingefügt wird nur reiner Text. Läuft der Text über, zeigt die Seite das an.
**Akzeptanz:** Ein Absatz mit 80 Wörtern bricht in Bühne, 3D-Textur und Vorschau gleich um (Zeilen-Diff = 0 auf 20 Testtexten). Ein Rahmen lässt sich nicht auf ein Foto legen. Alle drei Wege funktionieren auch mit Tastatur und Touch. Ein Satz Tippen mit Pausen ergibt höchstens einen Rückgängig-Schritt pro Pause.

### Paket 4: Mehrfachauswahl und Ausrichten (S bis M)

**Nutzen:** Weniger Handgriffe bei Mehrbildseiten (T7, K10).
**Umfang:** `Shift`-Klick, Rahmen aufziehen, „Mehrere wählen“ am Touchgerät. Gemeinsam verschieben und löschen, Kanten angleichen, gleiche Größe, gleiche Abstände, Marken für gleiche Abstände.
**Akzeptanz:** 3 Fotos lassen sich in höchstens 3 Interaktionen auf eine gemeinsame Oberkante bringen. Eine Gruppenbewegung ist ein Rückgängig-Schritt.

### Paket 5: Vorschläge pro Seite und Mehrbildseiten in der Automatik (M)

**Nutzen:** Löst S11 und S49 (kein blindes Durchschalten), steigert die Übernahmequote (T3) und macht Mehrbildseiten automatisch erreichbar.
**Umfang:** Vorrat an Rasteraufteilungen für 1–4 Fotos pro Seite (Hoch/Quer), eine Reihe mit 3–6 Vorschlägen auf der Bühne statt des Knopfs „Layout“, „Platz machen“ beim Hineinziehen. Später schlägt `autoSequence` für Serien aus F15 Mehrbildseiten vor, mit den Rhythmusregeln aus dem Buchkonzept.
**Akzeptanz:** Jeder Vorschlag besteht die Regeln ohne Ausnahme. Einen Vorschlag anzuwenden ist ein Schritt mit Zwischenstand. Fixierte Seiten bekommen nie ungefragt einen Vorschlag.

### Paket 6: Raster bewusst brechen (M)

**Nutzen:** K9 und S7, T6 auf 8 von 8 (F20).
**Umfang:** `Alt` bzw. „Frei setzen“ setzt `offGrid`, das Zeichen „außerhalb des Rasters“, Überlappung nur dann erlaubt, `⌘]` und `⌘[`. Ein Foto über den Bund als frei gezogenes Paar.
**Akzeptanz:** Ohne ausdrückliche Handlung entsteht nie `offGrid`. Die Ausnahme ist auf der Bühne sichtbar und lässt sich mit einem Klick zurück aufs Raster setzen. Voraussetzung: Der Kano-Fragebogen bestätigt K9 als Begeisterungsmerkmal, wie es das QFD empfiehlt.

### Paket 7: Druckehrliche Bühne (S)

**Nutzen:** K22 und T17, vorgezogen aus F11.
**Umfang:** Falz-Zone und 3-mm-Beschnitt auf der Bühne. Warnung, wenn die Auflösung eines Rahmens unter 300 ppi fällt, gerechnet aus der Rahmengröße und `StoredPhoto.w/h`.
**Akzeptanz:** Jede Warnung nennt das Element und einen Ausweg (kleiner ziehen, anderes Foto).

---

## 5. Offene Fragen an Michel

1. **Text auf Fotos:** Das Buchkonzept schließt ihn aus, und V2 hält sich daran. Willst du einen Titel über einem randlosen Foto wirklich nie, oder soll das in Paket 6 als Raster-Ausnahme kommen?
2. **Fotos pro Seite:** Wir empfehlen höchstens 4. Brauchst du eine Kontaktbogen-Seite mit 6–9 kleinen Bildern, z. B. für Serien?
3. **Format einfrieren:** Beim ersten freien Handgriff wird das Seitenformat (2:3 oder 3:4) fest, danach wechselt es nur noch auf ausdrücklichen Wunsch. Passt das, oder soll man das Format gleich am Anfang selbst wählen?
4. **Raster-Ausnahme schon jetzt:** Soll `Alt` bzw. „Frei setzen“ sofort mit Paket 1 kommen (S7), oder erst nach dem Kano-Fragebogen, wie es das QFD für F20 empfiehlt?

---

## 6. Entscheidungen nach Michels erstem Test (Paket 1 gebaut)

- **Text auf Fotos ist erlaubt** (offene Frage 1 beantwortet). Dafür gibt es **Ebenen**: Die Reihenfolge der Elemente ist die Stapelung. Auf der Bühne gibt es eine Ebenen-Liste mit ↑/↓, „Ganz nach vorn/hinten“ und ⌘] / ⌘[. Fotos dürfen sich überlappen. Neue Fotos suchen trotzdem zuerst eine freie Stelle.
- **Helle Schrift** als Schalter am Textrahmen, für Text auf dunklen Fotos. Es gibt keine freie Farbwahl.
- **Text wird direkt auf der Seite geschrieben**: Doppelklick auf einen Text öffnet das Schreibfeld in derselben Schrift an derselben Stelle. Doppelklick aufs Papier legt einen neuen Absatz an. Die Textleiste steht sichtbar über der Doppelseite, Klicken legt ab, Ziehen legt an eine Stelle. Das „antippen, dann auf die Seite tippen“ ist entfallen, weil es nicht selbsterklärend war.
- **Alle Fotos auf der Bühne**: Unter der Doppelseite steht eine Leiste aus Ablage und den Fotos aller anderen Doppelseiten. Ein hereingeholtes Foto wandert von seiner Doppelseite herüber.
- **Ein Foto über den Bund** hat nur eine Unterschrift, auf der Seite mit dem größeren Anteil. Der Ausschnitt-Dialog zeigt das ganze Feld über beide Seiten.
- **Für die UX-Diskussion:** Auf der Bühne gibt es keinen „Speichern“-Knopf, nur „Zur Übersicht“. Gespeichert wird bei jeder Geste von selbst. Offen ist, ob das als Rückmeldung reicht.
