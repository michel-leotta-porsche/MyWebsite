# Editor: Formen, Handschrift und was danach kommt

Ideenpapier, 7. Oktober 2026. Ausgangspunkt ist die Bühne nach Paket 1 aus `docs/editor-workshop.md`, Abschnitt 6. Dazu kommen das Buchkonzept (`docs/workshop-konzept.md`, `DESIGN.md`) und die Kundenanforderungen K1–K24 aus `src/content/qfd.json`. Angesehen wurde die Bühne in der Testversion (`NEXT_PUBLIC_FUJI_MOCK=1`, vier Japan-Fotos, 1440px).

Michels Wunsch: **einfach und trotzdem umfangreich**, mit Werkzeugen wie in PowerPoint. Als Nächstes sollen **Formen** und **Handgeschriebenes** kommen, mit iPad-Stift oder Maus. Das Buch soll dabei schön bleiben, also kein Bastelbogen.

Alle Aussagen über fremde Werkzeuge haben eine Quelle (Liste am Ende, Verweise wie [Q12]). Wo nur Drittquellen oder Suchauszüge vorlagen, steht das dabei. Alles andere ist unser Vorschlag und als solcher formuliert.

---

## 0. Kurzfassung

- **Formen:** Linie, Pfeil, Rechteck/Rahmen und Ellipse kommen zuerst. Klebestreifen, Fotoecken und Etikett folgen danach, als „Material“ statt Clipart. Foto-Masken gibt es nur als Oval. Bilderdienste wie CEWE raten selbst zu sparsamem Schmuck [Q25].
- **Stift:** `perfect-freehand` (MIT, 2 kB gzip, typisiert, gepflegt, Grundlage auch von Excalidraw) [Q40][Q47]. Pointer Events mit `pressure`, Glättung über `streamline`, Palm Rejection nach dem Muster von Freeform: Der Stift zeichnet, der Finger scrollt [Q33].
- **Technik:** ein neuer Element-Typ `path` in `layout.ts`. Formen und Tinte werden zu SVG-Pfaddaten in cqw. `page-view.tsx` zeichnet sie als `<path d>`, `page-texture.ts` über `new Path2D(d)` [Q51]. So liegen beide deckungsgleich, weil beide denselben String zeichnen.
- **Speichern:** Tinte als vereinfachte, quantisierte Punktfolge in einem kompakten String. Das ganze Buch steht in **einem** Firestore-Dokument, und jede Version ist wieder ein ganzes Buch, beides unter 1 MiB [Q48].
- **Bedienung:** vier Modi (Auswahl, Text, Form, Stift) in einer Leiste. Feinheiten erscheinen nur kontextabhängig neben dem gewählten Element, wie bei Keynote, Freeform und Canva [Q56][Q57][Q58].
- **Erstes Paket:** „Formen + Stift“ (Aufwand L, ein Durchgang), Abschnitt 5.

---

## 1. Formen

### 1.1 Welche Formen in ein Fotobuch passen

Die Prüffrage lautet: Gibt es die Form auch in einem echten, analog geklebten Album oder in einem gesetzten Fotobuch? Wenn ja, ist sie Material und passt zur Material-Regel in `DESIGN.md`. Wenn nein, ist sie Clipart und bleibt draußen.

| Form | Passt? | Warum | Paket |
|---|---|---|---|
| **Linie** | ja | Haarlinien gliedern Bildunterschriften, Daten und Kapitel. Das ist klassische Buchtypografie und entspricht der Prägemulde (`frame`), die es schon gibt. | 1 |
| **Pfeil** | ja, sparsam | für Notizen („hier haben wir gewohnt“), vor allem mit Handschrift zusammen. In PowerPoint, Freeform und Figma ist er ein Linienende, keine eigene Form [Q4][Q14][Q17]. Bei uns ebenso. | 1 |
| **Rechteck / Rahmen** | ja | Ohne Füllung ist es ein Rahmen (Kontur um eine Gruppe, Passepartout-Linie). Mit Papier- oder Leinenfüllung wird es ein Feld für eine Notiz. | 1 |
| **Ellipse / Kreis** | ja | Etwas einkreisen, mit Stift-Optik oder als dünne Linie. Gefüllt ergibt es einen Punkt als Markierung. | 1 |
| **Klebestreifen** | ja, das typische Album-Material | Halbtransparent, leicht schräg, mit gezackten Enden über einer Fotoecke. Bei den untersuchten Fotobuch-Diensten fand sich Washi-Tape nur bei Snapfish als „Embellishment“ [Q38]. Das ist eine Lücke, die zu unserem Analog-Gefühl passt. | 2 |
| **Fotoecken** | ja | vier kleine Dreiecke an den Ecken eines Fotos, wie im Album der 70er. Das passt genau zur Leitidee „Egglestons Guide“ in `DESIGN.md`. | 2 |
| **Etikett** | ja, als Text mit Fläche | wie ein Museums- oder Prägeetikett. Am einfachsten als Textrahmen mit Hintergrund (`TextLook.bg`), nicht als eigene Form. | 2 |
| **Foto-Maske** | nur **Oval** | Ein Oval gibt es als Medaillon auch im echten Album. PowerPoint („Crop to Shape“), Keynote („Mask with Shape“), Canva (Frames), Figma und Adobe Express bieten beliebige Masken an [Q7][Q12][Q20][Q18][Q24]. Herzen und Sterne wären aber genau der Bastelbogen. Abgerundete Ecken widersprechen der Regel „keine Radien“. | 2 |
| Sterne, Sprechblasen, Herzen, Symbol-Bibliothek | nein | Freeform liefert „hundreds of shapes … animals, food, symbols, and ornaments“ [Q13], CEWE Cliparts und Sticker [Q25]. Das ist für Tafeln und Whiteboards gedacht, nicht für ein ruhiges Buch (K9). | – |

### 1.2 Bedienung

Was die Vorbilder gemeinsam haben und was wir übernehmen:

- **Aufziehen:** Form wählen, dann auf der Seite ziehen. So machen es PowerPoint, Keynote und Figma [Q1][Q8][Q17]. Ein **Klick ohne Ziehen** legt die Form in Standardgröße an eine freie Rasterzelle, so wie heute „+ Absatz“ (`placeNew`). Das deckt Tastatur und Touch ab.
- **Shift** hält die Proportion: Quadrat, Kreis, Linie in 45°-Schritten. **Alt/Option** zieht aus der Mitte [Q1][Q2][Q17]. Wichtig für uns: Die Box speichert x in % der Seitenbreite und y in % der Seitenhöhe. Ein „echter“ Kreis braucht deshalb `realRatio(b) === 1`, nicht `w === h`. Die Funktion gibt es in `stage.tsx` schon.
- **Nach einer Form zurück in Auswahl.** PowerPoint bleibt nur mit „Lock Drawing Mode“ im Zeichenmodus [Q3]. Bei uns hält ein Doppelklick auf das Form-Werkzeug den Modus offen. Das ist unser Vorschlag, wie in vielen Grafikprogrammen.
- **Einrasten:** Dieselben Ziele wie für Fotos und Text, also die Rasterlinien aus `spreadGrid`, Seitenkanten, Bund und die Kanten der Nachbarn. Dafür `moveBox`/`resizeBox` aus `stage.tsx` wiederverwenden. Schon beim **Aufziehen** rastet die Startecke ein, nicht erst beim Verschieben. Die Hilfslinien erscheinen wie in PowerPoint und Figma von selbst [Q6][Q19]. `Alt` beim Ziehen = frei (das gibt es heute schon als Raster-Ausnahme).
- **Linien und Pfeile** haben zwei Endgriffe statt acht Kastengriffe. Beide Enden rasten auf Rasterlinien und auf Kanten von Fotos. Eigene Punkte bearbeiten wie „Edit Points“ in PowerPoint [Q5] gibt es nicht. Gekrümmte Linien macht der Stift.
- **Kontur und Füllung** in einer schwebenden Leiste über der Form, wie heute die `TextToolbar`:
  - **Kontur:** Farbe aus derselben Palette wie Text (Tinte, Grau, Papier, Schwarz, Weiß, Einband) plus „keine“.
  - **Stärke** in drei Stufen: *Haarlinie* 0,25 cqw (≈ 1 pt bei 15 cm Seitenbreite, `PT = 4.25`), *Linie* 0,5 cqw, *Kräftig* 1 cqw. Keine Zahleneingabe. Die Haarlinie ist bewusst so dick, dass sie im Druck noch steht (K22).
  - **Füllung:** dieselben Farben plus „keine“. Standard ist „keine“, damit ein Rechteck zuerst ein Rahmen ist.
  - **Deckkraft** in drei Stufen: 100 %, 60 %, 30 %. Adobe Express und Canva bieten Schieberegler [Q23][Q21]. Für ein Buch reichen drei Stufen, und das Ergebnis lässt sich vorhersagen.
  - **Linienenden** (nur Linie/Pfeil): keine, Pfeil am Ende, beidseitig. **Strich:** durchgezogen oder gepunktet.
- **Keine Schatten, keine Verläufe, keine Glanz-Effekte.** PowerPoint bietet Schatten, Leuchten, 3-D und Spiegelung [Q3]. Das widerspricht der „Physical Light Rule“ in `DESIGN.md` und entfällt.
- **Überlappen:** Formen dürfen über allem liegen (Klebestreifen über der Fotoecke, Kreis um ein Motiv). `collides()` in `free-layout.ts` muss Formen und Tinte deshalb ausnehmen.
- **Tastatur:** `R` Rechteck, `O` Ellipse, `L` Linie, `⇧L` Pfeil, wie in Figma [Q17]. Pfeiltasten verschieben, Entf löscht, ⌘D dupliziert. Das gibt es alles schon für Fotos und Text.

### 1.3 Datentyp

Er passt neben `photo` und `text` in `FreeItem`, mit denselben Feldern `id`, `box`, `z` und `pairId`. Formen über den Bund laufen damit ohne Zusatzcode durch `fromSpread`/`toSpread`.

```ts
// src/content/books.ts

export type ShapeKind = "line" | "arrow" | "rect" | "ellipse" | "tape" | "corners";

/** Gestaltung einer Form; was fehlt, kommt von der Vorgabe der Form (SHAPE_DEFAULTS in layout.ts) */
export type ShapeLook = {
  /** Konturfarbe wie TextLook.color (Hex aus der Palette oder Einband); null = keine Kontur */
  stroke?: string | null;
  /** Konturstärke in cqw (Seitenbreite = 100): 0.25 | 0.5 | 1 */
  width?: number;
  /** Füllfarbe; null = keine */
  fill?: string | null;
  /** Deckkraft der ganzen Form: 1 | 0.6 | 0.3 */
  opacity?: number;
  dash?: "solid" | "dot";
  /** nur line/arrow */
  heads?: "none" | "end" | "both";
};

export type FreeEl =
  | { t: "photo"; no: number; box: Box; crop?: Crop; caption: "auto" | "off"; mask?: "oval" }
  | { t: "text"; text: string; role: TextRole; box: Box; light?: boolean; look?: TextLook }
  | { t: "shape"; shape: ShapeKind; box: Box; line?: LineEnds; rot?: number; look?: ShapeLook; seed: number }
  | { t: "ink"; box: Box; strokes: InkStroke[] };

/** Anfang und Ende einer Linie als Anteile der Box (0..1): x1, y1, x2, y2.
 *  Ein flaches Tupel, weil Firestore (Standard) keine Arrays in Arrays speichert [Q50]. */
export type LineEnds = [number, number, number, number];

export type FreeItem =
  | PhotoFreeItem   // wie heute, dazu mask?: "oval"
  | TextFreeItem    // wie heute
  | {
      t: "shape";
      id: string;
      shape: ShapeKind;
      box: Box;
      line?: LineEnds;
      /** Drehung in Grad, nur Klebestreifen (-8, -4, 0, 4, 8) */
      rot?: number;
      look?: ShapeLook;
      z?: number;
      pairId?: string;
    }
  | { t: "ink"; id: string; box: Box; strokes: InkStroke[]; /** Beschreibung für Screenreader */ label?: string; z?: number; pairId?: string };
```

Entscheidungen dazu:

- **Keine freie Drehung** für Rechteck, Ellipse und Fotos. Sie würde Einrasten, Kollision und Griffe komplizierter machen und wäre auf dem Raster selten schön. Nur der Klebestreifen bekommt feste Schrägen. Die Drehung wird beim Satz in die Pfadpunkte eingerechnet, nicht als CSS-`transform`. So können sich HTML und Textur nicht unterscheiden.
- **`seed`** (aus der `id` abgeleitet, im `FreeEl`) macht zufällige Kanten reproduzierbar, etwa die Zacken des Klebestreifens. HTML, Textur, Server und Client zeichnen dieselben Zacken.
- **Farben** bleiben Hex-Strings wie bei `TextLook.color`, damit die vorhandene Palette (`SWATCHES` in `stage.tsx`) für Text, Formen und Stift gleich ist.
- **`build()`** reicht `shape` und `ink` unverändert durch (Zweig in `case "free"`). `readingOrder`/`pageNos` zählen weiter nur Fotos, Tafelnummern ändern sich also nicht.

### 1.4 Darstellung: ein Pfad für HTML und Textur

Heute kennt `El` die Typen `img`, `caption`, `text`, `thumb`, `rect` und `frame`. Dazu kommt **ein** neuer Typ, den Formen und Tinte gemeinsam nutzen:

```ts
// src/content/layout.ts
export type El =
  | /* … wie heute … */
  /** Vektorform: SVG-Pfaddaten in cqw der Seite (x 0..100, y 0..H); HTML: <path d>, Textur: new Path2D(d) */
  | {
      t: "path";
      d: string;
      fill?: string;
      stroke?: string;
      /** Strichstärke in cqw */
      width?: number;
      /** getrennt für Füllung und Kontur, damit SVG und Canvas gleich mischen (siehe unten) */
      opacity?: number;
      dash?: number[];
      cap?: "round" | "butt";
    };
```

**`layoutFree`** bekommt zwei Zweige. Die Box ist schon in cqw umgerechnet (`toC`), wie bei Fotos:

```ts
} else if (it.t === "shape") {
  els.push(...shapeEls(it, b));            // 1–5 Pfade: Körper, Pfeilspitzen, Fotoecken
} else if (it.t === "ink") {
  els.push(...inkEls(it, b));              // ein gefüllter Pfad pro Strich
}
```

`shapeEls` erzeugt die Pfaddaten:
- **rect:** `M x y H x+w V y+h H x Z`, um die halbe Strichstärke nach innen versetzt. So bleibt die Kontur in der Box, wie bei `frame` heute.
- **ellipse:** zwei Bögen `M cx-rx cy A rx ry 0 1 0 cx+rx cy A rx ry 0 1 0 cx-rx cy Z`.
- **line/arrow:** `M x1 y1 L x2 y2`. Die Pfeilspitze ist ein eigenes **gefülltes** Dreieck. Ihre Größe ist `max(1.6, 4 × width)` cqw, ausgerichtet am Winkel der Linie. Die Linie endet an der Basis der Spitze, damit das stumpfe Linienende nicht unter der Spitze herausschaut.
- **tape:** ein Rechteck mit gezackten Schmalseiten (Zacken aus `seed`), um `rot` gedreht. Die gedrehten Punkte werden in JavaScript berechnet.
- **corners:** vier Dreiecke, je 6 % der kürzeren Kante.

**`page-view.tsx`**, im neuen `case "path"` von `Element`:

```tsx
case "path": {
  const H = book.aspect * 100;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 100 ${H}`} style={{ zIndex: z }}>
      <path
        d={el.d}
        fill={el.fill ?? "none"}
        fillOpacity={el.opacity}
        stroke={el.stroke}
        strokeOpacity={el.opacity}
        strokeWidth={el.width}
        strokeDasharray={el.dash?.join(" ")}
        strokeLinecap={el.cap ?? "butt"}
        strokeLinejoin="miter"
      />
    </svg>
  );
}
```

**`page-texture.ts`**, im neuen `case "path"` von `drawLayout`:

```ts
case "path": {
  ctx.save();
  ctx.scale(cq, cq);                       // ab hier zählt alles in cqw, wie viewBox oben
  const p = new Path2D(el.d);
  ctx.globalAlpha = el.opacity ?? 1;
  if (el.fill) { ctx.fillStyle = el.fill; ctx.fill(p); }
  if (el.stroke) {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.width ?? 0.25;
    ctx.lineCap = el.cap ?? "butt";
    ctx.lineJoin = "miter";
    ctx.setLineDash(el.dash ?? []);
    ctx.stroke(p);
  }
  ctx.restore();
  return;
}
```

Damit beide wirklich deckungsgleich sind, gilt:

1. **Ein String, zwei Zeichner.** `Path2D` nimmt SVG-Pfaddaten direkt an, in allen Browsern seit 2016, Safari eingeschlossen [Q51]. Es gibt keine zweite Geometrie.
2. **Gleiche Einheiten.** Das SVG hat `viewBox 0 0 100 H` über der ganzen Seite, das Canvas `scale(cq, cq)`. Strichstärke und Strichmuster skalieren deshalb in beiden gleich mit der Seite. `vector-effect` wird nicht verwendet.
3. **Deckkraft getrennt.** Eine SVG-`opacity` auf dem Element mischt Füllung und Kontur erst zusammen und blendet dann ab. `globalAlpha` im Canvas wirkt dagegen auf jeden Zeichenbefehl einzeln. Deshalb `fill-opacity` und `stroke-opacity` verwenden, denn sie verhalten sich wie `globalAlpha`.
4. **Abschneiden an der Seite.** Die Seite in `page-view.tsx` hat `overflow-hidden`, und die Textur zeichnet ohnehin nur ins Seitenformat. Eine Form über den Bund zeigt so auf jeder Seite ihre Hälfte, wie Fotos mit `pairId`.
5. **Prüftest:** Eine Doppelseite mit allen Formen wird einmal per Playwright als HTML aufgenommen und einmal als `drawPage`-Canvas. Der Pixelvergleich muss unter 0,5 % Abweichung bleiben (Kantenglättung ausgenommen).

**Foto-Maske Oval** (Paket 2): `img` bekommt `mask?: "oval"`. In `page-view.tsx` ist das `clip-path: ellipse(50% 50% at 50% 50%)` auf dem Bildkasten, in `page-texture.ts` `ctx.ellipse(…); ctx.clip()` statt `ctx.rect`. Ausschnitt, Fokus und Zoom bleiben unverändert.

---

## 2. Handschrift und Zeichnen

### 2.1 Eingabe: Pointer Events

- **Ein Ereignismodell für Stift, Maus und Finger.** `pointerType` ist `"pen"`, `"mouse"` oder `"touch"`. `pressure`, `tiltX/Y`, `pointerType` und `twist` gibt es in Safari und iPadOS-Safari seit Version 13 [Q42][Q41]. `altitudeAngle` und `azimuthAngle` gibt es seit Safari 18.2 [Q42].
- **Maus:** Geräte ohne Druck melden bei gedrückter Taste `pressure = 0.5` (Spezifikation: MUST) [Q41]. Excalidraw nutzt genau das: `simulatePressure = event.pressure === 0.5` [Q53]. Wir machen es ebenso. Bei der Maus simuliert `perfect-freehand` den Druck aus der Geschwindigkeit, und die Glättung ist stärker.
- **Mehr Punkte:** `getCoalescedEvents()` liefert die Zwischenpunkte, die der Browser zu einem `pointermove` zusammenfasst. `getPredictedEvents()` liefert vorhergesagte Punkte gegen gefühlte Verzögerung [Q41]. Beides gibt es in Safari erst ab 18.2 [Q42], also mit Rückfall auf das Einzelereignis. In iOS 18.2 fehlte den zusammengefassten Ereignissen die `pointerId`, Flutter hat das umgangen [Q44]. Wir filtern deshalb nicht nach `pointerId` der Unterereignisse, sondern nur nach dem Hauptereignis.
- **Bekannte Schwäche:** Ein Entwickler meldete im März 2025, dass `pointermove` mit dem Apple Pencil Pro in Safari seltener abtastet als `touchmove`, mit eckigen Kurven [Q43]. Eine Antwort gab es nicht. Ältere Ratschläge (Scribble aus, `desynchronized`-Canvas) stammen aus der Zeit vor `getCoalescedEvents` [Q45]. **Konsequenz:** Glättung (`streamline`) auch beim Stift und auf dem iPad früh mit echtem Gerät testen.
- **`touch-action: none`** muss auf der Zeichenfläche stehen, sonst übernimmt der Browser die Geste als Scrollen oder Zoomen [Q41]. Wir setzen es **nur im Stift-Modus**. Sonst würde die Bühne auf dem iPad nicht mehr scrollen.
- **Pointer Capture** (`setPointerCapture`) beim Ansetzen, damit der Strich auch außerhalb der Seite weiterläuft und sauber endet.
- **Schwebender Stift:** WebKit liefert Hover-Ereignisse für den Apple Pencil, aber ohne Neigung und Drehung [Q46]. Das nutzen wir für eine Vorschau: ein Punkt in Stiftbreite und Farbe unter der Spitze. Drehen (barrel roll) und Drücken (squeeze) kommen nicht im Web an. `twist` bleibt 0 [Q46][Q47b]. Wir bauen nichts darauf.

### 2.2 Palm Rejection

Eine Browser-API dafür gibt es nicht. Die Apps lösen es über die Art des Zeigers:

- **Freeform:** Der Apple Pencil zeichnet. Mit dem Finger zeichnet man nur nach dem Schalter „Draw with Finger“ [Q33].
- **GoodNotes:** Mit Apple Pencil ist keine Einstellung nötig, die Erkennung gilt nur für kapazitive Stifte und Finger (Suchauszug, Seite selbst nicht abrufbar) [Q34].
- **Procreate:** Malen mit dem Finger ist eine eigene Einstellung („Enable painting with finger“). Das ist nur aus Drittquellen bestätigt [Q35].

**Unser Vorschlag:**
1. Im Stift-Modus zeichnet **`pen` immer**.
2. Sobald in dieser Sitzung ein `pen`-Ereignis kam, zeichnet **`touch` nicht mehr**. Der Finger scrollt, zoomt und wählt dann. Wie bei Freeform wird daraus „Stift zeichnet, Finger bedient“.
3. Kam noch kein Stift (iPhone, iPad ohne Pencil), zeichnet der Finger im Stift-Modus. Ein Schalter „Mit dem Finger zeichnen“ in der Stiftleiste macht das sichtbar und umschaltbar.
4. Berührungen, die während eines Stiftstrichs beginnen, werden ignoriert, solange der Stift unten ist. Das ist der eigentliche Handballen-Fall.

### 2.3 Bibliotheken

Geprüft über das npm-Register (Stand 7.10.2026), Bundlephobia und GitHub [Q47]:

| Paket | Version (Datum) | Maintainer | Lizenz | min / gzip | Downloads pro Woche | Eignung |
|---|---|---|---|---|---|---|
| **`perfect-freehand`** | 1.2.3 (1.2.2026) | steveruizok | **MIT** | 4,4 / **2,0 kB** | 3,6 Mio. | **Empfehlung.** Druckabhängige Umrisse, keine Abhängigkeiten, TypeScript-Typen, auch Grundlage von Excalidraw [Q53] |
| `signature_pad` | 5.1.4 (31.7.2026) | szimek, tonybrix | MIT | 15,6 / 4,6 kB | 3,4 Mio. | Breite aus der Geschwindigkeit, eigenes Canvas. Gebaut für Unterschriften, nicht für Pfade in unserem Satz |
| `tldraw` | 5.5.2 (2.10.2026) | tldraw-Team | **eigene Lizenz**, Produktion nur mit Schlüssel | 1,78 MB / 530 kB | 513 Tsd. | ausgeschlossen: Lizenz [Q49] und Größe. tldraw hat außerdem eine eigene Kopie von `getStroke` [Q49] |
| `@excalidraw/excalidraw` | 0.18.1 (20.4.2026) | dwelle, maielo | MIT | – | 793 Tsd. | ganzer Whiteboard-Editor, nur als Vorbild für das Datenmodell interessant [Q53] |
| `simplify-js` | 1.2.4 (3.2.2020) | mourner | BSD-2-Clause | < 1 kB (Quelle: ca. 100 Zeilen) | 299 Tsd. | Punktvereinfachung (Radial plus Douglas-Peucker) [Q52]. Seit 2020 unverändert, aber fertig. Alternativ selbst schreiben, weil es nur ~40 Zeilen sind |
| `paper` | 0.12.18 (17.7.2024) | lehni, puckey | MIT | 238 / 84 kB | 262 Tsd. | `path.simplify()` passt Kurven an, ist aber viel zu schwer nur dafür [Q54] |
| `roughjs` | 4.6.6 (20.11.2023) | shihn | MIT | 27 / 8,8 kB | 19,5 Mio. | „skizzierte“ Formen wie in Excalidraw. Passt nicht zur ruhigen Buchgestaltung, deshalb nein |

**Empfehlung:** `perfect-freehand` mit genau festgeschriebener Version (`"perfect-freehand": "1.2.3"`, ohne `^`). Gespeichert werden die Eingabepunkte, der Umriss wird bei jedem Satz neu berechnet. Eine neue Version mit anderer Rechnung würde also alte Bücher verändern (K4). Updates nur mit Pixelvergleich. Die Vereinfachung schreiben wir selbst (Douglas-Peucker, ~40 Zeilen) oder übernehmen `simplify-js`. Ab 1 kB lohnt die Abhängigkeit kaum, die Prüfung nach AGENTS.md wäre aber bestanden.

Wie es arbeitet: `getStroke(points, options)` liefert **Umrisspunkte eines Polygons**, keine Mittellinie. Aus ihnen wird mit der Hilfsfunktion `getSvgPathFromStroke` aus der README ein Pfad (`M … Q … T … Z`), der **gefüllt** und nicht nachgezogen wird [Q40]. Das passt genau auf `El.path` mit `fill`. Für echten Druck übergibt man `[x, y, pressure]` und `simulatePressure: false` [Q40].

**Stifte als Vorgaben** (unser Vorschlag, Werte im ersten Test justieren). Die Standardwerte der Bibliothek sind `size 8, thinning 0.5, smoothing 0.5, streamline 0.5` [Q40]:

| Stift | Zweck | `thinning` | `smoothing` | `streamline` (Stift / Maus) | Deckkraft |
|---|---|---|---|---|---|
| **Füller** | Handschrift, Druck verändert die Breite | 0.6 | 0.5 | 0.4 / 0.65 | 1 |
| **Fineliner** | gleichmäßige Linie, Skizzen | 0 | 0.5 | 0.4 / 0.65 | 1 |
| **Marker** | breit hervorheben | 0 | 0.6 | 0.5 / 0.7 | 0.35 |

`streamline` ist der Glätter, der der Spitze nachläuft, ähnlich wie StreamLine in Procreate [Q36]. Bei der Maus ist er höher, weil Mausstriche zittriger sind.

**Breiten:** fein 0,6 cqw, mittel 1,1 cqw, breit 2 cqw (Marker 3 cqw). **Farben:** Tinte, Grau, Weiß (für dunkle Fotos), Einband. Später kommt eine Farbe aus dem Foto dazu (Pipette, Abschnitt 3).

### 2.4 Datentyp und Speichern

```ts
// src/content/books.ts
export type InkTool = "pen" | "fine" | "marker";
export type InkStroke = {
  tool: InkTool;
  color: string;
  /** Grundbreite in cqw */
  size: number;
  /** Punkte relativ zur Box, codiert (siehe unten); Version im ersten Zeichen */
  pts: string;
  /** Maus: Druck aus der Geschwindigkeit simulieren */
  sim?: true;
};
// FreeItem | { t: "ink"; id; box; strokes: InkStroke[]; label?; z?; pairId? } (Abschnitt 1.3)
```

**Eine Zeichnung, viele Striche.** Pro Strich ein eigenes Element wäre in der Ebenen-Liste unbrauchbar, denn ein Wort hat schon 5–10 Striche. Striche gehören deshalb zu **einer Zeichnung**, solange man im Stift-Modus bleibt und nahe an der Zeichnung schreibt (Abstand unter 6 cqw zur bestehenden Box). Weiter weg beginnt eine neue Zeichnung. Eine Zeichnung lässt sich wie ein Foto wählen, verschieben, proportional skalieren, stapeln, kopieren und löschen.

**Punkte relativ zur Box** (0..1): Beim Verschieben ändert sich nur `box`. Beim Skalieren (nur proportional) werden `box` und `size` gemeinsam skaliert.

**Wie viel Platz das braucht.** Firestore erlaubt höchstens **1 MiB pro Dokument** und keine Arrays in Arrays [Q48][Q50]. Eine Zahl kostet 8 Byte, ein String seine UTF-8-Bytes + 1 [Q48b]. Bei uns steht **das ganze Buch in einem Dokument** (`books/{id}`, `saveBook` in `store.ts`), und **jede Version** unter `books/{id}/versions` ist wieder ein ganzes Buch. Das Budget gilt also für alle Doppelseiten zusammen. Die Rechnung (unsere eigene, aus den Firestore-Regeln):

| Speicherform | pro Punkt (x, y, Druck) | eine handgeschriebene Seite* |
|---|---|---|
| Zahlen-Array `[x, y, p, …]` | 24 B | ≈ 260 kB, bei 4 Seiten ist das Buch voll |
| Ganzzahl-Deltas, Base64-String | ≈ 6–8 B | ≈ 65–85 kB |
| dasselbe nach Vereinfachung (Toleranz 0,08 cqw) | ≈ 6–8 B, aber 50–70 % weniger Punkte | ≈ 25–40 kB |

\* Annahme: 60 Wörter × 6 Striche × 30 Punkte ≈ 10 800 Punkte vor der Vereinfachung.

**Codierung** (`src/lib/ink-codec.ts`, eigener kleiner Code, keine Abhängigkeit):
1. **Vereinfachen** mit Douglas-Peucker auf (x, y), Toleranz 0,08 cqw (an 15 cm Seitenbreite gemessen ≈ 0,1 mm). Der Druck des behaltenen Punkts bleibt erhalten.
2. **Quantisieren:** x und y relativ zur Box auf 0..4095, den Druck auf 0..63.
3. **Delta-Codierung** gegen den vorherigen Punkt, als Ganzzahlen mit Vorzeichen (Zickzack) in eine Variable-Länge-Codierung (1–2 Byte für typische Schritte).
4. **Base64** (URL-Alphabet) als String mit Versionszeichen vorn, also `"1…"`.

Ein String statt Firestore-`Bytes` hält die JSON-Sicherung (`exportBook` in `store.ts`) und den Versionsverlauf ohne Sonderfall. Der Aufschlag von ⅓ durch Base64 ist bei diesen Mengen klein.

**Wächter:** `bookBytes(book)` schätzt die Dokumentgröße (JSON-Länge reicht als obere Schranke). Ab 700 kB zeigt die Stiftleiste „Das Buch ist fast voll mit Zeichnungen“. Ab 900 kB legt der Stift nichts Neues mehr an. Falls das in der Praxis knapp wird, ziehen Zeichnungen in Unterdokumente `books/{id}/ink/{spreadId}` um. Das ist eine Option, kein Teil von Paket 1.

**Darstellung:** `inkEls(it, b)` decodiert pro Strich die Punkte und rechnet sie in Seiten-cqw um (`b.x + u × b.w`, `b.y + v × b.h`). Dann folgen `getStroke(points, PRESET[tool] mit size, simulatePressure: !!sim, last: true)` und `getSvgPathFromStroke` und daraus `{ t: "path", d, fill: color, opacity }`. Es läuft reines JavaScript ohne Canvas und deshalb auch beim statischen Export auf dem Server. Das Ergebnis wird pro Strich in einer `WeakMap` zwischengespeichert, damit Blättern und Ziehen nicht neu rechnen.

**Live-Strich:** Während des Zeichnens rendert die Bühne nur ein Overlay-`<svg>` mit dem laufenden Pfad und nicht die Seite (die Seite ist `MemoPage`). Neu berechnet wird pro `requestAnimationFrame`. Beim Loslassen wird der Strich codiert und in **einem** `commit` gespeichert, also ein Rückgängig-Schritt pro Strich, wie heute einer pro Geste.

### 2.5 Radierer, Farben, Modi

- **Radierer:** Paket 1 hat einen **Strich-Radierer**: Er löscht ganze Striche, die er berührt. GoodNotes nennt das „Stroke Eraser“ (Suchauszug) [Q34b], Pages auf dem iPad „Object Eraser“ [Q37]. Das genügt für Handschrift und hält das Datenmodell einfach. Der **Pixel-Radierer**, der Striche teilt [Q37], kommt in Paket 7. Der Treffer wird gegen die Umrisspolygone gerechnet (`ctx.isPointInPath` auf einem Offscreen-Canvas oder Punkt-in-Polygon). Ist eine Zeichnung leer, verschwindet sie.
- **Durchstreichen löscht** heißt bei Freeform „Scribble to erase“ [Q33]. Das wäre eine Erkennungsfunktion und ist zu riskant für Paket 1.
- **Halten begradigt:** Wer in Freeform am Ende eines Strichs kurz stillhält, bekommt einen geglätteten oder begradigten Strich [Q33]. Das kommt in Paket 7, zusammen mit „Shift zeichnet gerade“ für die Maus.
- **Modi:** Stift und Radierer sind **Werkzeuge im Stift-Modus**, kein eigener Modus. Auswahl bleibt Auswahl. Ein Klick auf eine vorhandene Zeichnung im Auswahl-Modus wählt sie. Ein Doppelklick auf eine Zeichnung öffnet den Stift-Modus und schreibt in genau diese Zeichnung weiter, analog zum Doppelklick auf Text (Abschnitt 6 im Workshop).
- **Barrierefreiheit:** Zeichnungen sind im Lesemodus `aria-hidden`, außer sie haben `label`. Das Feld „Beschreibung“ im Kontextmenü füllt es, etwa „Handschrift: Hier haben wir übernachtet“. Mit der Tastatur lassen sich Zeichnungen wählen, verschieben und löschen, aber nicht zeichnen. Das ist ehrlich so.

---

## 3. Weitere Ideen für „einfach und umfangreich“

Sortiert nach Nutzen durch Aufwand. Nutzen bedeutet hier: Bezug zu gewichtigen K-Anforderungen und zu Michels Sätzen aus dem QFD.

| # | Idee | Was genau | Vorbild | QFD | Nutzen | Aufwand |
|---|---|---|---|---|---|---|
| 1 | **Tastenkürzel-Hilfe** | `?` (bzw. ⇧/) öffnet eine Tafel mit allen Kürzeln nach Gruppen. Sie bleibt offen, während man arbeitet. | Figma Shortcuts-Panel [Q27] | K10 | mittel | **S** |
| 2 | **Stil übertragen** | „Stil kopieren / einfügen“ im Kontextmenü, für Text, Formen und Stift | Freeform „Copy Style“ [Q57] | K10, K9 | mittel | **S** |
| 3 | **Material-Formen** | Klebestreifen, Fotoecken, Etikett, Oval-Maske (Abschnitt 1.1) | Snapfish-Embellishments [Q38], Keynote-Maske [Q12] | K9 (A) | hoch | **S–M** |
| 4 | **Mehrfachauswahl, Ausrichten, Verteilen** | ⇧-Klick und Rahmen aufziehen. Ausrichten an Auswahl oder Seite, Verteilen ab 3 Elementen | PowerPoint [Q28], Keynote [Q29], Canva [Q30], Figma [Q26] | K10 (O,4), K9 | hoch | **M** (= Workshop-Paket 4) |
| 5 | **Gruppieren** | ⌘G/⌘⇧G, `groupId` am Element, die Gruppe bewegt sich gemeinsam | Canva [Q30], PowerPoint [Q28] | K10 | mittel | **S** nach #4 |
| 6 | **Befehlspalette ⌘K** | Suchfeld für alle Befehle („ausrichten“, „Pfeil“, „Seite leeren“), mit Kürzel daneben, das lehrt die Kürzel nebenbei | Figma Actions ⌘K/⌘/ [Q26b], Canva „/“ Quick actions [Q31] | K10 | mittel–hoch | **M** |
| 7 | **Pipette und Palette aus dem Foto** | Die Palette zeigt 5 Farben aus den Fotos der Doppelseite (die Farbe pro Foto gibt es schon in `AutoPhoto.color`) und eine Pipette, die auf einem Foto der Seite tippt. Die Browser-`EyeDropper`-API gibt es in **Safari nicht** [Q55]. Wir lesen das Pixel selbst aus dem Bild, das die Textur ohnehin lädt. | Canva [Q32], Figma [Q32b], Keynote iPad [Q32c], Mixbook [Q39] | K9, K12 | hoch: Farbe kommt aus dem Foto, nicht aus einem Farbrad | **M** |
| 8 | **Seitenhintergrund** | Nur drei Arten: Papier (Standard), Einband-Leinen, ein Ton aus dem Foto (über #7). Kein freies Farbrad, das verlangt die Material-Regel in `DESIGN.md`. | CEWE (Fachpresse) [Q56b], Keynote [Q32c] | K9 | mittel | **S** nach #7 |
| 9 | **Stempel aus den Metadaten** | Ein Datum-/Ort-Stempel als Textrahmen in Mono, befüllt aus EXIF (`exifr` ist schon da). Das **Kamera-Rezept** nur auf ausdrücklichen Wunsch, weil `DESIGN.md` Kameradaten auf Seiten verbietet und K24 („nicht belästigen“) gilt. | keine belegte Entsprechung bei Fotobuch-Diensten | K14 (A), K23 (A) | hoch (Begeisterung) | **S–M** |
| 10 | **Gestaltung übertragen** | Eine Doppelseite **duplizieren** geht nicht, weil jedes Foto nur einmal im Buch steht (Invariante aus dem Workshop). Stattdessen wird ihre Anordnung auf die Fotos einer anderen Doppelseite übertragen. | Canva Seite duplizieren [Q30b], Mixbook Spreads duplizieren [Q39] | K10, K3 | hoch | **M** |
| 11 | **Vorschläge pro Doppelseite** | 3 Anordnungen für die Fotos dieser Doppelseite als Miniaturen, regelbasiert aus `variants()` und dem Raster. Erst später kommt KI dazu. Ein Klick übernimmt, alles bleibt frei bearbeitbar. | PowerPoint Designer [Q58], Canva Layouts [Q59], Mixbook Auto-Create [Q39b], Shutterfly Autofill [Q60] | K3 (O,5), K5, K10 | hoch | **M–L** (= Workshop-Paket 5) |
| 12 | **Druckehrlich für Formen** | Warnung bei Formen in der Falz-Zone und bei Linien unter 0,25 cqw | Artifact Uprising warnt vor zu geringer Auflösung [Q61] | K22 | mittel | **S** |
| 13 | **KI-Text** | „Schreib mir drei Sätze zu diesem Tag“ aus Ort, Datum und Bildtitel. Er braucht Server und Kosten und ist am weitesten von K13 entfernt („stehen genau so da, wie *ich* sie gesetzt habe“). | Adobe Express Generate [Q62] | K13 (eher gegenläufig) | niedrig | **L** |

**Bewusst nicht:** eine Clipart- und Sticker-Bibliothek, Schatten und Effekte, ein freies Farbrad für Flächen und skizzierte Formen (`roughjs`). Alle vier sind schnell gebaut und machen das Buch zum Bastelbogen. CEWE rät selbst, Schmuck sparsam einzusetzen [Q25].

**Für den Kano-Fragebogen** (`features.survey` in `qfd.json`) schlagen wir zwei neue Zeilen vor, damit Formen und Handschrift ein K bekommen statt einer Vermutung:
- *funktional:* „Du kannst mit dem Apple Pencil oder der Maus direkt ins Buch schreiben und zeichnen.“ / *dysfunktional:* „… das geht nicht.“
- *funktional:* „Du kannst Linien, Pfeile, Rahmen und Klebestreifen auf die Seiten setzen.“ / *dysfunktional:* „… das geht nicht.“

Unsere Vermutung: Handschrift ist **A** (Begeisterung), Formen sind eher **I** bis **O**. Wenn das stimmt, gehört die Arbeit eher in den Stift als in eine große Formenbibliothek.

---

## 4. Bedienkonzept: viele Werkzeuge, trotzdem einfach

### 4.1 Grundsätze

1. **Vier Modi, nicht mehr:** Auswahl (V), Text (T), Form (R/O/L/⇧L), Stift (P). Der Modus steht immer sichtbar in einer Leiste. Esc führt immer zurück zu Auswahl.
2. **Nach einer Form zurück zur Auswahl.** Text springt nach dem Anlegen ohnehin in die Bearbeitung. Nur der Stift bleibt offen, bis man „Fertig“ oder Esc drückt, wie in Freeform und GoodNotes.
3. **Progressive Disclosure in drei Stufen:**
   - **Stufe 1, immer sichtbar:** Modusleiste plus Rückgängig/Wiederholen.
   - **Stufe 2, schwebende Leiste am gewählten Element:** höchstens 6 Bedienelemente, nur Dinge für *dieses* Element (wie heute `TextToolbar`). Keynote, Freeform und Canva machen es genauso [Q56][Q57][Q58].
   - **Stufe 3, „Mehr …“ und Kontextmenü:** seltene Dinge wie Beschreibung, Stil kopieren, Ebene, Maske, Drehung des Klebestreifens.
4. **Figma hat schwebende Panels mit UI3 wieder abgeschafft,** weil sie auf kleinen Bildschirmen die Arbeitsfläche zustellten [Q63]. Bei uns bleibt die schwebende Leiste deshalb **klein und einzeilig**. Alles Größere wandert in die bestehende Seitenspalte (heute „Ebenen“) und auf dem iPhone in ein Blatt von unten.
5. **Gute Vorgaben statt Regler:** drei Stärken, drei Deckkräfte, eine Palette aus Buchfarben plus Fotofarben. Wer eine eigene Farbe will, findet sie hinter „Eigene Farbe“, wie heute beim Text.
6. **Jedes Werkzeug auch ohne Ziehen:** Ein Klick oder Tipp legt die Standardform an eine freie Stelle. Das ist wichtig für Tastatur, Screenreader und das iPhone.
7. **Apple HIG:** nicht zu viele Elemente in eine Leiste [Q64]. Die Modusleiste hat vier Knöpfe, die kontextabhängige Leiste höchstens sechs.

### 4.2 Skizze: Bühne, Desktop

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ ← Zur Übersicht   Doppelseite 3                              Rückgängig  Wiederholen  ⌘K │
│                                                                                          │
│ [▸ Auswahl V] [T Text] [□ Form ▾] [✎ Stift P]      ← Modusleiste (ersetzt „Text + …“)    │
│                                                                                          │
│   ┌─────────────────────────────┬─────────────────────────────┐   ┌──────────────────┐   │
│   │                             │                             │   │ Ebenen           │   │
│   │   ┌──────────┐              │      ┌──────────────────┐   │   │  ✎ Zeichnung     │   │
│   │   │  Foto 1  │   ╭──╮       │      │                  │   │   │  → Pfeil         │   │
│   │   │          │  ╱ ↘  ╲      │      │      Foto 2      │   │   │  ▢ Foto 2        │   │
│   │   └──────────┘  ╰─────╯     │      │                  │   │   │  ▢ Foto 1        │   │
│   │          ┌──────────────────────────────┐             │   │   └──────────────────┘   │
│   │          │ ━ ● ◐ ○ │ ▬ ▬▬ ▬▬▬ │ ⟶ ⟷ │ ⋯ │  ← schwebend │   │                          │
│   │          └──────────────────────────────┘    (Pfeil)   │   │                          │
│   │   ↗ „hier haben wir gewohnt“                          │   │                          │
│   └─────────────────────────────┴─────────────────────────────┘                          │
│                                                                                          │
│ Alle Fotos · ziehen oder antippen …   [▢][▢][▢][▢]                                       │
└──────────────────────────────────────────────────────────────────────────────────────────┘

Form ▾ klappt auf:   [ ─ Linie L ] [ → Pfeil ⇧L ] [ □ Rahmen R ] [ ○ Ellipse O ]
                     (Paket 2:) [ ▱ Klebestreifen ] [ ◸ Fotoecken ] [ ▭ Etikett ]

Stift-Modus ersetzt die Modusleiste durch die Stiftleiste:
[ Füller | Fineliner | Marker ]  [ • ● ⬤ ]  [ ■ Tinte ■ Grau □ Weiß ■ Einband ◎ aus dem Foto ]  [ ⌫ Radierer ]  [ ☐ Mit dem Finger zeichnen ]   [ Fertig ]
```

### 4.3 Skizze: iPad und iPhone

```
iPad (Querformat), Stift-Modus                       iPhone, Auswahl, Form gewählt
┌─────────────────────────────────────────┐          ┌───────────────────┐
│ ← Übersicht                Rückg. Wiederh│          │ ←   Doppelseite 3 │
│ [Füller][Fine][Marker] • ● ⬤  ■■□■◎  ⌫ ✓│          │ ┌───────────────┐ │
│ ┌──────────────────┬──────────────────┐ │          │ │  linke Seite  │ │
│ │  Pencil zeichnet │  Finger scrollt  │ │          │ │   ○  ←gewählt │ │
│ │  (Hover-Punkt)   │  und wählt       │ │          │ └───────────────┘ │
│ └──────────────────┴──────────────────┘ │          │ ┌───────────────┐ │
└─────────────────────────────────────────┘          │ │━ ● ◐ ○ │ ▬ │ ⋯│ │ ← Blatt von unten
                                                     │ └───────────────┘ │
                                                     │ [V] [T] [□] [✎]   │ ← Modi unten, Daumen
                                                     └───────────────────┘
```

### 4.4 Kontextmenü (Rechtsklick / langes Drücken)

Was es heute für Fotos und Text gibt (Ausschneiden, Kopieren, Einfügen, Duplizieren, Ebene, Löschen), gilt auch für Formen und Zeichnungen. Neu dazu kommen:
- **Form:** „In Rahmen/Ellipse umwandeln“, „Stil kopieren“, „Stil einfügen“.
- **Zeichnung:** „Weiterschreiben“ (= Doppelklick), „Beschreibung …“, „Stil kopieren“.
- **Foto:** „Oval maskieren“ (Paket 2), „Fotoecken“ (Paket 2).

---

## 5. Umsetzungspakete

Aufwand: **S** bis 1 Tag, **M** 2–3 Tage, **L** 4–5 Tage, jeweils für einen Agenten-Durchgang mit Prüfen im Browser.

### Paket 1: Formen + Stift (L, ein Durchgang)

**Umfang**
1. **Typen:** `ShapeKind`, `ShapeLook`, `LineEnds`, `InkStroke` und die Zweige `shape`/`ink` in `FreeItem` und `FreeEl`. Der Durchlauf in `build()` (`books.ts`) und in `useMemo pages` (`stage.tsx`). `collides()` nimmt Formen und Tinte aus. `SCHEMA` bleibt 3, weil alles optional ist und alte Bücher unverändert öffnen.
2. **Satz:** `El.path`, `shapeEls` (line, arrow, rect, ellipse), `inkEls`, `src/lib/ink-codec.ts` (Vereinfachen, Quantisieren, Delta, Base64) in `layout.ts`.
3. **Darstellung:** `case "path"` in `page-view.tsx` und `page-texture.ts` (Abschnitt 1.4).
4. **Bühne:** Modusleiste (Auswahl, Text, Form, Stift). Formen aufziehen oder per Klick anlegen, mit Einrasten und Shift/Alt. Endgriffe für Linie und Pfeil. Schwebende Formleiste (Kontur, Stärke, Füllung, Deckkraft, Linienenden, Strich).
5. **Stift:** Pointer Events mit `getCoalescedEvents` (wo vorhanden), Pointer Capture und `touch-action: none` nur im Stift-Modus. Palm Rejection wie in 2.2. Drei Stifte, drei Breiten, vier Farben, Strich-Radierer. Zeichnungen gruppieren Striche (2.4). Hover-Punkt für den Pencil.
6. **Abhängigkeit:** `perfect-freehand@1.2.3`, genau festgeschrieben. Vorher die Prüfung nach AGENTS.md (Herausgeber, Repository) und Abfrage über Context7.
7. **Wächter** für die Buchgröße (2.4).

**Nicht in Paket 1:** Klebestreifen, Fotoecken, Etikett, Maske, Drehung, Pixel-Radierer, Lasso, Begradigen, Pipette.

**Akzeptanzkriterien**
- [ ] Ein Rechteck lässt sich mit der Maus aufziehen. Mit gedrückter Shift-Taste wird es ein Quadrat, bei dem gemessenes `realRatio` = 1 ± 0,5 % ist. Die Ecken rasten auf Rasterlinien und auf Fotokanten ein, mit gedrückter Alt-Taste nicht.
- [ ] Ein Klick auf „□ Rahmen“ ohne Ziehen legt einen Rahmen an eine freie Rasterzelle. Danach steht der Modus wieder auf Auswahl, und der Rahmen ist gewählt.
- [ ] Ein Pfeil mit Spitze am Ende lässt sich an beiden Enden ziehen. Mit gedrückter Shift-Taste rastet der Winkel in 45°-Schritten.
- [ ] Kontur, Stärke (3), Füllung, Deckkraft (3), Linienenden und Strich sind in der schwebenden Leiste änderbar. Jede Änderung ist **ein** Rückgängig-Schritt.
- [ ] **Deckungsgleich:** Eine Testdoppelseite mit allen vier Formen in allen Stärken, mit 60 % Deckkraft und einer Zeichnung über den Bund ergibt im Pixelvergleich zwischen HTML (Playwright-Screenshot) und `drawPage`-Canvas weniger als 0,5 % abweichende Pixel. Beim Umblättern springt nichts.
- [ ] Mit dem Apple Pencil in Safari auf dem iPad hängt die Strichbreite beim Füller sichtbar vom Druck ab. Auflegen der Hand während des Schreibens erzeugt keinen Strich. Der Finger scrollt die Bühne, sobald einmal der Stift benutzt wurde.
- [ ] Ohne Pencil (iPhone) zeichnet der Finger im Stift-Modus. Der Schalter „Mit dem Finger zeichnen“ zeigt das an.
- [ ] Mit der Maus in Safari auf dem Mac wird ein schnell gezogener Kreis glatt, ohne Zacken (`streamline` für die Maus). `pressure === 0.5` setzt `sim`.
- [ ] Jeder Strich ist ein Rückgängig-Schritt. Der Radierer löscht ganze Striche. Eine leere Zeichnung verschwindet.
- [ ] Eine Zeichnung lässt sich in der Auswahl verschieben, proportional skalieren, stapeln, kopieren, einfügen und löschen. Ein Doppelklick schreibt in ihr weiter.
- [ ] **Speicher:** Eine Testzeichnung mit 10 000 Rohpunkten belegt nach dem Codieren höchstens 80 kB im Buch-JSON. Decodieren und erneutes Codieren ergibt denselben String (Test). Der Wächter warnt ab 700 kB.
- [ ] Alte Bücher (Schema 3 ohne Formen) öffnen pixelgleich (Pixelvergleich vorher/nachher).
- [ ] Freigabe und Gastansicht zeigen Formen und Zeichnungen, auch im statischen Export ohne Canvas auf dem Server.
- [ ] Tastatur: Mit `R`, `O`, `L` und `⇧L` werden Formen angelegt, die Pfeiltasten verschieben sie, Esc beendet jeden Modus. Formen haben einen Namen in der Ebenen-Liste und für Screenreader („Pfeil, linke Seite, Spalte 2“). Zeichnungen sind ohne Beschreibung `aria-hidden`.
- [ ] `prefers-reduced-motion`: Die Leisten erscheinen ohne Bewegung.
- [ ] `npm run lint`, `npx tsc --noEmit` und `npm run build` laufen fehlerfrei. Geprüft wird bei 1440px und 375px.

### Paket 2: Material (M)
Klebestreifen (4 Farben, 5 feste Schrägen, Zacken aus `seed`), Fotoecken (Ein-Klick-Aktion am Foto, ändert die Größe mit dem Foto), Etikett (`TextLook.bg` plus Innenabstand), Oval-Maske für Fotos.
*Akzeptanz:* alles deckungsgleich wie in Paket 1. Fotoecken folgen dem Foto beim Verschieben und Skalieren. Die Oval-Maske ändert Ausschnitt, Fokus und Zoom nicht.

### Paket 3: Mehrfachauswahl, Ausrichten, Gruppieren (M)
⇧-Klick, Rahmen aufziehen, Ausrichten (links, mitte, rechts, oben, mitte, unten) an der Auswahl oder an der Seite, Verteilen ab 3 Elementen, ⌘G/⌘⇧G.
*Akzeptanz:* Ausrichten ist ein Rückgängig-Schritt. Die Gruppe bewegt und kopiert sich gemeinsam. Bei einer Gruppe über den Bund bleiben die Hälften gepaart.

### Paket 4: Farbe aus dem Foto und Seitenhintergrund (M)
Palette aus den Fotos der Doppelseite, eigene Pipette (Pixel aus dem geladenen Bild), Hintergrund in Papier, Leinen oder Fototon.
*Akzeptanz:* funktioniert in Safari auf Mac, iPad und iPhone ohne `EyeDropper`-API. Text auf dem Hintergrund behält mindestens 4,5:1 Kontrast, sonst erscheint ein Hinweis.

### Paket 5: Stempel aus Metadaten (S–M)
Datum und Ort aus EXIF als Mono-Textrahmen. Das Rezept nur auf ausdrücklichen Wunsch.
*Akzeptanz:* Fehlt das Datum, gibt es keinen Stempel statt eines falschen. Nichts aus den Kameradaten erscheint ungefragt (DESIGN.md, K24).

### Paket 6: Befehlspalette und Kürzel-Hilfe (S–M)
⌘K mit Suche über alle Befehle der Bühne, `?` für die Kürzel-Tafel.
*Akzeptanz:* Jeder Knopf der Bühne ist auch über ⌘K erreichbar. Die Palette ist komplett mit der Tastatur bedienbar und hat Fokusfalle und Esc.

### Paket 7: Stift für Fortgeschrittene (M)
Pixel-Radierer (teilt Striche), Lasso-Auswahl von Strichen, Halten begradigt, Shift zeichnet gerade, Stil übertragen.
*Akzeptanz:* Ein geteilter Strich ergibt zwei Striche mit denselben Eigenschaften. Lasso und Verschieben sind ein Rückgängig-Schritt.

### Paket 8: Gestaltung übertragen und Vorschläge (M–L)
Die Anordnung einer Doppelseite lässt sich auf andere Fotos übertragen, dazu kommen drei regelbasierte Vorschläge pro Doppelseite (Workshop-Paket 5).
*Akzeptanz:* Ein Vorschlag verändert nur die gewählte Doppelseite (K4). Die Miniaturen kommen aus derselben `layoutPage`.

**Reihenfolge:** 1 → 2 → 3 → 6 → 4 → 5 → 7 → 8. Paket 6 ist klein, macht aber alle späteren Werkzeuge auffindbar. Deshalb steht es vor den größeren Paketen.

---

## Quellen

Abgerufen im Oktober 2026. Canva-Hilfeseiten ließen sich nicht direkt laden. Die Angaben dazu stammen aus den Auszügen der Hilfeseiten in der Suche.

**Formen und Bedienung**
- [Q1] Microsoft: Add shapes (PowerPoint), https://support.microsoft.com/en-us/powerpoint/add-shapes
- [Q2] Microsoft: Insert a circle, https://support.microsoft.com/en-us/office/insert-a-circle-8f73a78d-742a-483f-af48-f2eaf661dcf6
- [Q3] Microsoft: Lock Drawing Mode, Formeffekte, wie Q1
- [Q4] Microsoft: Draw or delete a line or connector, https://support.microsoft.com/en-US/PowerPoint/draw-or-delete-a-line-or-connector
- [Q5] Microsoft: Edit Points, https://support.microsoft.com/en-us/topic/44d7bb9d-c05c-4e1c-a486-e35fc322299b
- [Q6] Microsoft: Smart Guides, https://support.microsoft.com/en-US/PowerPoint/training/guides-for-arranging-things-on-a-slide
- [Q7] Microsoft: Crop to Shape, https://support.microsoft.com/en-us/office/graphics-visuals/crop-a-picture-to-fit-in-a-shape
- [Q8] Apple: Keynote, Formen hinzufügen, https://support.apple.com/guide/keynote/add-and-edit-a-shape-tanbbe3614e0/mac
- [Q12] Apple: Keynote, Mask with Shape, https://support.apple.com/guide/keynote/tan811faceea/mac
- [Q13] Apple: Freeform, Formen, https://support.apple.com/guide/freeform/frfm8479c716/mac
- [Q14] Apple: Freeform, Linienenden und Verbindungslinien, wie Q13
- [Q17] Figma: Shape tools, https://help.figma.com/hc/en-us/articles/360040450133
- [Q18] Figma: Masks, https://help.figma.com/hc/en-us/articles/360040450253-Masks
- [Q19] Figma: Ausrichten, Einrasten, Smart Selection, https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions
- [Q20] Canva: Frames, https://www.canva.com/help/using-frames/
- [Q21] Canva: Linien, https://www.canva.com/help/connect-lines-to-elements/
- [Q23] Adobe: Express, Formen, https://helpx.adobe.com/express/web/add-images-and-visuals/charts-tables-shapes/add-and-customize-shapes.html
- [Q24] Adobe: Express, Crop to Shape, https://helpx.adobe.com/express/web/image-creation-and-editing/edit-images/crop-and-shape-images.html

**Fotobuch-Dienste**
- [Q25] CEWE: Cliparts, Masken, Rahmen, https://cewe.co.uk/blog/creator-software-tutorials/designing-with-clipart-masks-and-frames.html
- [Q38] Snapfish: Basic Embellishments, https://blog.snapfish.co.uk/basic-embellishments/
- [Q39] Mixbook: Editor-Tipps (Farbpipette, Spreads duplizieren), https://www.mixbook.com/inspiration/editor-advanced-tips-and-tricks
- [Q39b] Mixbook: Auto-Create, https://www.mixbook.com/inspiration/auto-create-make-photo-books-in-minutes
- [Q56b] PC-Welt: CEWE-Fotobuch, https://www.pcwelt.de/article/1159156/cewe-fotobuch-erinnerungen-zum-blaettern.html
- [Q60] Shutterfly: Autofill, https://www.shutterfly.com/ideas/how-to-organize-photos-for-a-photo-book-using-ai/
- [Q61] Artifact Uprising: Book Building Tips, https://www.artifactuprising.com/diy/tips-for-artifact-uprising-book-building

**Ausrichten, Befehle, Farbe, KI, Oberfläche**
- [Q26] Figma: Ausrichten (Alt+W/A/S/D), wie Q19
- [Q26b] Figma: Actions menu, https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design
- [Q27] Figma: Keyboard shortcuts panel, https://help.figma.com/hc/en-us/articles/360040328653-Use-Figma-products-with-a-keyboard
- [Q28] Microsoft: Align and arrange objects, https://support.microsoft.com/en-us/office/align-and-arrange-objects-on-a-slide-5f961535-a2ae-4914-a24a-94c669903ae3
- [Q29] Apple: Keynote, Objekte ausrichten, https://support.apple.com/guide/keynote/position-and-align-objects-tanb46504b79/mac
- [Q30] Canva: Ebenen, Gruppieren, Ausrichten, https://www.canva.com/help/layer-group-align/
- [Q30b] Canva: Seiten verwalten, https://www.canva.com/help/manage-pages/
- [Q31] Canva: Quick actions, https://www.canva.com/help/slash-magic-shortcut-commands/
- [Q32] Canva: Elementfarbe, Palette aus dem Bild, https://www.canva.com/help/element-color/
- [Q32b] Figma: Eyedropper, https://help.figma.com/hc/en-us/articles/27643269375767-Sample-colors-with-the-eyedropper-tool
- [Q32c] Apple: Keynote iPad, Hintergrund und Pipette, https://support.apple.com/guide/keynote-ipad/change-a-slide-background-tan52c1cf827/ipados
- [Q55] caniuse: EyeDropper API, https://caniuse.com/mdn-api_eyedropper, und MDN: https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API
- [Q56] Apple: Keynote, Format-Seitenleiste, https://support.apple.com/guide/keynote/show-or-hide-sidebars-tan391376b09/mac
- [Q57] Apple: Freeform iPad, Objekte positionieren und Stil kopieren, https://support.apple.com/guide/ipad/position-items-on-a-board-ipad0b4f22b0/ipados
- [Q58] Microsoft: PowerPoint Designer, https://support.microsoft.com/en-us/office/get-design-ideas-for-slides-with-powerpoint-designer-6f0ec776-cc58-4d0c-baab-051ba837b7a0, und Canva: kontextabhängige Leiste, https://www.canva.com/help/glow-up-variantb/
- [Q59] Canva: Layouts, https://www.canva.com/help/using-layouts/
- [Q62] Adobe: Express Text to Template, https://helpx.adobe.com/express/web/create-with-templates/text-to-template.html
- [Q63] Figma: UI3, https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/
- [Q64] Apple: Human Interface Guidelines, Toolbars, https://developer.apple.com/design/human-interface-guidelines/toolbars

**Stift und Technik**
- [Q33] Apple: iPad, Zeichnungen in Freeform (Draw with Finger, Halten begradigt, Durchstreichen löscht), https://support.apple.com/guide/ipad/drawings-ipadf825a0bd/ipados
- [Q34] GoodNotes: Stylus & Palm Rejection, https://support.goodnotes.com/hc/en-us/articles/7353727026959 (nur Suchauszug)
- [Q34b] GoodNotes: Eraser, https://support.goodnotes.com/hc/en-us/articles/7353718249231 (nur Suchauszug)
- [Q35] Procreate: Gesten, https://help.procreate.com/procreate/handbook/interface-gestures/gestures (Einstellung nur aus Drittquellen bestätigt)
- [Q36] Procreate: Brush Studio, StreamLine, https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings
- [Q37] Apple: Pages iPad, Objekt- und Pixel-Radierer, https://support.apple.com/guide/pages-ipad/tane3a18e6f4/ipados
- [Q40] perfect-freehand, README, https://github.com/steveruizok/perfect-freehand
- [Q41] W3C: Pointer Events Level 3 (Recommendation, 30.6.2026), https://www.w3.org/TR/pointerevents3/
- [Q42] MDN Browser Compat Data: PointerEvent, https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json, und touch-action: https://github.com/mdn/browser-compat-data/blob/main/css/properties/touch-action.json
- [Q43] Apple Developer Forums: Pencil-Abtastrate in Safari, https://developer.apple.com/forums/thread/776468
- [Q44] Flutter Engine: Workaround für coalesced events in iOS 18.2, https://dart.googlesource.com/external/github.com/flutter/engine/+/23447c4674b0837ada66d29099147e05a695cec4
- [Q45] Apple Developer Forums: Pencil-Latenz, https://developer.apple.com/forums/thread/689375
- [Q46] WebKit Bug 296943: Pencil hover, roll, https://bugs.webkit.org/show_bug.cgi?id=296943
- [Q47b] Apple Developer Forums: Squeeze in Safari, https://developer.apple.com/forums/thread/760238
- [Q47] npm-Register (Versionen, Lizenzen, Maintainer), https://registry.npmjs.org/perfect-freehand und entsprechend für die anderen Pakete; Downloads über https://api.npmjs.org/downloads/point/last-week/; Größen über https://bundlephobia.com/api/size?package=
- [Q48] Firebase: Quotas and limits, https://firebase.google.com/docs/firestore/quotas
- [Q48b] Firebase: Storage size calculations, https://firebase.google.com/docs/firestore/storage-size
- [Q49] tldraw: Lizenz, https://github.com/tldraw/tldraw/blob/main/LICENSE.md; eigene Freehand-Kopie: https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/shapes/shared/freehand/getStroke.ts
- [Q50] Firebase: Data types (keine Arrays in Arrays), https://firebase.google.com/docs/firestore/manage-data/data-types
- [Q51] MDN: Path2D()-Konstruktor, https://developer.mozilla.org/en-US/docs/Web/API/Path2D/Path2D
- [Q52] simplify-js, https://github.com/mourner/simplify-js
- [Q53] Excalidraw: freedraw-Typ und Druckerkennung, https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/types.ts und https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/App.tsx
- [Q54] Paper.js: Path.simplify, http://paperjs.org/reference/path/#simplify
