# UX-Kritik Fujiventura

Stand: 7. Oktober 2026. Simulierte Expertenbewertung, keine Nutzertests. Maschinenlesbare Fassung: `src/content/kritik.json`.

## Kurzfassung

Fujiventura ist ein ungewöhnlich sorgfältiges Produkt. Das Buch-Objekt trägt die Bedienung, Rückgängig und Verlauf sind vorbildlich, und der Erstentwurf steht nach ein bis zwei Sekunden. Die größten Schwächen liegen nicht im Lesen, sondern im Editor: eine falsche Rückmeldung bei zu langem Text (K1), Dialoge ohne Fokusführung (K2) und Bedienelemente, die für Finger und Tastatur zu klein (K3) oder nur per Ziehen erreichbar sind (K5). Auf dem Telefon landen die Werkzeuge eines gewählten Fotos weit unter dem Foto (K4). Fast alles lässt sich mit kleinem oder mittlerem Aufwand beheben. Das sollte vor dem Umbau zum freien Layout passieren, weil der Umbau diese Muster sonst vervielfacht.

Verteilung der 23 Befunde nach Schweregrad: 0 × 4, 5 × 3, 10 × 2, 7 × 1, 1 × 0.

## Methodik

- **Verfahren:** heuristische Evaluation nach Nielsen (1994), ergänzt um WCAG 2.2, Norman (2013), Gestaltgesetze, Fitts' Law, Hick-Hyman, kognitive Last (Sweller 1988) und Forschung zu Animation.
- **Werkzeug:** Playwright mit Chromium. Skripte und Screenshots liegen im Scratchpad unter `ux/` (nicht im Repo).
- **Geräte:** 1440 × 900 und 375 × 812 Pixel, Maus, Touch-Emulation, nur Tastatur, `prefers-reduced-motion: reduce`.
- **Umgebungen:** Lesen und Rezept auf der Build-Version `localhost:4300`. Tisch, Editor, Teilen und Gast auf der Mock-Version `localhost:4301`, mit 8 bis 10 Testfotos per synthetischem Drop.
- **Messungen:** Kontraste aus den Tokens in `src/app/globals.css` nach der WCAG-Formel, Klickflächen aus dem DOM, Zeit bis zum Erstentwurf aus der Anzeige im Editor, Scrollhöhen per `scrollHeight`.
- **Schweregrad** nach Nielsen (1994, „Severity Ratings“): 0 kein Usability-Problem, 1 kosmetisch, 2 klein, 3 groß (hohe Priorität), 4 Katastrophe (vor Freigabe beheben). Bewertet nach Häufigkeit, Auswirkung und Hartnäckigkeit.

### Grenzen

- Eine einzelne Gutachterin findet nur einen Teil der Probleme. Nielsen und Landauer (1993) zeigen, dass mehrere unabhängige Gutachter deutlich mehr finden; manche Befunde werden zudem überschätzt.
- Nur Chromium. Kein Safari, kein echtes iPhone, kein Screenreader. Touch wurde emuliert.
- Im lokalen Export fehlten die verkleinerten Bilder (`*.w480.jpg`, `shrink-export` lief nicht). Im Test wurden sie auf die Originale umgeleitet. Das ist kein Befund.
- In der Mock-Version zeigen Gast und Tisch kaputte Bilder (Blob-Adressen überleben den Seitenwechsel nicht) und eine Firebase-Fehlermeldung. Das gilt als Mock-Artefakt; gewertet wurde nur die Formulierung der Meldung (K21).
- Echte Anmeldung, echtes Speichern und Offline-Verhalten wurden nicht geprüft.

## Durchgang durch den Workflow

### 1. Erster Besuch und Bibliothek (`/`)

Das Intro baut in etwa 3,3 s „FUJIVENTURA“ auf und schiebt 26 Abzüge zum gelben Buch zusammen. Jede Eingabe überspringt es, es läuft einmal pro Sitzung und entfällt bei reduzierter Bewegung. Damit erfüllt es die Bedingung, unter der Tversky, Morrison und Bétrancourt (2002) Animation überhaupt rechtfertigen: Es zeigt eine Beziehung (Fotos werden Buch) und hält niemanden fest. Die Ladezeit bis `load` lag lokal bei 160 bis 280 ms.

Danach liegen zwei leicht gedrehte Leinenbände auf dem Basalt (Screenshot `d-table.png`). Die Bände heben sich einmal kurz als Hinweis, bei Hover heben sie sich um 8 px. Der Tisch hat genau zwei Tab-Stopps, beide gut beschriftet („Fuerteventura aufschlagen, 26 Tafeln“), der Fokusrahmen in `cloth` liegt mit 8 px Abstand auf dem Tisch und ist klar sichtbar. Auf 375 px liegen die Bände versetzt untereinander, ohne horizontales Scrollen.

### 2. Buch öffnen und blättern

Der Einband fliegt per View Transition in die Lesestellung und schlägt sich auf. Blättern geht per Scrollen, Pfeiltasten, Klick aufs Papier, Ziehen, Wischen und über die Bildfolge-Linie. Nach dem Aufschlagen steht der Fokus allerdings auf `body` (K16). Die Scrollspur ist 13 829 px lang, der Hinweis „Scrollen zum Blättern“ verschwindet nach dem ersten Blatt (K19). Die vergrößerte Tafel fliegt aus ihrer Stelle auf, Fokus und Tab-Kreis im Vollbild sind korrekt, beim Schließen fliegt sie zurück und der Fokus kehrt zur Tafel zurück.

### 3. Rezept ansehen

„Rezept 5“ und „Rezept 6“ stehen in der Kopfzeile. Der Zettel gleitet mit kurzem Einlaufen der Werte herein, Fokus geht auf „Schließen“, Esc schließt. Zwei Probleme: Der Zettel für Tafel 5 liegt über Tafel 6 (K10, Screenshot `d-recipe.png`), und die Werte sind öffentlich sichtbare Platzhalter, auf Tafel 3 und 5 identisch (K11).

### 4. Anmelden und Tisch (`/tisch`)

Ohne Anmeldung zeigt `/tisch` einen leeren Tisch mit „Mit Google anmelden“. Angemeldet (Mock) liegt dort ein Papierblock „Neues Buch anlegen · Fotos reinziehen, fertig.“ Das ist eine klare, freundliche Leere. Die Fehlermeldung bei fehlenden Rechten erscheint roh auf Englisch (K21). Vom öffentlichen Tisch führt kein Weg hierher (K18).

### 5. Neues Buch (`/neu`)

- **Fotos rein:** Drop irgendwo auf der Seite, Overlay „Loslassen, dann kommen die Fotos ins Buch“, Fortschritt pro Foto, Erstentwurf nach 2,2 s für 10 Fotos (Desktop) und 1,1 s für 8 Fotos (Telefon). Sehr gut.
- **Automatik:** fünf Doppelseiten mit gemischten Seitentypen. Manuelle Änderungen fixieren die Doppelseite, „Automatisch gestalten“ lässt fixierte in Ruhe. Gut erklärt.
- **Layout wechseln:** Der Knopf „Layout“ blättert ohne Vorschau durch Varianten (K8).
- **Ausschnitt:** Dialog mit Motivpunkt, Warnung bei angeschnittenem Motiv oder Motiv im Falz, Zoom, „Motiv in die Mitte“, „Ganzes Foto zeigen“. Inhaltlich stark. Verschieben geht aber nur per Maus, und der abgeschnittene Teil ist unsichtbar (K7). Der Dialog übernimmt keinen Fokus (K2).
- **Text:** Textseite mit Überschrift, Text, Schrift „Absatz“ oder „Groß“. Der Hinweis „Passt auf die Seite“ ist bei langem Text falsch (K1).
- **Ablage:** Entf legt ein Foto in die Ablage, sie erscheint aber außerhalb des Bildschirms, die Seite bleibt leer (K9).
- **Undo und Verlauf:** ⌘Z holt alles zurück. Der Verlauf listet Zwischenstände mit Zeit und Seitenzahl, „Stand sichern“ und „Projekt als Datei sichern“. Die Einträge heißen allerdings alle „Zwischenstand“ und haben keine Miniatur, man muss sich an den Inhalt erinnern.
- **Telefon:** Panel unter allen Doppelseiten (K4), Leistenknöpfe 6 bis 12 px breit (K3), Fotos nur per Ziehen zwischen Doppelseiten (K5).

### 6. Teilen und Gastansicht (`/b?t=…`)

„Hinlegen für …“ fragt nach einem Namen und erzeugt einen persönlichen Link, auf dem Telefon mit Teilen-Menü. Kein Konto für Gäste nötig, das senkt die Schwelle stark. Probleme: Teilen ohne Titel (K6), „Zurückziehen“ ohne Rückfrage (K13), Begriff „Hinlegen“ (K17). Beim Gast liegt das Buch mit Zettel „Für Lena, von …“ auf dem Tisch. Eselsohr und Zettel funktionieren, der Zettel bestätigt „Liegt bei Michel Test. Danke!“. Das Eselsohr lässt sich nicht zurücknehmen (K12), die Ecke hat keinen sichtbaren Hinweis (K20), der Zettel-Dialog übernimmt keinen Fokus (K2).

### 7. QFD und Umfrage

`/qfd` ist eine sorgfältig belegte Arbeitsseite mit Sprungnavigation, fokussierbaren Scrollbereichen und Legenden. Auf dem Telefon ist sie 49 567 px lang (K22). `/umfrage` ist klar: eine Frage pro Bildschirm, Fortschritt „1 / 26“, große Antwortflächen (320 × 50 px). Nach jeder Antwort ist der Fokus weg, beim Zurückgehen ist die Antwort nicht markiert (K15). Die Angabe „etwa zwei Minuten“ für 26 Fragen ist knapp kalkuliert und sollte im Test gemessen werden.

## Was funktioniert und warum

1. **Rückgängig, Verlauf, Zwischenstände.** 60 Schritte, zusammengefasstes Tippen, automatische Stände vor großen Änderungen. Nielsen (1994), Heuristik 3 „User control and freedom“; Shneiderman et al. (2016), Goldene Regel „Permit easy reversal of actions“. Wer gefahrlos probieren kann, lernt schneller.
2. **Schneller Erstentwurf mit Fortschritt.** 1,1 bis 2,2 s mit Anzeige pro Foto. Nielsen (1993): unter 1 s bleibt der Gedankenfluss, bis 10 s die Aufmerksamkeit, wenn Fortschritt sichtbar ist. Doherty und Thadani (1982) zeigen Produktivitätsgewinne bei Antworten unter 400 ms; die Bearbeitung im Editor (Layout, Stern, Text) reagiert lokal sofort.
3. **Automatik, die man überstimmen kann.** Auto-Fixieren und „nur freie Doppelseiten“. Shneiderman et al. (2016), „Keep users in control“. Antwortet direkt auf den in `qfd.json` erhobenen Schmerz.
4. **Bewegung mit Herkunft und Ziel.** Einband und Tafel fliegen von ihrem Ort und zurück. Chang und Ungar (1993) begründen solche Kontinuität mit Wiedererkennbarkeit über Zustände hinweg. Tversky et al. (2002) mahnen, dass Animation nur hilft, wenn sie eine Veränderung zeigt, die sonst schwer zu verstehen wäre, und wenn sie wahrnehmbar langsam und unterbrechbar ist. Das ist hier erfüllt; dekorative Bewegung (Palmenschatten) bleibt leise.
5. **Fokusführung in Vollbild und Rezeptzettel.** Vorbildlich nach WAI-ARIA APG, WCAG 2.4.3. Genau dieses Muster fehlt im SlipDialog (K2), die Lösung liegt also schon im Code.
6. **Mehrere Wege durchs Buch.** Nielsen (1994), Heuristik 7 „Flexibility and efficiency of use“; WCAG 2.1.1. Die Haltepunkte der Linie sind 24 × 24 px und beschriftet.
7. **Textkontraste.** Alle Textkombinationen ≥ 5,3:1 (Tabelle unten). WCAG 1.4.3.
8. **Ästhetik als Vertrauensvorschuss.** Kurosu und Kashimura (1995) sowie Tractinsky, Katz und Ikar (2000) zeigen, dass als schön erlebte Oberflächen als benutzbarer eingeschätzt werden. Der skeuomorphe Tisch nutzt das, und er erklärt sich: ein Buch schlägt man auf. Die Kehrseite: Der Vorschuss hält nur, wenn die Bedienung ihn einlöst. Ein zu Unrecht positives Signal wie in K1 kostet dann mehr Vertrauen als bei einer nüchternen Oberfläche.
9. **Ein gutes Ende.** Kontaktbogen, Kolophon, Buch legt sich zurück. Kahneman et al. (1993) zur Peak-End-Regel: Das Ende prägt die Erinnerung. Für den Editor fehlt so ein Ende noch: Nach „Hinlegen“ gibt es keinen Moment, der das fertige Buch feiert (siehe Vorschläge).

## Kontrast der Tokens

Berechnet nach WCAG 2.2 (relative Luminanz).

| Vordergrund | Hintergrund | Kontrast | Bewertung |
| --- | --- | --- | --- |
| on-table #ece6dc | table #1b1917 | 14,12:1 | Text AAA |
| on-table-2 #a39a8e | table | 6,32:1 | Text AA |
| on-table-2 | table-deep #121110 | 6,80:1 | Text AA |
| cloth #e8a72c | table | 8,34:1 | Nicht-Text ok (DESIGN.md nennt 4,34, K23) |
| cloth-ink #3a2706 | cloth | 6,79:1 | Text AA |
| ink #1b1c1a | paper #eee9df | 14,14:1 | Text AAA |
| ink-2 #5a5c56 | paper | 5,60:1 | Text AA |
| ink-2 | slip #ebe3d1 | 5,30:1 | Text AA |
| ink-2 | paper-shade #dcd5c8 | 4,64:1 | Text AA knapp |
| ink | cloth-mist #c9c8c3 | 10,21:1 | Text AAA |
| cloth | paper / slip | 1,74 / 1,64:1 | nur Deko, Unterstriche auf Zettel kaum sichtbar |
| ink 25 % (Feldrahmen) | slip | 1,67:1 | verfehlt 1.4.11 (K14) |
| ink 30 % (Knopfrahmen) | slip | 1,87:1 | verfehlt 1.4.11 (K14) |
| on-table-2 40 % (Linie) | table | 2,08:1 | Deko, Haltepunkte selbst 6,32:1 |

## Probleme nach Schweregrad

Jeder Befund: Beobachtung, Prinzip und Quelle, Auswirkung, Vorschlag, Aufwand (S bis zu einem halben Tag, M ein bis drei Tage, L mehr).

### Schweregrad 3

**K1 „Passt auf die Seite“, obwohl der Text abgeschnitten ist** (Editor, `/neu`, Aufwand M)
- Beobachtung: Textseite mit 40 Sätzen „Drei Tage am Meer.“ (760 Zeichen, „Absatz“). Panel: „Passt auf die Seite. Daneben kann ein Foto stehen“. Die Vorschau zeigt den Text bis an die Unterkante abgeschnitten (`d-text-overflow.png`). Die Schätzung in `textFits()` weicht von der gezeichneten Seite ab.
- Prinzip: Sichtbarkeit des Systemzustands und Fehlervermeidung (Nielsen 1994, Heuristiken 1 und 5); Norman (2013) zu Feedback, das stimmen muss.
- Auswirkung: Bücher gehen mit abgeschnittenem Text an Gäste oder in den Druck; die Glaubwürdigkeit aller Hinweise sinkt.
- Vorschlag: Überlauf mit derselben Layoutfunktion messen, die Seite und Textur zeichnet. Bei Überlauf Rahmen markieren und „etwa n Zeilen zu viel“ zeigen.

**K2 Dialoge im Editor und beim Gast führen den Fokus nicht** (Global, `/neu`, `/b`, Aufwand S)
- Beobachtung: `SlipDialog` (Ausschnitt, Verlauf, Hinlegen, Zettel) hat `aria-modal="true"`, aber der Fokus bleibt beim Öffnen auf dem Auslöser hinter dem Schleier. Esc schließt nur bei Fokus im Dialog; im Test blieb „Ausschnitt“ nach Esc offen. Tab erreicht zuerst „Auf den Einband“ und „In die Ablage“ im Hintergrund.
- Prinzip: WCAG 2.2, 2.4.3 Focus Order und 2.1.1 Keyboard; WAI-ARIA APG Dialog (Modal) Pattern.
- Auswirkung: Tastatur- und Screenreader-Nutzer bedienen den Hintergrund, ohne es zu merken.
- Vorschlag: natives `<dialog>` mit `showModal()` oder die Logik aus `plate-viewer.tsx` übernehmen: Fokus hinein, halten, Esc am Fenster, Fokus zurück, Hintergrund `inert`.

**K3 Winzige Knöpfe an jeder Doppelseite** (Editor, `/neu`, Aufwand S)
- Beobachtung: „×“ 6 × 16 px, „←“/„→“ 11 × 16 px, Schloss 12 × 16 px, 12 px Abstand. Das Entfernen-Kreuz steht direkt neben „Nach hinten“.
- Prinzip: WCAG 2.5.8 Target Size (Minimum) 24 × 24 px; Fitts (1954): Zeit und Fehler steigen mit kleinerer Zielbreite; Apple HIG empfiehlt 44 × 44 pt.
- Auswirkung: Fehltreffer auf dem Telefon, im schlimmsten Fall Entfernen statt Verschieben.
- Vorschlag: Klickfläche 24 px (Touch 44 px) per Innenabstand; Entfernen absetzen oder in ein Menü „…“.

**K4 Auf dem Telefon landen die Werkzeuge weit unter dem Foto** (Editor, `/neu` 375 px, Aufwand M)
- Beobachtung: Panel „Buch“ beginnt bei 4 Doppelseiten erst bei etwa 1640 px. Tippen auf ein Foto zeigt nur den gelben Rahmen.
- Prinzip: Gesetz der Nähe (Wertheimer 1923); Rückmeldung am Ort des Handelns (Norman 2013).
- Auswirkung: Tippen wirkt wirkungslos; Titel wird übersehen (verstärkt K6).
- Vorschlag: Bottom Sheet unter 768 px; Titel und Leinen über die Doppelseiten.

**K5 Fotos zwischen Doppelseiten nur per Ziehen oder Alt+Pfeil** (Editor, `/neu`, Aufwand M)
- Beobachtung: Für Doppelseiten gibt es Pfeilknöpfe, für Fotos nur HTML-Drag-and-drop und Alt + ← / →. Beides gibt es auf Touch nicht verlässlich.
- Prinzip: WCAG 2.5.7 Dragging Movements; Shneiderman (1983): direkte Manipulation ist stark, braucht aber explizite Alternativen.
- Auswirkung: Reihenfolge der Fotos ist auf dem Telefon praktisch nicht steuerbar.
- Vorschlag: im Foto-Panel „Eine Seite vor / zurück“ und „Verschieben nach Doppelseite …“; Ziehen auf Pointer-Events umstellen.

### Schweregrad 2

**K6 Teilen ohne Titel** (Teilen, Aufwand S). Ohne Titel heißt der Dialog „„Ohne Titel“ hinlegen“, der Gast sieht „Ohne Titel“ in großer Prägung. Nielsen Heuristik 5. Erster Eindruck beim Freund ist ein Platzhalter. Vorschlag: Titelfeld im Teilen-Dialog, wenn leer, mit Vorschlag.

**K7 Ausschnitt nur mit der Maus, Abgeschnittenes unsichtbar** (Editor, Aufwand M). Pfeiltasten verschieben nichts, das Feld ist nicht fokussierbar; außerhalb des Felds wird nichts gezeigt. WCAG 2.1.1 und 2.5.7; Shneiderman (1983): kontinuierliche Darstellung des Objekts. Vorschlag: Pfeiltasten in 2-%-Schritten, Restbild mit 30 % Deckkraft.

**K8 „Layout“ blättert blind** (Editor, Aufwand M). Keine Anzahl, keine Vorschau. Wiedererkennen statt Erinnern (Nielsen Heuristik 6); Hick (1952) und Hyman (1953): wenige sichtbare Optionen sind schnell gewählt. Vorschlag: Miniaturleiste aller Varianten, „2 von 4“.

**K9 Ablegen ohne Rückmeldung am Ort** (Editor, Aufwand S). Nach Entf bleibt leeres Papier mit „3“, die Ablage liegt außerhalb des Bildschirms. Shneiderman et al. (2016), „Offer informative feedback“. Vorschlag: Hinweis „In die Ablage gelegt · Rückgängig“, freie Seite neu setzen.

**K10 Rezeptzettel auf dem falschen Bild** (Buch, `/#fuerteventura`, Aufwand M). Zettel zu Tafel 5 verdeckt Tafel 6; Knöpfe in der Kopfzeile. Norman (2013), Mapping; Gesetz der Nähe. Vorschlag: Zettel auf die Gegenseite des eigenen Bilds legen, Knopf „Rezept zu Tafel 5“.

**K11 Öffentliche Rezepte sind Platzhalter** (Buch, `/`, Aufwand S). Tafel 3 und 5 zeigen dasselbe „Sommerlicht“ und den Hinweis „Platzhalter“. Nielsen Heuristik 2; PRODUCT.md „nur Fakten, die stimmen“. Vorschlag: Knopf ausblenden, solange `placeholder` gesetzt ist.

**K12 Eselsohr nicht zurücknehmbar** (Gast, Aufwand S). „Eselsohr gesetzt“ mit `aria-pressed=true` reagiert nicht mehr; Fehler beim Senden werden verschluckt. Nielsen Heuristik 3. Vorschlag: echter Umschalter, Bestätigung und Fehlermeldung.

**K13 „Zurückziehen“ ohne Rückfrage** (Teilen, Aufwand S). Link ist sofort weg. Shneiderman et al. (2016), Fehlervermeidung und Umkehrbarkeit. Vorschlag: 5 s Rückgängig, dann löschen.

**K14 Feldrahmen auf Zettelpapier zu schwach** (Global, Aufwand S). `border-ink/25` = 1,67:1, Knöpfe `ink/30` = 1,87:1. WCAG 1.4.11 verlangt 3:1. Vorschlag: Rahmen in `ink-2` (5,3:1).

**K15 Umfrage verliert den Fokus** (QFD/Umfrage, `/umfrage`, Aufwand S). Nach jeder Antwort Fokus auf `body`, frühere Antwort beim Zurückgehen nicht markiert. WCAG 2.4.3; Nielsen Heuristik 6. Vorschlag: Fokus auf neue Frage, `aria-pressed` für die gewählte Antwort, Ziffern 1 bis 5 als Kürzel.

### Schweregrad 1

- **K16 Fokus nach dem Aufschlagen weg** (Buch, S). Fokus auf `body`. WCAG 2.4.3. Abschnitt des Buchs fokussieren, beim Zurücklegen den Band.
- **K17 „Hinlegen für …“ nicht selbsterklärend** (Teilen, S). Nielsen Heuristik 4. Metapher behalten, „Link teilen“ ergänzen.
- **K18 Kein Weg vom öffentlichen Tisch zum eigenen Buch** (Bibliothek, S). Zwei Tab-Stopps, keine Spur zu `/tisch`. Norman (2013), Auffindbarkeit. Erst nötig, wenn das Angebot offen ist.
- **K19 Langer Scrollweg, verschwindender Hinweis** (Buch, S). 13 829 px Spur, Hinweis nennt nur Scrollen. Norman (2013), Mapping. Hinweis um „← → oder Klick“ ergänzen, nach Pause wieder zeigen.
- **K20 Eselsohr-Ecke ohne Signifier** (Gast, S). Unsichtbarer 48 × 48 px Knopf. Norman (2013). Ecke beim Hover leicht anheben.
- **K21 Technische Fehlermeldung** (Bibliothek, `/tisch`, S). „Missing or insufficient permissions.“ roh durchgereicht (im Mock beobachtet). Nielsen Heuristik 9. In Alltagssprache übersetzen.
- **K22 QFD-Seite mobil sehr lang** (QFD/Umfrage, M). 49 567 px. Sweller (1988). Feste Schrittanzeige und Zusammenfassungen.

### Schweregrad 0

- **K23 Kontrastangaben in DESIGN.md und globals.css stimmen nicht** (Global, S). cloth auf table ist 8,34:1, nicht 4,34:1; `ink-2` ist auf paper 5,6:1, nicht 6,3:1. Kein Nutzerproblem, aber Grundlage für Regeln. Werte korrigieren, Kontraste per Skript prüfen.

Keine Befunde der Stufe 4: Nichts verhindert das Lesen oder das Anlegen eines Buchs grundsätzlich.

## Quick Wins

1. `SlipDialog` auf `<dialog>` mit `showModal()` umstellen (K2).
2. Leistenknöpfe auf 24 × 24 px, Touch 44 px; Entfernen absetzen (K3).
3. Feldrahmen von `ink/25` auf `ink-2` (K14).
4. Rezept-Knopf bei Platzhaltern ausblenden (K11).
5. Titelfeld im Teilen-Dialog, wenn leer (K6).
6. Hinweise mit Rückgängig für Ablegen und Zurückziehen (K9, K13).
7. Eselsohr als Umschalter, Sendefehler zeigen (K12).
8. Umfrage: Fokus auf neue Frage, Antwort markieren (K15).
9. Buch-Abschnitt nach dem Aufschlagen fokussieren (K16).
10. Firebase-Fehler übersetzen (K21).

Zusätzlich, ohne eigene Nummer: Einträge im Verlauf mit Miniatur der ersten Doppelseite und dem Anlass („vor „Automatisch gestalten““) statt nur „Zwischenstand“. Und nach dem ersten „Hinlegen“ einen kleinen Abschlussmoment, etwa das fertige Buch, das sich auf den Tisch legt, mit dem Link daneben (Peak-End-Regel).

## Bezug zum Editor-Umbau

Der Umbau zu freiem Layout, mehreren Bildern pro Seite und Textrahmen per Drag verschärft genau die Muster, die heute schon Probleme machen. Empfehlungen:

1. **Jedes Ziehen braucht einen Weg ohne Ziehen.** Gewählter Rahmen plus Pfeiltasten (eine Rasterspalte, mit Shift ein Sechstel), dazu Felder für Spalte, Zeile, Breite. WCAG 2.5.7, siehe K5 und K7.
2. **Raster als Magnet.** Rahmen rasten auf das vorhandene 6-Spalten-Raster mit 9 Zeilen ein, Hilfslinien beim Ziehen. Das senkt die nötige Genauigkeit (Fitts) und hält den Satzspiegel, ohne dass Nutzer Typografie können müssen.
3. **Zwei Modi klar trennen:** Rahmen bewegen und Bild im Rahmen bewegen. Sonst entstehen Modusfehler (Norman 2013). Ziehen am Rahmen bewegt den Rahmen, Doppelklick oder „Ausschnitt“ wechselt sichtbar in den Bildmodus, Esc zurück.
4. **Anfasser groß genug:** 24 px, auf Touch 44 px, außerhalb der Bildfläche (K3).
5. **Echte Überlaufmessung für Textrahmen** mit derselben Renderfunktion wie Seite und WebGL-Textur, dazu ein Überlaufzeichen am Rahmen (K1).
6. **Erst Vorlagen, dann frei.** Für mehrere Bilder pro Seite zuerst 4 bis 6 Vorlagen als Miniaturen, freies Verschieben als zweiter Schritt (K8, Hick-Hyman). Wiedererkennen ist leichter als Konstruieren.
7. **Undo-Granularität:** ein Ziehen ist ein Schritt; Zwischenstand vor dem Wechsel in den freien Modus. Das vorhandene Zusammenfassen per Tag passt.
8. **Fixieren pro Rahmen:** Von Hand gesetzte Rahmen sind fixiert, die Automatik fasst nur freie an; Zustand am Rahmen sichtbar.
9. **Werkzeuge am Objekt:** Panel neben dem gewählten Rahmen, auf dem Telefon als Bottom Sheet (K4).
10. **Tempo:** Rückmeldung beim Ziehen unter 100 ms (Nielsen 1993), schwere Neuberechnung erst nach dem Loslassen.
11. **Ehrliche Vorschau:** Die QFD-Anforderung K22 („Ich sehe vorher ehrlich, wie das Buch wirklich wird“) wird mit freiem Layout schwerer. Editor-Vorschau und Lesebuch müssen aus derselben Geometrie kommen.

## Test mit fünf Freunden

Nielsen (2000) argumentiert, dass fünf Personen etwa 85 % der Probleme finden, gestützt auf das Modell von Nielsen und Landauer (1993) mit einer mittleren Entdeckungswahrscheinlichkeit von rund 31 % pro Person und Problem. Die Zahl gilt für eine homogene Gruppe und für häufige Probleme. Faulkner (2003) zeigte, dass einzelne Fünfergruppen je nach Zusammensetzung sehr unterschiedlich viele Probleme finden. Deshalb: lieber drei Runden zu je fünf nach jeder Überarbeitung als eine große Runde, und Gruppen mit sehr unterschiedlichen Voraussetzungen getrennt testen.

Ablauf:

1. Fünf Personen einzeln, gemischt: zwei Handy, zwei Kamera, eine ohne Fotobuch-Erfahrung. 30 bis 40 Minuten, eigenes Gerät.
2. Lautes Denken. Nicht helfen, nur nachfragen („Was erwartest du jetzt?“).
3. Aufgabe 1: „Finde das Bild mit dem Rettungsturm groß.“ Zeit und Weg messen.
4. Aufgabe 2: „Wie wurde dieses Foto bearbeitet?“ Ordnen sie den Zettel dem richtigen Bild zu (K10)?
5. Aufgabe 3: „Mach aus 15 eigenen Fotos ein Buch, gib ihm einen Titel und leg es für mich hin.“ Zeit bis zum Link, Abbrüche.
6. Aufgabe 4: „Ändere das Layout der zweiten Doppelseite, verschieb ein Foto nach hinten, schreib einen kurzen Text und mach etwas rückgängig.“
7. Aufgabe 5: als Gast: „Sag mir, welches Bild dir am besten gefällt.“ Werden Eselsohr oder Zettel gefunden?
8. Nach jeder Aufgabe Schwierigkeit 1 bis 7, am Ende SUS (Brooke 1996) und „Was hat gestört, was hat gefallen?“.
9. Aufnahme mit Einverständnis; danach Befunde mit dieser Liste abgleichen und Schweregrade nach echter Häufigkeit neu setzen.
10. Barrierefreiheit getrennt: eine Runde nur Tastatur, eine mit VoiceOver auf dem iPhone. Das ersetzt keine Tests mit betroffenen Menschen.

## Quellen

- Brooke, J. (1996). SUS: A ‘quick and dirty’ usability scale. In P. W. Jordan et al. (Hrsg.), *Usability Evaluation in Industry*, 189–194. Taylor & Francis.
- Chang, B.-W., & Ungar, D. (1993). Animation: From Cartoons to the User Interface. *Proceedings of UIST '93*, 45–55.
- Doherty, W. J., & Thadani, A. J. (1982). *The Economic Value of Rapid Response Time*. IBM Report GE20-0752-0.
- Faulkner, L. (2003). Beyond the five-user assumption. *Behavior Research Methods, Instruments, & Computers*, 35(3), 379–383.
- Fitts, P. M. (1954). The information capacity of the human motor system in controlling the amplitude of movement. *Journal of Experimental Psychology*, 47(6), 381–391.
- Hick, W. E. (1952). On the rate of gain of information. *Quarterly Journal of Experimental Psychology*, 4(1), 11–26.
- Hyman, R. (1953). Stimulus information as a determinant of reaction time. *Journal of Experimental Psychology*, 45(3), 188–196.
- Kahneman, D., Fredrickson, B. L., Schreiber, C. A., & Redelmeier, D. A. (1993). When more pain is preferred to less: Adding a better end. *Psychological Science*, 4(6), 401–405.
- Kurosu, M., & Kashimura, K. (1995). Apparent usability vs. inherent usability. *CHI '95 Conference Companion*, 292–293.
- Nielsen, J. (1993). *Usability Engineering*. Morgan Kaufmann. Zusammenfassung: https://www.nngroup.com/articles/response-times-3-important-limits/
- Nielsen, J. (1994). 10 Usability Heuristics for User Interface Design. https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen, J. (1994). Severity Ratings for Usability Problems. https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/
- Nielsen, J. (2000). Why You Only Need to Test with 5 Users. https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/
- Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. *Proceedings of INTERCHI '93*, 206–213.
- Norman, D. A. (2013). *The Design of Everyday Things*. Revised and Expanded Edition. Basic Books.
- Shneiderman, B. (1983). Direct Manipulation: A Step Beyond Programming Languages. *IEEE Computer*, 16(8), 57–69.
- Shneiderman, B., Plaisant, C., Cohen, M., Jacobs, S., Elmqvist, N., & Diakopoulos, N. (2016). *Designing the User Interface* (6. Aufl.). Pearson.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257–285.
- Tractinsky, N., Katz, A. S., & Ikar, D. (2000). What is beautiful is usable. *Interacting with Computers*, 13(2), 127–145.
- Tversky, B., Morrison, J. B., & Bétrancourt, M. (2002). Animation: can it facilitate? *International Journal of Human-Computer Studies*, 57(4), 247–262.
- W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- W3C WAI. *ARIA Authoring Practices Guide: Dialog (Modal) Pattern*. https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Apple. *Human Interface Guidelines: Accessibility*. https://developer.apple.com/design/human-interface-guidelines/accessibility
- Wertheimer, M. (1923). Untersuchungen zur Lehre von der Gestalt II. *Psychologische Forschung*, 4, 301–350.
