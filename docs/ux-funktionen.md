# Funktionen des Editors, einzeln geprüft

Stand: 7. Oktober 2026. Simulierte Expertenbewertung mit echten Durchläufen in Playwright, keine Nutzertests. Maschinenlesbare Fassung: `src/content/funktionen.json`. Vorgänger: `docs/ux-kritik.md` (K1 bis K23), Grundlage: `docs/editor-workshop.md`, Abschnitt 6.

## Kurzfassung

Der Editor hat die hohe Decke erreicht: freie Lage, Griffe mit Raster, Zuschneiden auf der Seite, Ebenen, vier Schriften, Größe in Punkt, Farben, Kopieren und Einfügen. Auch der Boden ist niedrig: Fotos reinziehen, nach 1,6 Sekunden steht ein Buch, ohne dass man irgendetwas anfassen muss. Was fehlt, ist der Weg dazwischen. Viele Funktionen sind nur über Doppelklick, Alt, Rechtsklick oder langes Drücken erreichbar und werden nur in einem Hilfetext unter der Seite erklärt. Mehrere Funktionen gibt es drei- oder viermal (helle Schrift, Ebenen, Ausschnitt), und an einigen Stellen hat die Fehlertoleranz Lücken: Die Bühne verschwindet bei „Rückgängig“ und bei „Auf Vorschlag zurücksetzen“ ohne Hinweis, Entf auf einer Kopie nimmt alle Kopien vom Blatt, und auf der Bühne zeigt nichts an, ob gespeichert ist. Fast alles davon lässt sich mit kleinem Aufwand beheben.

**Urteil:** Anpassbar: 4,5 von 5. Einfach: 3 von 5. Das Ziel „super einfach, voll anpassbar“ ist zu etwa drei Vierteln erreicht. Die Anpassbarkeit ist da. Einfach wird es, wenn Doppelungen wegfallen, der Werkzeugkasten nach Progressive Disclosure gestuft wird und die Bühne nie überraschend verschwindet.

## Methode

- **Build:** `NEXT_PUBLIC_FUJI_MOCK=1 STATIC_EXPORT=1 npx next build`, ausgeliefert mit einem kleinen Python-Server auf `localhost:4301` (`/neu` → `/neu.html`).
- **Werkzeug:** Playwright mit Chromium, 1440 × 900 mit Maus und Tastatur, 375 × 812 mit Touch-Emulation (Ziehen und langes Drücken über CDP-Touch-Ereignisse), einmal mit `prefers-reduced-motion: reduce`.
- **Testdaten:** 10 Fotos aus `public/photos/japan/` per synthetischem Drop auf den Kopf, dazu eine selbst gebaute DNG (TIFF mit eingebettetem JPEG), eine kaputte `.heic` und eine `.txt`.
- **Bewertung je Funktion** auf vier Achsen von 1 (schlecht) bis 5 (sehr gut):
  - **Auffindbarkeit:** Findet man die Funktion ohne Anleitung?
  - **Einfachheit:** Wie wenig muss man wissen und tun?
  - **Anpassbarkeit:** Wie weit kommt man damit?
  - **Fehlertoleranz:** Wie leicht geht ein Fehlgriff zurück, und merkt man ihn?
- **Aufwand:** S bis zu einem halben Tag, M ein bis drei Tage, L mehr.

### Grenzen

- Nur Chromium. Michel arbeitet in Safari: Doppelklick-Erkennung, ⌘-Kurzbefehle und HEIC verhalten sich dort anders. Die Safari-Fälle (z. B. ⌘S) sind aus der Dokumentation abgeleitet, nicht gemessen.
- Echte HEIC-Dateien ließen sich hier nicht erzeugen, geprüft ist nur der Fehlerweg. Die DNG war synthetisch.
- Im Mock speichert alles sofort im Speicher der Seite. Langsames Netz, Offline und Speicherfehler sind nicht geprüft.
- Eine Gutachterin findet nur einen Teil der Probleme (Nielsen & Landauer 1993). Der Test mit fünf Freunden aus `ux-kritik.md` bleibt nötig.

## Speichern: Reicht es ohne Knopf?

**Frage:** Auf der Bühne gibt es keinen Speichern-Knopf, nur „Zur Übersicht“. Gespeichert wird bei jeder Geste von selbst. Reicht das?

**Antwort:** Das Modell ist richtig, die Rückmeldung reicht aber nicht. Automatisches Speichern ist heute Standard: Google Docs, Figma, Keynote seit OS X Lion und Microsoft 365 speichern laufend, ohne dass man etwas tun muss. Alle diese Programme zeigen den Zustand aber sichtbar an: Google Docs neben dem Dokumentnamen, auch offline, Figma mit einem Hinweis bei ungesicherten Änderungen, Microsoft mit einem AutoSave-Schalter. Auf der Bühne fehlt diese Anzeige ganz. Die Bühne liegt als eigene Ebene über dem Editor und verdeckt dessen Zeile „Gespeichert“. Im Test stand beim Verlassen per Esc in der Übersicht noch „Speichert …“. Ein Fehler oder Offline-Zustand wäre auf der Bühne unsichtbar. Das verletzt Nielsens Heuristik 1 (Sichtbarkeit des Systemzustands). NN/g (Harley 2015) zeigt außerdem, dass das mentale Modell „ich muss speichern“ fest sitzt und dass Autosave und Speichern nebeneinander bestehen dürfen. Für Michel kommt Safari dazu: Wer aus Gewohnheit ⌘S drückt, bekommt Safaris eigenen Dialog „Sichern unter“ für die Webseite, weil der Editor ⌘S nicht abfängt.

**Empfehlung:** Kein Speichern-Knopf als Pflicht, aber vier kleine Ergänzungen (zusammen Aufwand S): 1. In der Kopfzeile der Bühne eine Statuszeile wie in der Übersicht, mit vier Zuständen: „Gespeichert“, „Speichert …“, „Offline, im Browser gesichert“ und „Nicht gespeichert · Erneut versuchen“. 2. ⌘S abfangen: Es speichert sofort und zeigt kurz „Alles gespeichert“. Mit ⇧⌘S öffnet sich „Stand sichern“ aus dem Verlauf, so wird aus der Gewohnheit ein echter Nutzen. 3. Beim Schließen des Tabs oder bei „Zum Tisch“ mit ungesicherten oder fehlgeschlagenen Änderungen erscheint die Rückfrage des Browsers (beforeunload). 4. „← Zur Übersicht“ bleibt der Name, denn er beschreibt das Ziel. Ein Knopf „Fertig“ würde eine Speicherhandlung versprechen, die es nicht gibt.

Vergleich:

| Programm                             | Speichert von selbst        | Zeigt den Zustand                                            | Eigener Sicherungspunkt                            |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Google Docs                          | ja                          | Status neben dem Dokumentnamen, auch offline                 | Versionsverlauf, benannte Versionen                |
| Figma                                | ja                          | Hinweis bei ungesicherten Änderungen, offline im Browser     | Checkpoint alle 30 Minuten, benannte Versionen     |
| Keynote (macOS Auto Save, seit 2011) | ja                          | Titelleiste, „Zurücksetzen auf“                              | stündlich oder öfter, „Alle Versionen durchsuchen“ |
| Microsoft 365                        | ja, mit Schalter            | AutoSave-Schalter oben links                                 | Versionsverlauf                                    |
| Fujiventura, Übersicht               | ja, 0,9 s nach der Änderung | „Speichert …“ / „Gespeichert“ / „Offline“ / „fehlgeschlagen“ | Verlauf, „Stand sichern“, alle 10 Minuten          |
| Fujiventura, Bühne                   | ja                          | **nichts**                                                   | wie Übersicht, aber nicht erreichbar               |

Quellen: `nielsen-h1`, `nng-autosave`, `gdocs-status`, `figma-offline`, `figma-versions`, `apple-lion-2011`, `apple-versions`, `ms-autosave`, `nng-floppy`, `safari-save`

## Gesamturteil: „super einfach, voll anpassbar“

- **Low Floor / High Ceiling** (Resnick et al. 2005, Myers et al. 2000): Der Boden ist sehr niedrig. Fotos reinziehen genügt, nach 1,6 s steht ein Buch, und ohne einen Handgriff ist es fertig. Die Decke ist hoch: freie Lage, Zuschneiden, Ebenen, vier Schriften, Punktgrößen, Farben, Kopieren zwischen Doppelseiten. Für die „wide walls“, also viele Wege zum Ergebnis, ist der Weg vom Boden zur Decke zu steil. Dazwischen liegen versteckte Gesten (Doppelklick, Alt, Rechtsklick, langes Drücken), die nur ein Hilfetext erklärt. Den lesen die wenigsten (Nielsen 1997).
- **Progressive Disclosure** (Nielsen 2006): Der Ansatz stimmt. Die Bühne öffnet sich erst auf Wunsch, der Werkzeugkasten erscheint erst bei einem gewählten Text. Innerhalb der Stufen wird aber nicht weiter gestuft: Freier Farbwähler, sechs Farben, vier Schriften und Ausrichtung stehen gleichrangig nebeneinander, und einige Funktionen gibt es drei- bis viermal. Gestuft heißt: zuerst Stil und Größe, alles Weitere hinter „Weitere …“.
- **Defaults** (Nielsen 2005): Sehr stark. Der Erstentwurf, der Originalformat-Magnet, links ausgerichteter Text, Platzhalter mit Markierung und eine freie Stelle für neue Elemente tragen alle, die nichts einstellen wollen.
- **Direct Manipulation** (Shneiderman 1983; Hutchins, Hollan & Norman 1985): Hier ist der Editor am besten. Man zieht, was man sieht, die Vorschau folgt sofort, jede Geste ist ein Rückgängig-Schritt, und Doppelklick führt wie in Keynote in die Maske. Die Kluft zwischen Absicht und Handlung ist klein. Gestört wird das Prinzip an drei Stellen: Beim Zuschneiden liegen zwei Griffarten auf demselben Punkt (B07), ein Doppelklick auf Text ersetzt den ganzen Text (B11), und Entf wirkt auf mehr als das Gewählte (B23).
- **Fehlertoleranz:** Rückgängig und Verlauf sind vorbildlich, aber an zwei Stellen springt die Bühne weg, ohne dass man es erwartet (B26, B27). Für jemanden, der probieren will, sind das die teuersten Momente, denn sie nehmen das Vertrauen ins Ausprobieren.

**Kurz:** Einzeln sind die Funktionen einfach (Schnitt 4,2 von 5). Schwierig ist das Ganze: Die Auffindbarkeit liegt im Schnitt nur bei 3,8, es gibt viele Doppelungen, und an einigen Stellen fehlt die Rückmeldung. Anpassbar ist der Editor schon jetzt voll, einfach ist er zu etwa 60 Prozent. Der Weg zu „super einfach“ führt über Weglassen und Rückmeldung, nicht über neue Funktionen.

## Bewertung je Funktion

| ID  | Bereich   | Funktion                                                                     | Auffindb. | Einfachh. | Anpassb. | Fehlertol. | Aufwand |
| --- | --------- | ---------------------------------------------------------------------------- | :-------: | :-------: | :------: | :--------: | :-----: |
| U01 | Übersicht | Fotos reinziehen (JPEG, HEIC, DNG) mit Fortschritt                           |     5     |     5     |    4     |     3      |    S    |
| U02 | Übersicht | Erstentwurf                                                                  |     5     |     5     |    3     |     4      |    S    |
| U03 | Übersicht | Doppelklick auf eine Doppelseite öffnet die Bühne                            |     3     |     5     |    4     |     4      |    S    |
| U04 | Übersicht | Layout (durchschalten)                                                       |     4     |     2     |    3     |     4      |    M    |
| U05 | Übersicht | Fixieren (Schloss)                                                           |     3     |     4     |    4     |     5      |    S    |
| U06 | Übersicht | Sortieren (Pfeile, Ziehen)                                                   |     3     |     4     |    4     |     4      |    S    |
| U07 | Übersicht | Doppelseite entfernen (×)                                                    |     3     |     4     |    3     |     3      |    S    |
| U08 | Übersicht | Textseite hinzufügen                                                         |     4     |     3     |    2     |     2      |    M    |
| U09 | Übersicht | Automatisch gestalten                                                        |     4     |     5     |    4     |     5      |    S    |
| U10 | Übersicht | Foto-Panel (Stern, Titel, Zusatz, Beschreibung, Ausschnitt, Einband, Ablage) |     4     |     3     |    5     |     4      |    S    |
| U11 | Übersicht | Ablage (Entf, Ins Buch)                                                      |     2     |     4     |    4     |     4      |    S    |
| U12 | Übersicht | Rückgängig und Wiederholen (Kopf, ⌘Z)                                        |     5     |     5     |    4     |     4      |    S    |
| U13 | Kopfzeile | Verlauf (Zwischenstände, Stand sichern, Datei)                               |     4     |     4     |    5     |     5      |    M    |
| U14 | Kopfzeile | Ansehen                                                                      |     5     |     5     |    3     |     5      |    S    |
| U15 | Kopfzeile | Hinlegen für …                                                               |     4     |     4     |    4     |     3      |    S    |
| T01 | Tisch     | Entfernen mit Rückgängig                                                     |     4     |     5     |    4     |     5      |    S    |
| T02 | Tisch     | Papierkorb (zurücklegen)                                                     |     2     |     5     |    4     |     5      |    S    |
| T03 | Tisch     | Papierkorb leeren mit Rückfrage                                              |     4     |     4     |    3     |     4      |    S    |
| T04 | Tisch     | Links ruhen im Papierkorb                                                    |     2     |     4     |    4     |     5      |    S    |
| B01 | Bühne     | Verschieben                                                                  |     5     |     5     |    5     |     5      |    S    |
| B02 | Bühne     | Griffe (Größe ändern)                                                        |     5     |     4     |    5     |     5      |    S    |
| B03 | Bühne     | Einrasten am Raster und Einrastlinien                                        |     5     |     5     |    4     |     4      |    M    |
| B04 | Bühne     | Originalformat-Magnet                                                        |     4     |     5     |    4     |     5      |    S    |
| B05 | Bühne     | Alt für frei setzen                                                          |     1     |     4     |    5     |     4      |    S    |
| B06 | Bühne     | Zuschneiden: Doppelklick öffnet den Modus, Bild ziehen                       |     4     |     4     |    5     |     4      |    M    |
| B07 | Bühne     | Zuschneiden: Ecken am Bild und Griffe am Rahmen                              |     3     |     2     |    5     |     4      |    M    |
| B08 | Bühne     | Zuschneiden beenden: Fertig, Abbrechen, Mehr, Esc, Klick daneben             |     5     |     4     |    4     |     4      |    S    |
| B09 | Bühne     | Textleiste (+ Überschrift, + Absatz, + Notiz)                                |     5     |     5     |    4     |     5      |    S    |
| B10 | Bühne     | Doppelklick aufs Papier legt Text an                                         |     3     |     5     |    4     |     4      |    S    |
| B11 | Bühne     | Doppelklick auf Text schreibt direkt                                         |     4     |     4     |    4     |     2      |    S    |
| B12 | Bühne     | Werkzeugkasten: Schriftart                                                   |     5     |     5     |    4     |     5      |    S    |
| B13 | Bühne     | Werkzeugkasten: Größe in pt                                                  |     5     |     4     |    5     |     5      |    S    |
| B14 | Bühne     | Werkzeugkasten: Fett und Kursiv                                              |     5     |     5     |    4     |     5      |    S    |
| B15 | Bühne     | Werkzeugkasten: Ausrichtung                                                  |     5     |     5     |    4     |     5      |    S    |
| B16 | Bühne     | Werkzeugkasten: Farben                                                       |     5     |     3     |    5     |     4      |    S    |
| B17 | Bühne     | Helle Schrift                                                                |     3     |     2     |    3     |     4      |    S    |
| B18 | Bühne     | Text und Fotos über den Bund                                                 |     4     |     5     |    5     |     4      |    S    |
| B19 | Bühne     | Ebenen-Liste, nach vorn und hinten                                           |     4     |     3     |    5     |     5      |    S    |
| B20 | Bühne     | Rechtsklick-Menü                                                             |     3     |     4     |    5     |     4      |    S    |
| B21 | Bühne     | ⌘C, ⌘X, ⌘V, ⌘D                                                               |     4     |     5     |    5     |     3      |    S    |
| B22 | Bühne     | Text aus anderen Apps einfügen                                               |     3     |     5     |    5     |     5      |    S    |
| B23 | Bühne     | Entf (Element entfernen)                                                     |     4     |     5     |    3     |     2      |    S    |
| B24 | Bühne     | Leiste „Alle Fotos“                                                          |     3     |     5     |    5     |     4      |    S    |
| B25 | Bühne     | Raster (G)                                                                   |     4     |     5     |    4     |     5      |    S    |
| B26 | Bühne     | Rückgängig auf der Bühne                                                     |     5     |     4     |    4     |     2      |    M    |
| B27 | Bühne     | Auf Vorschlag zurücksetzen                                                   |     4     |     4     |    3     |     2      |    S    |
| B28 | Bühne     | Handy 375 px: eine Seite, Ziehen, langes Drücken                             |     2     |     3     |    4     |     3      |    M    |
| B29 | Bühne     | Tastatur und Screenreader auf der Bühne                                      |     3     |     4     |    5     |     4      |    S    |
| B30 | Bühne     | Speichern-Rückmeldung (nur „Zur Übersicht“)                                  |     1     |     5     |    3     |     3      |    S    |
| B31 | Bühne     | Seitenpanel Foto und Textrahmen                                              |     4     |     3     |    4     |     4      |    M    |

Durchschnitt: Auffindbarkeit 3,8, Einfachheit 4,2, Anpassbarkeit 4,1, Fehlertoleranz 4,0.

## Funktionen im Einzelnen

### Übersicht

**U01 Fotos reinziehen (JPEG, HEIC, DNG) mit Fortschritt** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 3 · Aufwand S

- Beobachtung: Ich habe 10 JPEG, eine DNG mit eingebettetem JPEG, eine kaputte .heic und eine .txt auf den Kopf gezogen. Die Anzeige läuft pro Datei („liest …“, „lädt hoch …“, „fertig“) und die DNG kommt sauber an. Danach steht aber dauerhaft „0 von 1 Fotos im Buch“, weil die fertigen Einträge verschwinden und nur die Fehler bleiben. Die Fehler lassen sich nicht wegklicken, und „Erstentwurf nach … s“ erscheint deshalb nie. Einen Hinweis auf doppelte Fotos gibt es nicht. Echte HEIC-Dateien konnte ich nicht erzeugen, deshalb ist nur der Fehlerweg geprüft.
- Prinzip: Sichtbarkeit des Systemzustands: Die Rückmeldung muss stimmen, auch am Ende. (Quelle: `nielsen-h1`)
- Vorschlag: Am Ende „10 Fotos im Buch, 2 nicht lesbar“ anzeigen. Fehler mit „Ausblenden“ und einer kurzen Erklärung versehen (z. B. „HEIC aus Messenger? Bitte als JPEG sichern“). Doppelte Dateien gleich beim Einlesen erkennen und melden.

**U02 Erstentwurf** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 3, Fehlertoleranz 4 · Aufwand S

- Beobachtung: 10 Fotos ergeben in 1,6 s fünf Doppelseiten mit gemischten Typen. Man muss nichts wählen. Wer danach alles bis zum Anfang rückgängig macht, entfernt auch den Upload: Nach 14 Schritten war das Buch leer, und erst „Wiederholen“ holt es zurück.
- Prinzip: Gute Voreinstellungen tragen die meisten Nutzer, denn die meisten ändern sie nie. Niedrige Einstiegsschwelle. (Quelle: `nielsen-defaults`)
- Vorschlag: Den Upload nicht in den Rückgängig-Stapel legen, oder als Grenze („Fotos hinzugefügt“) markieren, die man nicht unbemerkt überschreitet.

**U03 Doppelklick auf eine Doppelseite öffnet die Bühne** · Auffindbarkeit 3, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Ein Doppelklick auf ein Foto der zweiten Doppelseite öffnet die Bühne sofort. Esc schließt sie wieder. Daneben gibt es den Link „Gestalten“, und ein Klick auf eine frei gestaltete Seite öffnet die Bühne ebenfalls. Der Doppelklick selbst wird nur im Hilfetext rechts und im Tooltip erklärt. Beim Öffnen bleibt der Fokus hinter der Bühne auf „Gestalten“, und Tab läuft durch die Übersicht im Hintergrund.
- Prinzip: Das Muster ist von Keynote bekannt (Doppelklick öffnet die Bearbeitung). Ein modaler Bereich muss aber den Fokus übernehmen. (Quelle: `wcag-apg-dialog`)
- Vorschlag: Beim Öffnen den Fokus auf „Zur Übersicht“ oder das erste Element setzen und die Übersicht dahinter mit „inert“ sperren. Beim Schließen den Fokus auf die Doppelseite zurückgeben.

**U04 Layout (durchschalten)** · Auffindbarkeit 4, Einfachheit 2, Anpassbarkeit 3, Fehlertoleranz 4 · Aufwand M

- Beobachtung: Ich habe „Layout“ an der zweiten Doppelseite 7-mal geklickt. Es gab 6 Varianten, ohne Anzahl und ohne Vorschau, danach beginnt alles von vorn. Jeder Klick fixiert die Doppelseite. Das ist Befund K8 aus der ersten Kritik und weiterhin offen. Bei frei gestalteten Doppelseiten fehlt der Knopf ganz, dort gibt es nur „Auf Vorschlag zurücksetzen“.
- Prinzip: Wiedererkennen statt Erinnern. Wenige sichtbare Optionen sind schneller gewählt als blindes Durchschalten. (Quelle: `nielsen-10`)
- Vorschlag: Den Knopf ersetzen durch eine Reihe kleiner Vorschläge auf der Bühne (Paket 5 im Workshop), mit der aktuellen Variante markiert.

**U05 Fixieren (Schloss)** · Auffindbarkeit 3, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Das Schloss fixiert und löst eine Doppelseite, und jede Handarbeit fixiert sie von selbst. Ein Satz unter der Überschrift erklärt das gut. Die Klickfläche ist aber nur 12 × 16 px groß.
- Prinzip: Die Automatik bleibt unter Kontrolle des Nutzers. Klickflächen sollten mindestens 24 × 24 px groß sein. (Quelle: `wcag22`)
- Vorschlag: Die Klickfläche auf 24 × 24 px vergrößern, auf Touch 44 px. Den Zustand zusätzlich als Wort zeigen („fixiert“).

**U06 Sortieren (Pfeile, Ziehen)** · Auffindbarkeit 3, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: „→“ an Doppelseite 1 schiebt sie an Stelle 2, das funktioniert. Die Pfeile sind 11 × 16 px groß, und gleich daneben steht das Entfernen-Kreuz mit 6 × 16 px. Ziehen geht nur mit HTML-Drag-and-drop, das auf Touch nicht verlässlich funktioniert.
- Prinzip: Je kleiner und näher ein Ziel liegt, desto mehr Fehltreffer gibt es (Fitts). Für jedes Ziehen braucht es einen Weg ohne Ziehen. (Quelle: `fitts-1954`)
- Vorschlag: Pfeile und Entfernen in ein Menü „…“ pro Doppelseite legen oder mindestens auf 24 px vergrößern und das × absetzen (K3).

**U07 Doppelseite entfernen (×)** · Auffindbarkeit 3, Einfachheit 4, Anpassbarkeit 3, Fehlertoleranz 3 · Aufwand S

- Beobachtung: × an Doppelseite 2 entfernt sie sofort, legt einen Zwischenstand an und schiebt die Fotos in die Ablage. Es gibt keinen Hinweis an der Stelle, und die Ablage liegt bei 900 px Höhe unter dem sichtbaren Bereich (y = 952). Rückgängig funktioniert.
- Prinzip: Lieber Rückgängig anbieten als warnen, aber die Rückmeldung muss am Ort der Handlung sichtbar sein. (Quelle: `raskin-2007`)
- Vorschlag: Einen Hinweis „Doppelseite entfernt, 2 Fotos in der Ablage · Rückgängig“ zeigen, wie auf dem Tisch.

**U08 Textseite hinzufügen** · Auffindbarkeit 4, Einfachheit 3, Anpassbarkeit 2, Fehlertoleranz 2 · Aufwand M

- Beobachtung: Ich habe eine Textseite angelegt und 760 Zeichen eingetippt. Das Panel meldet „Passt auf die Seite“, die Vorschau schneidet den Text aber unten ab. Befund K1 ist also weiterhin offen. Die Textseite ist ein zweiter, älterer Textweg neben den Textrahmen auf der Bühne. Sie hat nur „Absatz“ und „Groß“ und zeigt trotzdem einen Knopf „Layout“.
- Prinzip: Eine Rückmeldung, die nicht stimmt, ist schlimmer als keine. Sie kostet Vertrauen in alle anderen Hinweise. (Quelle: `nielsen-h1`)
- Vorschlag: Durch „Leere Doppelseite“ ersetzen, die direkt die Bühne mit Textleiste öffnet. Dann gibt es nur noch einen Textweg und eine Überlaufmessung.

**U09 Automatisch gestalten** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Vorher wird ein Zwischenstand angelegt, fixierte Doppelseiten bleiben, und ein Tooltip erklärt das. Im Test wurden aus 6 Doppelseiten 5. Was sich geändert hat, sieht man nicht.
- Prinzip: Die Automatik bleibt überstimmbar, und große Schritte sind umkehrbar. (Quelle: `shneiderman-golden`)
- Vorschlag: Danach kurz anzeigen: „3 Doppelseiten neu geordnet, 2 fixierte unverändert · Rückgängig“.

**U10 Foto-Panel (Stern, Titel, Zusatz, Beschreibung, Ausschnitt, Einband, Ablage)** · Auffindbarkeit 4, Einfachheit 3, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Ein Klick auf ein Foto öffnet rechts das Panel. Der Stern „Als wichtig markieren“ macht aus 5 Doppelseiten sofort 6, ohne Hinweis. „Ausschnitt …“ öffnet den Dialog, Esc schließt ihn nicht, und der Fokus bleibt dahinter (K2 offen). Auf 375 px liegt das Panel weit unter dem Foto (K4).
- Prinzip: Ein Werkzeug gehört nahe an sein Objekt. Modale Dialoge brauchen Fokusführung und Esc. (Quelle: `wcag-apg-dialog`)
- Vorschlag: SlipDialog auf <dialog> mit showModal() umstellen (K2). Beim Stern zeigen, was er bewirkt hat („kommt groß, Doppelseite 4 neu“).

**U11 Ablage (Entf, Ins Buch)** · Auffindbarkeit 2, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Foto wählen und Entf legt es ab. Die Ablage erscheint unter allen Doppelseiten, im Test unter dem sichtbaren Bereich. Auf der Doppelseite bleibt eine Lücke ohne Hinweis (K9 offen). Auf der Bühne ist die Ablage dagegen gut gelöst: als Teil der Leiste „Alle Fotos“.
- Prinzip: Informative Rückmeldung am Ort der Handlung. (Quelle: `shneiderman-golden`)
- Vorschlag: Hinweis „In die Ablage gelegt · Rückgängig“ zeigen. Die Ablage in der Übersicht als feste Leiste unten, wie auf der Bühne.

**U12 Rückgängig und Wiederholen (Kopf, ⌘Z)** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Es gibt 60 Schritte, Tippen wird zusammengefasst, und jede Geste ist ein Schritt. Das ist vorbildlich. Der Stapel kennt aber keine Grenzen: Er reicht bis vor den Upload (U02) und läuft auf der Bühne in Änderungen außerhalb der Bühne hinein (B26).
- Prinzip: Leicht umkehrbare Handlungen ermutigen zum Ausprobieren. Das gilt aber nur, wenn man sieht, was zurückgenommen wurde. (Quelle: `nng-h3`)
- Vorschlag: Den Namen des Schritts im Tooltip zeigen („Rückgängig: Foto verschoben“) und den Upload als Grenze behandeln.

### Kopfzeile

**U13 Verlauf (Zwischenstände, Stand sichern, Datei)** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand M

- Beobachtung: Die Einträge tragen jetzt ihren Anlass („vor „Automatisch gestalten““, „vor dem Entfernen einer Doppelseite“), dazu Zeit und Seitenzahl. Das hilft. Es gibt weiterhin keine Miniatur, und der automatische Eintrag heißt nur „Zwischenstand“.
- Prinzip: Wiedererkennen statt Erinnern. Ein Bild der ersten Doppelseite erkennt man schneller als eine Uhrzeit. (Quelle: `nielsen-10`)
- Vorschlag: Eine Miniatur der zuletzt geänderten Doppelseite pro Eintrag. Mit ⇧⌘S direkt „Stand sichern“ öffnen.

**U14 Ansehen** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 3, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Das Buch öffnet sich wie beim Lesen, und Esc führt zurück in den Editor. Der einzige sichtbare Ausgang ist die Wortmarke mit dem Namen „Fujiventura, zurück zum Tisch“. Dabei führt sie hier zurück in den Editor. Wer sie liest, erwartet, den Editor zu verlassen.
- Prinzip: Ein Knopf muss sagen, wohin er führt (Konsistenz, Erwartung). (Quelle: `nielsen-10`)
- Vorschlag: Im Vorschaumodus einen sichtbaren Knopf „Zurück zum Gestalten“ zeigen.

**U15 Hinlegen für …** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 3 · Aufwand S

- Beobachtung: Ich trage den Namen „Lena“ ein und bekomme sofort einen Link mit „Link kopieren“ und „Zurückziehen“. Das ist schnell. „Zurückziehen“ wirkt sofort und ohne Rückgängig (K13 offen). Solange gespeichert wird, ist der Knopf gesperrt, ohne dass gesagt wird, warum.
- Prinzip: Fehlervermeidung und Umkehrbarkeit. (Quelle: `raskin-2007`)
- Vorschlag: „Zurückziehen“ mit 5 Sekunden Rückgängig. Am gesperrten Knopf erklären: „Speichert noch …“.

### Tisch

**T01 Entfernen mit Rückgängig** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: „Entfernen“ legt das Buch weg, und unten rechts steht 10 Sekunden lang „„Kyoto“ liegt nicht mehr auf dem Tisch · Rückgängig“. Rückgängig holt es zurück. Der Hinweis sagt aber nicht, wohin das Buch gegangen ist (Papierkorb) und dass geteilte Links jetzt ruhen.
- Prinzip: Rückgängig statt Warnung ist hier genau richtig umgesetzt. (Quelle: `raskin-2007`)
- Vorschlag: Text ergänzen: „liegt im Papierkorb. Geteilte Links ruhen.“ Die 10 Sekunden reichen. Beim Hover auf den Hinweis soll der Ablauf pausieren.

**T02 Papierkorb (zurücklegen)** · Auffindbarkeit 2, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: „Papierkorb (1)“ steht erst unter dem Tisch, nur wenn er etwas enthält, und ist eingeklappt. „Zurück auf den Tisch“ funktioniert.
- Prinzip: Was man wiederfinden muss, braucht einen festen, sichtbaren Ort. (Quelle: `nielsen-10`)
- Vorschlag: In der Kopfzeile neben „Aus Datei öffnen“ einen Eintrag „Papierkorb (1)“ zeigen. Im Hinweis von T01 darauf verlinken.

**T03 Papierkorb leeren mit Rückfrage** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 3, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Die Rückfrage nennt die Folgen genau (Fotos, Zwischenstände, Links, Zettel der Gäste) und listet die Bücher auf. Der Text ist gut. Der Fokus bleibt aber auf „Papierkorb leeren …“ hinter dem Dialog (K2).
- Prinzip: Eine Rückfrage passt hier, weil der Schritt endgültig ist. Sie soll selten sein, damit man sie liest. (Quelle: `nng-confirm`)
- Vorschlag: Fokus auf „Abbrechen“ setzen, Esc schließt den Dialog, der Hintergrund wird inert.

**T04 Links ruhen im Papierkorb** · Auffindbarkeit 2, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Den Satz „ihre geteilten Links zeigen nichts mehr“ sieht man erst, wenn man den Papierkorb aufklappt. Beim Entfernen steht er nicht da. Das Verhalten selbst ist sehr fehlertolerant: Zurücklegen weckt die Links wieder.
- Prinzip: Den Systemzustand zeigen, wenn er sich ändert, nicht erst auf Nachfrage. (Quelle: `nielsen-h1`)
- Vorschlag: Beim Entfernen eines geteilten Buchs: „2 Links ruhen, bis du es zurücklegst“.

### Bühne

**B01 Verschieben** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Ich habe Foto 1 in der Mitte gegriffen und um 83 × 61 px gezogen. Die Vorschau folgt flüssig, eine Einrastlinie erscheint, und die Kante landet auf einer Spalte. Die Live-Region meldet „Foto 1: linke Seite“. Der erste Handgriff macht die Doppelseite frei und fixiert sie, das zeigt die Kopfzeile.
- Prinzip: Direkte Manipulation: sichtbare Objekte, schnelle, umkehrbare Schritte. (Quelle: `shneiderman-1983`)
- Vorschlag: Nichts Grundsätzliches. Die Fotonummern im Namen („Foto 1“) wechseln, sobald sich die Lesereihenfolge ändert. Für Screenreader und Gespräche besser den Titel oder einen festen Namen verwenden.

**B02 Griffe (Größe ändern)** · Auffindbarkeit 5, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Es gibt 8 Griffe, 24 px groß mit der Maus und 44 px bei Touch. Eine Ecke ändert beide Seiten, eine Kante nur eine. Ein Foto in voller Seitenhöhe lässt sich nach unten nicht größer ziehen. Das ist richtig, aber man bekommt keinen Hinweis darauf. Shift hält das Seitenverhältnis. Das kennt man aus Office.
- Prinzip: Konventionen der Plattform übernehmen. Die Griffe kennt jeder aus Office. (Quelle: `ms-crop`)
- Vorschlag: An der Seitenkante kurz einen Anschlag zeigen (Kante in signal). Ansonsten so lassen.

**B03 Einrasten am Raster und Einrastlinien** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand M

- Beobachtung: Beim Ziehen erscheinen das Raster und genau eine gelbe Linie, an der die Kante einrastet. Es gibt keine falschen Linien. Die Schwelle von 8 px ist spürbar stark: Wer eine Kante um 50 px zieht, bekommt nur 9 px Änderung, weil sie zurück auf die Spalte springt. Gleiche Abstände zwischen drei Elementen werden nicht angezeigt.
- Prinzip: Snap-dragging senkt die nötige Genauigkeit. Hilfslinien müssen ehrlich sein. (Quelle: `bier-stone-1986`)
- Vorschlag: Marken für gleiche Abstände ergänzen, wie die Smart Guides in PowerPoint (Workshop 2.6).

**B04 Originalformat-Magnet** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Wenn ich an einer Ecke ziehe, erscheint die Marke „Originalformat“ in der Box, und die Form rastet ein. Die Marke ist schwarz auf dem Foto und gut lesbar. Sie verschwindet beim Loslassen, danach sieht man nicht mehr, ob das Foto im Originalformat steht.
- Prinzip: Eine gute Voreinstellung, die man erst merkt, wenn man sie braucht. (Quelle: `nielsen-defaults`)
- Vorschlag: Im Foto-Panel „Format: Original 2:3“ oder „beschnitten“ anzeigen, mit einem Knopf „Originalformat“.

**B05 Alt für frei setzen** · Auffindbarkeit 1, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Mit gedrückter Alt-Taste zeigt das Ziehen keine Einrastlinien, und das Foto landet um 7 px versetzt. Danach weist nichts darauf hin, dass es außerhalb des Rasters steht. Das Zeichen dafür war im Workshop versprochen. Die Funktion steht nur im Hilfetext unter der Seite. Am Telefon gibt es keinen Weg dorthin.
- Prinzip: Versteckte Modifikatortasten werden kaum gefunden. Was nur für Fortgeschrittene ist, darf versteckt sein, braucht aber eine sichtbare Spur. (Quelle: `norman-nielsen-2010`)
- Vorschlag: Ein kleines Zeichen „frei“ am Element und im Panel „Aufs Raster setzen“. Im Kontextmenü „Frei setzen“ als Weg für Touch.

**B06 Zuschneiden: Doppelklick öffnet den Modus, Bild ziehen** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand M

- Beobachtung: Ein Doppelklick auf das Foto öffnet den Modus, so wie die Maske in Keynote. Oben steht eine Leiste mit „Fertig“, „Abbrechen“ und „Mehr …“, das ganze Bild ist blass dahinter. Ziehen in der Mitte verschiebt das Bild nicht, solange Bild und Rahmen gleich groß sind. Erst nach dem Vergrößern bewegt sich etwas, und es gibt keinen Hinweis darauf. Mausrad und Pinch zoomen nicht, obwohl der Workshop beides vorsieht. Die Tasten + und − gehen.
- Prinzip: Doppelklick zum Bearbeiten der Maske ist Konvention in Keynote. Die Modi müssen klar getrennt und sichtbar sein. (Quelle: `keynote-mask`)
- Vorschlag: Beim Öffnen das Bild leicht vergrößert zeigen (z. B. 110 %), damit Ziehen sofort wirkt, oder den Hinweis „erst vergrößern“ geben. Mausrad und Pinch für den Zoom ergänzen.

**B07 Zuschneiden: Ecken am Bild und Griffe am Rahmen** · Auffindbarkeit 3, Einfachheit 2, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand M

- Beobachtung: Am Anfang liegen Bild und Rahmen aufeinander. Die Ecke unten rechts trifft dann immer den Bildgriff (helles Quadrat), nie den Rahmengriff. Wer den Rahmen über die Ecke beschneiden will, vergrößert stattdessen das Bild. Nach dem Vergrößern lag die untere Bildecke unter der Seite und außerhalb des Bildschirms. Das blasse Bild überdeckt mit 40 % das Nachbarfoto, und man sieht schwer, was wozu gehört.
- Prinzip: Zwei Griffarten am selben Punkt sind ein Modusfehler mit Ansage. PowerPoint zeigt zum Zuschneiden eigene, schwarze Beschnittgriffe. (Quelle: `norman-1981`)
- Vorschlag: Die Rahmengriffe als schwarze Winkel außen zeigen und die Bildgriffe als runde Punkte mit Abstand nach außen versetzen. Bei Gleichstand gewinnt der Rahmen. Die Nachbarelemente während des Zuschneidens abdunkeln.

**B08 Zuschneiden beenden: Fertig, Abbrechen, Mehr, Esc, Klick daneben** · Auffindbarkeit 5, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: „Fertig“ übernimmt den Ausschnitt, „Abbrechen“ und Esc verwerfen ihn, „Mehr …“ öffnet den alten Dialog mit Motivpunkt. Ein Klick neben die Doppelseite, z. B. auf den Tisch links, beendet den Modus nicht. Nur ein Klick auf das Papier tut es.
- Prinzip: Mehrere Wege, die alle gleich enden, sind gut. Die Grenze des Modus muss aber eindeutig sein. (Quelle: `nng-h3`)
- Vorschlag: Jeder Klick außerhalb des Bildes beendet den Modus mit „Fertig“, auch auf dem Tisch neben der Doppelseite.

**B09 Textleiste (+ Überschrift, + Absatz, + Notiz)** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: „+ Überschrift“ legt einen Rahmen an der ersten freien Stelle an, öffnet sofort das Schreibfeld mit markiertem Platzhalter und meldet die Lage. Ich habe direkt „Kyoto im Regen“ getippt. Ziehen an eine Stelle geht auch. Das ist der beste Teil der Bühne.
- Prinzip: Sichtbare, benannte Werkzeuge mit guter Voreinstellung. Wiedererkennen statt Erinnern. (Quelle: `nielsen-10`)
- Vorschlag: So lassen.

**B10 Doppelklick aufs Papier legt Text an** · Auffindbarkeit 3, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Ein Doppelklick auf leeres Papier links unten legt einen Absatz an genau der Stelle an, zum Schreiben bereit. Auf einem randlosen Foto gibt es kein Papier, dort startet der Doppelklick das Zuschneiden. Wer Text auf ein Foto setzen will, muss die Leiste nehmen. Der Rahmen landete bei 85 % Höhe, der Text lief später aus dem Satzspiegel.
- Prinzip: Ein schneller Weg für Geübte neben dem sichtbaren Weg (Heuristik 7). (Quelle: `nielsen-10`)
- Vorschlag: Den Rahmen nach oben verschieben, wenn er unten nicht passt. Im Hilfetext sagen, dass Text auf Fotos über die Leiste geht.

**B11 Doppelklick auf Text schreibt direkt** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 2 · Aufwand S

- Beobachtung: Ein Doppelklick auf „Kyoto im Regen“ öffnet das Schreibfeld in derselben Schrift, aber der ganze Text ist markiert (Auswahl 0–14 von 14). Wer einen Tippfehler korrigieren will und gleich tippt, ersetzt den ganzen Text. In Textprogrammen markiert ein Doppelklick üblicherweise nur das Wort unter dem Zeiger.
- Prinzip: Konsistenz mit Plattform-Konventionen. Hier bricht die Bühne die Erwartung, die Michel aus PowerPoint mitbringt. (Quelle: `nielsen-10`)
- Vorschlag: Nur bei neuem Platzhaltertext alles markieren. Sonst den Cursor an die Klickstelle setzen (caretPositionFromPoint bzw. caretRangeFromPoint in Safari).

**B12 Werkzeugkasten: Schriftart** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Es gibt vier Schriften (Grotesk, Serif, Schreibmaschine, Handschrift), jede in der Liste in ihrer eigenen Schrift gezeigt. Der Wechsel wirkt sofort, Rückgängig geht.
- Prinzip: Wenige, kuratierte Optionen statt einer langen Liste. Iyengar und Lepper zeigen, dass zu viel Auswahl lähmen kann. Die Studie ist allerdings nicht unumstritten. (Quelle: `iyengar-lepper-2000`)
- Vorschlag: So lassen. Nicht mehr Schriften hinzufügen.

**B13 Werkzeugkasten: Größe in pt** · Auffindbarkeit 5, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Die Größe startet bei 26 pt. „+“ springt auf 30 und dann auf 34 (Schritte von 4 ab 24 pt, darunter 1). Eingetippte 9 pt werden übernommen. Die Umrechnung bezieht sich auf 15 cm Seitenbreite und stimmt nur, wenn das Buch auch so gedruckt wird.
- Prinzip: Bekannte Einheit (pt wie in Office) senkt die Schwelle. Freie Eingabe ist die hohe Decke. (Quelle: `resnick-2005`)
- Vorschlag: Gewohnte Stufen (9, 10, 11, 12, 14, 18, 24, 36, 48 …). Die Druckgröße im Tooltip nennen.

**B14 Werkzeugkasten: Fett und Kursiv** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: „F“ und „K“ als Umschalter mit aria-pressed, 32 × 32 px groß. Sie wirken auf den ganzen Rahmen, nicht auf einzelne Wörter. Das ist für ein Fotobuch vernünftig. ⌘B und ⌘I gibt es nicht.
- Prinzip: Konventionen der Plattform (deutsche Office-Beschriftung F und K). (Quelle: `nielsen-10`)
- Vorschlag: ⌘B und ⌘I ergänzen.

**B15 Werkzeugkasten: Ausrichtung** · Auffindbarkeit 5, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Drei Knöpfe (links, mittig, rechts) mit Symbol und Namen für Screenreader. Mittig widerspricht Maras Regel aus dem Workshop, ist aber Michels Wunsch nach voller Anpassbarkeit. Die Voreinstellung bleibt links.
- Prinzip: Die gute Voreinstellung trägt, die Freiheit bleibt. (Quelle: `nielsen-defaults`)
- Vorschlag: So lassen.

**B16 Werkzeugkasten: Farben** · Auffindbarkeit 5, Einfachheit 3, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Es gibt 6 Felder (Tinte, Grau, Papier, Schwarz, Weiß, Einband) und einen freien Farbwähler mit Regenbogenfeld. Die Felder sind 24 × 24 px. Der freie Farbwähler widerspricht der Workshop-Entscheidung „keine freie Farbwahl“. Das Regenbogenfeld fällt im ruhigen Werkzeugkasten am stärksten auf. Wer „Weiß“ auf Papier wählt, bekommt keine Warnung zum Kontrast.
- Prinzip: Progressive Disclosure: Wenige wichtige Optionen zuerst, Spezielles auf Nachfrage. (Quelle: `nielsen-pd`)
- Vorschlag: Den freien Farbwähler hinter „Weitere …“ legen. Bei geringem Kontrast zum Untergrund einen kleinen Hinweis zeigen.

**B17 Helle Schrift** · Auffindbarkeit 3, Einfachheit 2, Anpassbarkeit 3, Fehlertoleranz 4 · Aufwand S

- Beobachtung: „Helle Schrift“ gibt es dreimal: als Haken im Panel, als Eintrag im Kontextmenü und indirekt als Farbe „Papier“ im Werkzeugkasten. Ich habe erst die Farbe „Einband“ gewählt und dann den Haken gesetzt. Der Haken ist dann an, aber nichts ändert sich, weil die gewählte Farbe Vorrang hat.
- Prinzip: Ein Bedienelement, das scheinbar nichts tut, zerstört das Vertrauen. Ästhetisch-minimalistisches Design: jede Doppelung schwächt die anderen. (Quelle: `nielsen-10`)
- Vorschlag: Den Haken und den Menüeintrag streichen. „Papier“ im Werkzeugkasten ist die helle Schrift.

**B18 Text und Fotos über den Bund** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Ich habe die Überschrift auf die Mitte gezogen. Sie liegt dann über beiden Seiten, und die Falz-Zone bleibt sichtbar. Auch Foto 1 ließ sich über den Bund schieben. Dabei hat es das Nachbarfoto überlappt, ohne Hinweis. Das Element heißt danach nur „rechte Seite“, obwohl es über beiden liegt.
- Prinzip: Ehrliche Vorschau (QFD K22): Was im Falz verschwindet, muss die Bühne sagen. (Quelle: `nielsen-h1`)
- Vorschlag: Im Namen „über den Bund“ sagen. Eine Warnung, wenn Text oder ein Gesicht im Falz liegt (wie im Ausschnitt-Dialog).

**B19 Ebenen-Liste, nach vorn und hinten** · Auffindbarkeit 4, Einfachheit 3, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Die Liste zeigt „Überschrift: Kyoto im Regen und Sonne · Foto 4 · Foto 3“ mit ↑ und ↓, und nicht mögliche Richtungen sind gesperrt. Antippen wählt auch Verdecktes. Die Funktion gibt es aber viermal: Liste, Knöpfe „Ganz nach vorn/hinten“ im Panel, vier Einträge im Kontextmenü, ⌘[ und ⌘]. ↑ und ↓ sind 32 px groß und ohne sichtbaren Namen.
- Prinzip: Jede zusätzliche Information schwächt die Sichtbarkeit der übrigen (Heuristik 8). (Quelle: `nielsen-10`)
- Vorschlag: Die Knöpfe im Panel streichen. Es bleiben Liste, Kontextmenü und Tastatur. Die Liste erst ab 2 überlappenden Elementen zeigen.

**B20 Rechtsklick-Menü** · Auffindbarkeit 3, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Ein Rechtsklick auf ein Foto zeigt 14 Einträge mit Kurzbefehlen, in Gruppen mit Trennlinien. Auf dem Papier gibt es „Hier einfügen“ und „Überschrift/Absatz/Notiz hier“. Pfeiltasten, Enter und Esc funktionieren. Bei Fotos stehen „Zuschneiden“ und „Ausschnitt-Dialog …“ nebeneinander, das ist für Laien unklar.
- Prinzip: Kontextmenüs sind versteckt. Alles darin muss auch in der normalen Oberfläche erreichbar sein (Apple HIG). (Quelle: `apple-hig-context`)
- Vorschlag: „Ausschnitt-Dialog …“ streichen, denn er ist über „Mehr …“ im Zuschneiden erreichbar. „Frei setzen“ ergänzen (B05).

**B21 ⌘C, ⌘X, ⌘V, ⌘D** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 5, Fehlertoleranz 3 · Aufwand S

- Beobachtung: ⌘D und ⌘C/⌘V legen eine Kopie eine Rasterzelle versetzt ab und melden die Lage. Dasselbe Foto steht danach dreimal auf der Seite, ohne Hinweis. Siehe B23 für die Folge.
- Prinzip: Plattform-Konventionen. Kopien eines Fotos sind im Buch selten gewollt und sollten erkennbar sein. (Quelle: `nielsen-10`)
- Vorschlag: Kopien eines Fotos im Namen kennzeichnen („Foto 3, Kopie“). Entfernen wirkt nur auf das gewählte Element (B23).

**B22 Text aus anderen Apps einfügen** · Auffindbarkeit 3, Einfachheit 5, Anpassbarkeit 5, Fehlertoleranz 5 · Aufwand S

- Beobachtung: Text aus der Zwischenablage („Text aus Notizen:“ mit Zeilenumbruch) wird beim Einfügen zu einem neuen Absatz, die Zeilen bleiben. Formatierung kommt nicht mit, so wie im Workshop gewünscht.
- Prinzip: Direkte Manipulation mit erwartbarem Ergebnis. Reiner Text vermeidet den albelli-Schmerz. (Quelle: `hutchins-1985`)
- Vorschlag: So lassen. Im leeren Zustand „⌘V fügt Text ein“ als Hinweis an der Textleiste zeigen.

**B23 Entf (Element entfernen)** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 3, Fehlertoleranz 2 · Aufwand S

- Beobachtung: Ich hatte drei Kopien von Foto 3 und habe eine davon mit Entf entfernt. Alle drei verschwanden, weil Entf das Foto in die Ablage legt und damit jede Platzierung entfernt. Die Live-Region meldet nichts Neues, und auf der Bühne erscheint kein sichtbarer Hinweis. Rückgängig holt alles zurück.
- Prinzip: Eine Handlung muss genau das betreffen, was gewählt ist. Rückmeldung nach jeder Handlung. (Quelle: `shneiderman-golden`)
- Vorschlag: Entf entfernt nur das gewählte Element. In die Ablage geht das Foto erst, wenn keine Platzierung mehr übrig ist. Ein kurzer Hinweis „Entfernt · Rückgängig“.

**B24 Leiste „Alle Fotos“** · Auffindbarkeit 3, Einfachheit 5, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Unter der Doppelseite stehen 9 Fotos mit Herkunft („Ablage“, „Doppelseite 4“). Antippen legt das Foto in die erste freie Stelle und meldet sie. Die Leiste beginnt bei 1440 × 900 bei y = 858 und ist damit fast ganz unter dem sichtbaren Bereich. Dass das Foto seine alte Doppelseite verlässt, sagt nur der Hilfetext.
- Prinzip: Was man oft braucht, gehört in den sichtbaren Bereich (Gesetz der Nähe, Fitts). (Quelle: `nielsen-10`)
- Vorschlag: Die Leiste als feste Leiste unten an den Bildschirmrand. Nach dem Hereinholen melden: „von Doppelseite 4 hierher verschoben · Rückgängig“.

**B25 Raster (G)** · Auffindbarkeit 4, Einfachheit 5, Anpassbarkeit 4, Fehlertoleranz 5 · Aufwand S

- Beobachtung: G und der Knopf schalten 47 Linien ein und aus, das Gerät merkt sich die Wahl. Der Knopf heißt „Raster an“, wenn es aus ist. Er beschriftet also die Handlung, meldet aber mit aria-pressed den Zustand. Ein Screenreader liest dann „Raster an, nicht gedrückt“.
- Prinzip: Beschriftung und Zustand müssen dasselbe sagen. (Quelle: `wcag22`)
- Vorschlag: Der Knopf heißt immer „Raster“ und zeigt den Zustand über aria-pressed und einen Haken.

**B26 Rückgängig auf der Bühne** · Auffindbarkeit 5, Einfachheit 4, Anpassbarkeit 4, Fehlertoleranz 2 · Aufwand M

- Beobachtung: Ich habe auf der Bühne einen Absatz angelegt und getippt, dann 3-mal „Rückgängig“ geklickt. Der dritte Schritt hat den Upload rückgängig gemacht: Die Bühne verschwand, und die Übersicht war leer. Der Stapel kennt keine Bühne. Er nimmt auch Änderungen aus der Übersicht zurück, die man von der Bühne aus nicht sieht.
- Prinzip: Rückgängig nimmt nur zurück, was man sieht. Sonst wird es selbst zur Fehlerquelle (Modusfehler). (Quelle: `nng-h3`)
- Vorschlag: Auf der Bühne nur Schritte dieser Doppelseite zurücknehmen. Am ersten Schritt den Knopf sperren mit dem Hinweis „Weiter zurück in der Übersicht“. Die Bühne schließt nie durch Rückgängig.

**B27 Auf Vorschlag zurücksetzen** · Auffindbarkeit 4, Einfachheit 4, Anpassbarkeit 3, Fehlertoleranz 2 · Aufwand S

- Beobachtung: Ich habe Foto 3 verschoben und dann „Auf Vorschlag zurücksetzen“ geklickt. Die Bühne verschwindet sofort und ohne Hinweis, man landet in der Übersicht. Der Grund: Die Automatik baut die Doppelseite neu, mit neuer Kennung. Ein Zwischenstand wird angelegt, Rückgängig ist aber nur in der Übersicht erreichbar.
- Prinzip: Keine Überraschungen: Eine Handlung ändert den Inhalt, nicht den Ort. (Quelle: `nielsen-h1`)
- Vorschlag: Die Kennung der Doppelseite behalten und die Bühne offen lassen, dazu „Zurückgesetzt · Rückgängig“ zeigen.

**B28 Handy 375 px: eine Seite, Ziehen, langes Drücken** · Auffindbarkeit 2, Einfachheit 3, Anpassbarkeit 4, Fehlertoleranz 3 · Aufwand M

- Beobachtung: Die Bühne zeigt eine Seite, und „Linke Seite“/„Rechte Seite“ wechseln. Es gibt kein horizontales Scrollen. Wischen ohne Auswahl verschiebt nichts, nach Antippen verschiebt Ziehen, die Griffe sind 44 px groß. Doppeltippen öffnet das Zuschneiden. Langes Drücken auf ein Foto öffnet das Menü nach 550 ms direkt unter dem Finger. In einem von drei Versuchen war es nach dem Loslassen wieder weg, vermutlich hat das Loslassen einen Eintrag getroffen. Langes Drücken auf Papier öffnet nichts. Der Werkzeugkasten für Text ist 345 px breit und läuft rechts aus dem Bildschirm, Fett und zwei Farben sind abgeschnitten. Panel und Ebenen beginnen erst bei y = 1018.
- Prinzip: Gesten sind versteckt und schwer zu merken. Auf Touch braucht jede Geste einen sichtbaren Weg. (Quelle: `nng-mobile-gestures`)
- Vorschlag: Das Menü versetzt über dem Finger öffnen und das erste Loslassen ignorieren. Den Werkzeugkasten auf dem Handy als Leiste unten (Bottom Sheet), das Panel ebenfalls. Einen Knopf „…“ am gewählten Element als sichtbaren Weg zum Menü.

**B29 Tastatur und Screenreader auf der Bühne** · Auffindbarkeit 3, Einfachheit 4, Anpassbarkeit 5, Fehlertoleranz 4 · Aufwand S

- Beobachtung: Pfeile verschieben um eine Spalte, Shift + Pfeil ändert die Größe, Enter schneidet zu bzw. schreibt, Esc hebt erst die Auswahl auf und schließt dann die Bühne. Jedes Element hat einen Namen mit Lage. Die Bühne übernimmt aber den Fokus nicht (siehe U03), und nach dem Schließen landet er auf body.
- Prinzip: Alle Funktionen per Tastatur (WCAG 2.1.1). Die Fokusreihenfolge muss stimmen (2.4.3). (Quelle: `wcag22`)
- Vorschlag: Fokus beim Öffnen in die Bühne, Hintergrund inert, beim Schließen Fokus zurück auf die Doppelseite.

**B30 Speichern-Rückmeldung (nur „Zur Übersicht“)** · Auffindbarkeit 1, Einfachheit 5, Anpassbarkeit 3, Fehlertoleranz 3 · Aufwand S

- Beobachtung: Die Kopfzeile der Bühne zeigt keinen Speicherstatus, weil sie die Zeile „Gespeichert“ des Editors verdeckt. Nach Esc stand in der Übersicht noch „Speichert …“. ⌘S wird nicht abgefangen, in Safari öffnet sich dann der Dialog „Sichern unter“ für die Webseite. Ein Hinweis beim Schließen des Tabs fehlt.
- Prinzip: Sichtbarkeit des Systemzustands. Autosave ohne Anzeige lässt das mentale Modell „Speichern“ ins Leere laufen. (Quelle: `nng-autosave`)
- Vorschlag: Siehe die Speichern-Diskussion: Status in der Kopfzeile der Bühne, ⌘S abfangen, beforeunload bei ungesicherten Änderungen.

**B31 Seitenpanel Foto und Textrahmen** · Auffindbarkeit 4, Einfachheit 3, Anpassbarkeit 4, Fehlertoleranz 4 · Aufwand M

- Beobachtung: Das Foto-Panel bietet Titel, „Unterschrift auf der Seite“, „Ausschnitt …“ (startet das Zuschneiden), Löschen, Duplizieren und Ebenen. Das Text-Panel bietet Stil, ein zweites Textfeld, Helle Schrift, Duplizieren und Ebenen. Es gibt also zwei Orte, um denselben Text zu schreiben (auf der Seite und im Panel), und zwei Orte für Stil und Format (Panel und Werkzeugkasten). Die Warnung „Der Text läuft unten aus dem Satzspiegel“ steht nur im Panel.
- Prinzip: Ein Ort pro Aufgabe. Doppelte Wege kosten Aufmerksamkeit (Heuristik 8, Hick). (Quelle: `hick-1952`)
- Vorschlag: Stil (Überschrift/Absatz/Notiz) in den Werkzeugkasten holen, das Textfeld im Panel streichen. Die Überlaufwarnung als Marke am Rahmen selbst zeigen.

## Was weg kann

- „Helle Schrift“ als Haken im Panel und als Menüeintrag: Die Farbe „Papier“ im Werkzeugkasten macht dasselbe, und der Haken wirkt nicht, sobald eine Farbe gewählt ist (B17).
- Das zweite Textfeld im Text-Panel der Bühne: Geschrieben wird direkt auf der Seite (B31).
- Die Knöpfe „Ganz nach vorn/hinten“ im Panel: Ebenen-Liste, Kontextmenü und ⌘[ ⌘] reichen (B19).
- „Ausschnitt-Dialog …“ im Kontextmenü: Er ist über „Mehr …“ im Zuschneiden erreichbar (B20).
- Der Knopf „Layout“ mit blindem Durchschalten: ersetzen durch sichtbare Vorschläge (U04).
- „Textseite hinzufügen“ als eigener Seitentyp: ersetzen durch „Leere Doppelseite“, die die Bühne mit Textleiste öffnet. Damit ist auch K1 erledigt (U08).
- Der freie Farbwähler in der ersten Ebene des Werkzeugkastens: hinter „Weitere …“ legen, nicht streichen (B16).
- Die langen Hilfetexte unter der Bühne: nur noch ein Satz plus „Tastenkürzel (?)“. Gelesen wird solcher Text kaum, die Tooltips an den Knöpfen tragen mehr.

## Die 5 wichtigsten nächsten Schritte

1. Speichern sichtbar machen (S): Status in der Kopfzeile der Bühne, ⌘S abfangen mit „Alles gespeichert“, ⇧⌘S für „Stand sichern“, beforeunload bei ungesicherten Änderungen (B30).
2. Die Bühne darf nie verschwinden (S–M): „Auf Vorschlag zurücksetzen“ behält die Kennung der Doppelseite, und Rückgängig nimmt auf der Bühne nur Schritte dieser Doppelseite zurück. Der Upload ist eine Grenze (B26, B27, U02).
3. Fehlertoleranz im Kleinen (S): Entf entfernt nur das gewählte Element, Doppelklick auf Text setzt den Cursor statt alles zu markieren, und nach Entfernen, Zurücksetzen und Hereinholen erscheint ein Hinweis „· Rückgängig“ wie auf dem Tisch (B23, B11, B24).
4. Zuschneiden entwirren (M): Rahmen- und Bildgriffe räumlich trennen, Klick außerhalb beendet den Modus, Mausrad und Pinch zoomen, das Bild startet leicht vergrößert (B06–B08).
5. Progressive Disclosure und Handy (M): Doppelungen streichen (siehe „Was weg kann“), Werkzeugkasten einzeilig mit „Weitere …“, auf 375 px Werkzeugkasten und Panel als Leiste unten, Menü nicht unter dem Finger. Dabei die offenen Altbefunde K1 bis K3 mit erledigen (B28, B31).

Noch offen aus der ersten Kritik und im Test bestätigt: K1 (Textseite meldet „Passt“ trotz Abschnitt), K2 (Dialoge ohne Fokus, Esc schließt den Ausschnitt-Dialog nicht), K3 (Leistenknöpfe 6 bis 12 px breit), K8 (Layout blind), K9 (Ablage außerhalb des Bildschirms), K13 („Zurückziehen“ ohne Rückgängig).

## Quellen

- `nielsen-h1`: Harley, A. (2018). Visibility of System Status (Usability Heuristic #1). Nielsen Norman Group. https://www.nngroup.com/articles/visibility-system-status/
- `nielsen-10`: Nielsen, J. (1994, aktualisiert 2024). 10 Usability Heuristics for User Interface Design. Nielsen Norman Group. https://www.nngroup.com/articles/ten-usability-heuristics/
- `nng-autosave`: Harley, A. (2015). Don't Prioritize Efficiency Over Expectations: The Case of Autosave. Nielsen Norman Group. https://www.nngroup.com/articles/efficiency-vs-expectations/
- `gdocs-status`: Google Workspace Updates (2020). New document save status and offline indicator for Docs, Sheets, and Slides. https://workspaceupdates.googleblog.com/2020/06/new-save-status-online-offline-google-docs.html
- `figma-versions`: Figma Help Center. View a file's version history. https://help.figma.com/hc/en-us/articles/360038006754
- `figma-offline`: Figma Help Center. What can you do offline in Figma? https://help.figma.com/hc/en-us/articles/360040328553
- `figma-autosave-blog`: Chen, R. (2020). Behind the feature: The hidden challenges of autosave. Figma Blog. https://www.figma.com/blog/behind-the-feature-autosave/
- `apple-lion-2011`: Apple Newsroom (2011). Mac OS X Lion Available Today From the Mac App Store (Auto Save, Versions). https://www.apple.com/newsroom/2011/07/20Mac-OS-X-Lion-Available-Today-From-the-Mac-App-Store/
- `apple-versions`: Apple. Mac User Guide: View and restore past versions of documents. https://support.apple.com/guide/mac-help/mh40710/mac
- `keynote-mask`: Apple. Keynote User Guide for Mac: Mask (crop) images („double-click the image. The mask controls appear“). https://support.apple.com/guide/keynote/tan811faceea/mac
- `ms-autosave`: Microsoft Support. What is AutoSave? https://support.microsoft.com/en-us/office/what-is-autosave-6d6bd723-ebfd-4e40-b5f6-ae6e8088f7a5
- `ms-crop`: Microsoft Support. Crop a picture in Office („Black crop handles appear on the edges and corners“). https://support.microsoft.com/en-us/Office/graphics-visuals/crop-a-picture-in-office
- `safari-save`: Apple. Safari User Guide for Mac: Save webpages (Ablage > Sichern unter). https://support.apple.com/guide/safari/ibrw1089/mac
- `nng-floppy`: Kaplan, K. (2025). The Floppy Disk Icon as „Save“: Still Appropriate Today? Nielsen Norman Group. https://www.nngroup.com/articles/floppy-disk-icon-understandability/
- `nielsen-pd`: Nielsen, J. (2006). Progressive Disclosure. Nielsen Norman Group. https://www.nngroup.com/articles/progressive-disclosure/
- `resnick-2005`: Resnick, M., Myers, B., Nakakoji, K., Shneiderman, B., Pausch, R., Selker, T., & Eisenberg, M. (2005). Design Principles for Tools to Support Creative Thinking. NSF Workshop Report on Creativity Support Tools. https://www.cs.umd.edu/hcil/CST/Papers/designprinciples.htm
- `myers-2000`: Myers, B., Hudson, S. E., & Pausch, R. (2000). Past, present, and future of user interface software tools. ACM TOCHI, 7(1), 3–28. https://doi.org/10.1145/344949.344959
- `nielsen-defaults`: Nielsen, J. (2005). The Power of Defaults. Nielsen Norman Group. https://www.nngroup.com/articles/the-power-of-defaults/
- `shneiderman-1983`: Shneiderman, B. (1983). Direct Manipulation: A Step Beyond Programming Languages. IEEE Computer, 16(8), 57–69. https://doi.org/10.1109/MC.1983.1654471
- `hutchins-1985`: Hutchins, E. L., Hollan, J. D., & Norman, D. A. (1985). Direct manipulation interfaces. Human-Computer Interaction, 1(4), 311–338. https://doi.org/10.1207/s15327051hci0104_2
- `shneiderman-golden`: Shneiderman, B., Plaisant, C., Cohen, M., Jacobs, S., Elmqvist, N., & Diakopoulos, N. (2016). Designing the User Interface (6. Aufl.), Abschn. 3.3.4: Eight Golden Rules. Pearson. https://www.cs.umd.edu/~ben/goldenrules.html
- `nng-h3`: Rosala, M. (2020). User Control and Freedom (Usability Heuristic #3). Nielsen Norman Group. https://www.nngroup.com/articles/user-control-and-freedom/
- `norman-1981`: Norman, D. A. (1981). Categorization of action slips. Psychological Review, 88(1), 1–15. https://doi.org/10.1037/0033-295X.88.1.1
- `norman-nielsen-2010`: Norman, D. A., & Nielsen, J. (2010). Gestural interfaces: a step backwards in usability. interactions, 17(5). https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/
- `nng-contextual-menus`: Kaley, A. (2019). Contextual Menus: Delivering Relevant Tools for Tasks. Nielsen Norman Group. https://www.nngroup.com/articles/contextual-menus/
- `nng-mobile-gestures`: Budiu, R. (2015). Mobile User Experience: Limitations and Strengths. Nielsen Norman Group. https://www.nngroup.com/articles/mobile-ux/
- `apple-hig-context`: Apple. Human Interface Guidelines: Context menus („Always make context menu items available in the main interface, too.“). https://developer.apple.com/design/human-interface-guidelines/context-menus
- `wcag22`: W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2, insbesondere 2.1.1, 2.4.3, 2.5.7, 2.5.8. https://www.w3.org/TR/WCAG22/
- `wcag-apg-dialog`: W3C WAI. ARIA Authoring Practices Guide: Dialog (Modal) Pattern. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- `bier-stone-1986`: Bier, E. A., & Stone, M. C. (1986). Snap-dragging. Computer Graphics (SIGGRAPH '86), 20(4), 233–240.
- `ppt-smart-guides`: Microsoft Support. Guides for arranging things on a slide (Smart Guides). https://support.microsoft.com/en-us/office/guides-for-arranging-things-on-a-slide-33854dfa-e0d1-43ff-8971-667b19512de3
- `raskin-2007`: Raskin, A. (2007). Never Use a Warning When You Mean Undo. A List Apart. https://alistapart.com/article/neveruseawarning/
- `nng-confirm`: Nielsen Norman Group (2018). Confirmation Dialogs Can Prevent User Errors — If Not Overused. https://www.nngroup.com/articles/confirmation-dialog/
- `hick-1952`: Hick, W. E. (1952). On the rate of gain of information. Quarterly Journal of Experimental Psychology, 4(1), 11–26. https://doi.org/10.1080/17470215208416600
- `iyengar-lepper-2000`: Iyengar, S. S., & Lepper, M. R. (2000). When choice is demotivating. Journal of Personality and Social Psychology, 79(6), 995–1006. Replizierbarkeit umstritten. https://doi.org/10.1037/0022-3514.79.6.995
- `fitts-1954`: Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement. Journal of Experimental Psychology, 47(6), 381–391.
- `nielsen-1997`: Nielsen, J. (1997). How Users Read on the Web. Nielsen Norman Group. https://www.nngroup.com/articles/how-users-read-on-the-web/
- `raskin-2000`: Raskin, J. (2000). The Humane Interface. Addison-Wesley (Kapitel zu Modi).
- `nielsen-landauer-1993`: Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. Proceedings of INTERCHI '93, 206–213.
