# Formen und Stift: Prototyp auf der Bühne

Stand 7. Oktober 2026. Ergänzt die Recherche in `docs/editor-ideen.md` (Ideen-Sitzung) um einen lauffähigen Prototyp des ersten Pakets „Formen + Stift“.

## Was der Prototyp kann

| Werkzeug | Kürzel | Bedienung |
|---|---|---|
| Auswahl | `V` | wie bisher |
| Stift | `P` | zeichnen mit Maus, Finger oder Apple Pencil; bleibt aktiv, bis `Esc` oder `V` |
| Radierer | `E` | über Striche wischen löscht ganze Striche; Formen und Fotos bleiben |
| Linie, Pfeil | `L`, `A` | aufziehen; `Shift` rastet in 45°-Schritten, die Endpunkte lassen sich einzeln ziehen |
| Rechteck, Kreis | `R`, `O` | aufziehen; `Shift` macht Quadrat bzw. Kreis |
| Klebestreifen | `K` | aufziehen wie eine Linie, z. B. schräg über eine Fotoecke; Farbe des Einbands, Enden gerissen |

- Ein Klick ohne Ziehen legt eine Form in Standardgröße hin. Danach ist die Form gewählt und die Auswahl wieder aktiv (wie Keynote und PowerPoint).
- Kanten und Endpunkte rasten am Raster, an Seitenkanten und an Nachbarn ein, `Alt` setzt frei.
- Seitenleiste für eine gewählte Form: Kontur, Fläche (Rechteck, Kreis), Strich fein/mittel/kräftig, gestrichelt, Duplizieren, Ebenen, Entfernen. Die zuletzt gewählten Werte gelten für die nächste Form.
- Farben: Tinte, Grau, Papier, Weiß, die vier Einbandfarben, der Einband dieses Buchs und eine eigene Farbe. Keine Verläufe, keine Schatten.
- Formen und Zeichnungen dürfen auf Fotos liegen (Pfeil auf ein Detail, Klebestreifen über eine Ecke). Sie verdrängen keine Bildunterschrift.
- Getroffen wird nur das Gezeichnete: Ein Klick neben den Pfeil wählt das Foto darunter.
- Jede Geste ist ein Rückgängig-Schritt, ein Radier-Wisch ist einer.

### Stift

- Striche, die gezeichnet werden, solange der Stift gewählt ist, bilden **eine Zeichnung**. Sie lässt sich als Ganzes verschieben, skalieren, umfärben und stapeln, in der Ebenenliste steht sie als „Zeichnung, 3 Striche“.
- Glättung und Strichbreite: `perfect-freehand` 1.2.3 (MIT, Steve Ruiz, rund 2 kB gzip). Mit Apple Pencil kommt die Breite aus dem echten Druck, mit Maus aus dem Tempo.
- `getCoalescedEvents()` holt alle Zwischenpunkte, damit Kurven mit dem Pencil in Safari nicht eckig werden.
- Handballen: Sobald das Gerät einmal einen Stift gemeldet hat, zeichnet der Finger nicht mehr. Ein Browser bietet dafür keine eigene Schnittstelle. Laut Recherche der Ideen-Sitzung machen Freeform, GoodNotes und Procreate es genauso.
- Gespeichert wird je Strich `{ c: Farbe, s: Breite, p: [x, y, Druck, …] }` mit Werten von 0 bis 1000 in der Box der Zeichnung, also flach und ohne Arrays in Arrays (Firestore). Vorher vereinfacht Ramer-Douglas-Peucker die Punkte (Toleranz 0,06 cqw).

### Darstellung

`layoutFree` (in `src/content/layout.ts`) macht aus Formen und Strichen Pfade in cqw (`src/content/shapes.ts`). Das HTML zeichnet sie als SVG, die Textur fürs Umblättern als `Path2D` aus demselben Pfad-String. Damit sind beide per Konstruktion deckungsgleich, so wie es die Ideen-Sitzung verlangt.

## Geprüft

- Statischer Testbuild mit Fake-Login (`NEXT_PUBLIC_FUJI_MOCK=1`), Playwright in Chromium bei 1440, 820 und 375px.
- Gezeichnet, Formen aufgezogen, radiert, einen Pfeil über seiner Linie gegriffen und verschoben. Danach zeigen Übersicht und Leseansicht alles an derselben Stelle.
- **Nicht geprüft:** echter Apple Pencil auf dem iPad und Safari auf dem Mac. Das Umblättern mit WebGL-Textur lief im Headless-Browser nicht und ist deshalb nicht im Bild geprüft.

## Empfehlung

1. **Formen und Stift so behalten** und auf dem iPad mit Pencil ausprobieren. Danach Glättung und Breiten nachstellen, die Werte stehen in `strokePath` und `PEN_SIZES`.
2. **Als Nächstes Foto-Masken** (Kreis und Rechteck mit runden Ecken als Ausschnitt eines Fotos, wie „Crop to Shape“ in PowerPoint). Sie passen ins vorhandene Zuschneiden. Ich würde nur Kreis und Oval anbieten, damit kein Bastelbogen entsteht.
3. **Farbpipette aus dem Foto** für Formen, Stift und Text. Safari hat keine EyeDropper-API, also auf dem Canvas des Fotos abtasten. Das passt zum Grundsatz „Die Farben kommen aus den Fotos“.
4. **Marker** als zweite Spitze (breit, halb durchsichtig) und ein Lasso, um Striche einer Zeichnung einzeln zu wählen. Beides erst, wenn der Stift sich auf dem iPad bewährt hat.

Bewusst weggelassen habe ich Drehen, Schatten, Verläufe, Sterne, Sprechblasen und freie Polygone. Sie machen das Buch unruhig und kosten viele Knöpfe (QFD S37).
