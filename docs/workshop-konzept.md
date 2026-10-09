# Fujiventura: zwei Bücher auf einem Tisch

Gemeinsames Konzept aus dem Workshop mit Aiko Mori (Sequenz), Mara Lindqvist (Buchgestaltung) und Lena Okafor (Interaktion). Wo die drei uneinig blieben, habe ich entschieden. Diese Stellen sind mit **Entscheidung** markiert, die verworfene Alternative steht jeweils in einem Satz dahinter.

---

## 1. Kern

Fujiventura ist ein persönliches Fotobuch-Objekt. Auf einem dunklen Basalttisch liegen zwei Bände einer Reihe: ein dichtes, gelbes Fuerteventura mit 26 Tafeln und ein dünnes, stilles Japan mit 9 Tafeln. Man blättert sie mit echter Seitenkrümmung, und sie antworten einander über Bildreime. Der Tisch selbst ist die Navigation: Ein Scroll liest Fuerteventura, legt es zurück und schlägt Japan auf. Es gibt kein Menü, kein Regal und keine Knöpfe.

---

## 2. Diagnose des heutigen Buchs

1. **Gleichtakt.** `single()` und `bleed()` in `plates.ts` sind dieselbe Funktion. 11 von 20 Bild-Doppelseiten sind deshalb gleich gebaut: links Papier mit einer Zeile, rechts das randabfallende Bild. Beim Blättern entsteht ein Metronom statt eines Rhythmus.
2. **Leeres Papier blendet auf Lava.** Auf `#1b1917` ist jede leere Gegenseite die hellste Fläche im Bild, elfmal Weiß statt Foto.
3. **Papierstreifen von 15cqw** unter Paaren und Panoramen. Das ist weder randlos noch gerahmt, die Bilder hängen wie Polaroids an der Oberkante.
4. **Das Seitenformat passt nicht zu den Fotos.** Die Seite ist 1:1.3, 23 von 26 Fotos sind 2:3. Randlos gehen deshalb oben und unten je etwa 13 % verloren. Auf dem Handy gilt mit `compact` ein drittes Format.
5. **Der Bund schneidet durch Motive.** Bei `03-strand` steht Michel im Falz, bei `06-mittagsblume` läge die Blüte darin.
6. **Die Reihenfolge ist nach Themen sortiert, nicht als Sequenz gebaut.** Von `sonnenschirm` bis `gitter-garten` stehen neun Pflanzenbilder hintereinander, die Paare ordnen nach Pflanzenart. Alle Bilder haben dieselbe Größe, es gibt nur eine Lautstärke.
7. **Das Cover verbraucht sich.** `09-rettungsturm` steht auf dem Einband und gleich danach als Tafel 2. „Fujiventura“ steht dreimal riesig da (Intro, Einband, Titelseite).
8. **Die Doku widerspricht dem Code.** `DESIGN.md` nennt noch `scroll-snap-type: y proximity`, obwohl das abgelehnt und entfernt ist.

---

## 3. Der Tisch und die zwei Bücher

### Objekte

| | Fuerteventura | Japan |
|---|---|---|
| Seitenformat | 2:3 (Fuji), Doppelseite 4:3 | 3:4 (iPhone), 85 % der Breite von Fuerteventura |
| Buchblock | dick (26 Tafeln) | sichtbar dünn (9 Tafeln), Papierkanten wachsen ehrlich mit der Seitenzahl |
| Einband | Ringelblumen-Leinen `cloth`, `09-rettungsturm` eingelassen | nebelgraues Leinen, Fenster auf `j08` |
| Licht beim Lesen | warmer Kegel, Palmenschatten | kühles, gestreutes Licht, kein Pflanzenschatten |

Auf 1440×900 ist die Fuerteventura-Doppelseite etwa 1000px breit (Seite rund 500×750). Links und rechts bleibt Tisch, und das Buch wird wieder ein Gegenstand statt eines Viewers.

### Erscheinen (Intro)

1. **0–2,4 s wie heute:** 26 Abzüge fallen, FUJIVENTURA baut sich auf, die Abzüge schieben sich zum gelben Buch zusammen.
2. **2,4–3,3 s, die Kamera fährt zurück:** Die Tischebene skaliert von 1 auf 0,72, `cubic-bezier(0.77,0,0.175,1)`, 900 ms. Das gelbe Buch rückt nach links, das Japan-Buch kommt rechts ins Bild. Es fliegt nicht herein, es lag schon die ganze Zeit dort.
3. **3,5 s:** Der gelbe Einband hebt sich wie heute um 28° an, 400 ms später der graue um 12°.
- Japan bekommt keine eigenen Abzüge im Intro.
- Jede Eingabe während des Intros springt sofort in den Endzustand.
- Bei `prefers-reduced-motion` gibt es kein Intro, die Seite startet direkt auf dem Tisch.

### Auf dem Tisch

- **Desktop:** Fuerteventura bei 33 % der Breite, −4° gedreht. Japan bei 67 %, +3° gedreht und 40px tiefer. Darunter steht klein „Fuerteventura · 26 Tafeln“ und „Japan · 9 Tafeln“ (14px, `on-table-2`; auf Lava nachgerechnet 9.39:1).
- **Hover:** Das Buch hebt sich um 8px, `scale(1.015)`. Eine zweite, weichere Schattenebene blendet über `opacity` ein, 500 ms `ease-out-expo`. Das andere Buch wird nicht abgedunkelt.
- **Klick oder Tipp:** Die Kamera fährt auf das Buch, `rotateX` geht von 16° auf 4° (gibt es schon), ab 400 ms öffnet sich der Einband mit der WebGL-Krümmung, insgesamt 900 ms. Das andere Buch verschwindet, weil die Kamera weiterfährt.
- **Handy (430×932):** Fuerteventura oben links mit 58 % Breite und −3°, Japan unten rechts mit +4°. Beide sind ganz zu sehen (zusammen etwa 700px hoch), ein Tipp öffnet.

### Wechsel zwischen den Büchern

- **Scrollspur:** [Fuerteventura-Blätter] → [Tisch, etwa 120dvh, an das Scrollen gekoppelt] → [Japan-Blätter], rückwärts genauso. Nach dem Kolophon klappt der Rückdeckel zu, die Kamera fährt im Scrub auf den Tisch zurück, weiterscrollen schlägt Japan auf. Kein Snapping, kein Lenis, die bestehende Feder auf dem Scrollwert bleibt.
- **Klick auf das andere Buch:** Scrollposition und Federwert werden direkt gesetzt, die Kamera fährt zeitgesteuert in 900 ms. Man federt also nicht durch 26 Tafeln.
- **Zurück zum Tisch:** Klick auf die Wortmarke, `Esc`, die Zurück-Taste des Browsers oder rückwärts über den Einband hinaus blättern.
- **Hash:** `#fuerteventura` und `#japan` über `history.pushState`, ohne Router. Deep-Links funktionieren.
- **Bildfolge-Linie:** 1px, 26 Punkte, eine Lücke für den Tisch, dann 9 Punkte, wie ein Fahrplan mit Umstieg. Die Füllung in `cloth` läuft durch beide Bände, die ganze Linie ist eine Scrub-Fläche. Auf dem Telefon bleiben etwa 10px pro Halt.
- **Kopfzeile:** links die Wortmarke (heißt „zum Tisch“), in der Mitte die Unterschrift der aktuellen randlosen Tafel (Live-Region), rechts „Japan · 4–5 / 9“. Auf dem Tisch steht nur „2 Bücher“.

### Mobil

- **Lesen:** Ein Seitensystem für alle Geräte, die `compact`-Sonderlogik entfällt. Beim Lesen werden die Seiten auf die Viewportbreite minus 24px gesetzt: Fuerteventura etwa 406×609, Japan 406×541. Die Doppelseiten werden zu Einzelseiten von links nach rechts.
- **Seitlich wischen** blättert, die Seite folgt dem Finger, wie heute.
- **Neu, nach unten ziehen auf einem offenen Buch:** Das Buch folgt dem Finger (`translateY`, `scale` bis 0,9). Ab 80px oder bei schnellem Wischen legt es sich auf den Tisch, sonst federt es zurück. Die Bühne bekommt `touch-action: none`.
- **Über den Rückdeckel hinaus wischen** legt das Buch auf den Tisch, das nächste Wischen öffnet das andere Buch.
- **Leere Seiten:** T6 entfällt auf dem Telefon, die Unterschrift wandert in die Kopfzeile. T3 bleibt klein und behält seine Pause.
- **Hinweis:** „Wischen zum Blättern“ verschwindet nach dem ersten erfolgreichen Wischen und kommt in dieser Sitzung nicht wieder.

**Entscheidung: Bindung von links nach rechts für beide Bände.** Japan bekommt keine Bindung von rechts nach links. In der durchgehenden Scrollspur würde die Blätterrichtung sonst mitten im Scrollen umkippen, und der Satz ist ohnehin lateinisch.

---

## 4. Buch 1: Fuerteventura

### Einband

- Ringelblumen-Leinen `cloth`, Falz am Rücken wie heute.
- `09-rettungsturm` ist ohne weißen Rand und ohne Schlagschatten in eine Prägemulde eingelassen: innen eine Linie von 0.5cqw in `cloth-deep`.
- Das Bild ist 4 Rasterspalten breit (54cqw, 2:3) und sitzt oben an der Bundecke des Satzspiegels (oben 9, Bund 6).
- Titel „Fuerteventura“ in `cloth-ink` (6.79:1) unten links auf der Satzspiegelkante.

### Satzspiegel und Raster (gilt für beide Bände)

- **Ränder:** Bund : oben : außen : unten = 6 : 9 : 12 : 18cqw, bei Japan unten 15.
- **Satzspiegel:** Fuerteventura 82×123cqw (2:3), Japan 82×109cqw (3:4). Er hat damit dieselbe Proportion wie die Fotos.
- **Raster:** 6 Spalten mit 2cqw Fuge und 9 Zeilen. Kleine Bilder stehen immer auf Rasterlinien, nie mittig.
- **Unterschriften:** Grundlinie bei Satzspiegel-Unterkante + 6cqw, ausgerichtet an der Außenkante des Bildes.
- **Papier:** Naturpapier `#eee9df` statt `#f6f6f2`, Vergilbung schwächer. Nachgerechnet: `ink` 14.14:1, `ink-2` 5.6:1.
- **Bundwölbung:** bleibt.

### Seitentypen

Alle Typen bestehen nur aus Rechtecken, Bildern und Text und lassen sich auf Canvas zeichnen.

| Typ | Aufbau | Text auf der Seite |
|---|---|---|
| **T1 Vollbild** | das ganze Bild randlos auf der Seite, ohne Beschnitt | nichts, Titel in der Kopfzeile |
| **T2 Tafel** | das Bild füllt exakt den Satzspiegel | Nummer und Titel darunter |
| **T3 Kleine Tafel** | 3 Spalten (≈40cqw), bei 9:16 2 Spalten (≈26cqw), auf einer Rasterlinie im oberen oder unteren Drittel, außen oder am Bund | ja |
| **T4 Querformat** | 3:2 über die volle Seitenbreite, am Bund und außen randlos, hängt an der oberen Satzspiegellinie (9cqw) | darunter |
| **T5 Über den Bund** | nur `11-felsbogen`, von 3:2 auf 4:3 beschnitten, `focusX` hält die Figur bei ≈30 % | nichts |
| **T6 Leer** | nur die Unterschrift der Gegenseite | ja |
| **T7 Hoher Streifen** | 9:16 in voller Seitenhöhe, am Bund, oben und unten randlos, außen ≈25cqw Papier | im Papierstreifen |

Den Papierstreifen gibt es nicht mehr. Jedes Bild ist entweder ganz randlos oder ganz gerahmt.

**Regeln für den Rhythmus:**
- Ein randloses Paar T1 | T1 steht nie zweimal hintereinander.
- Spätestens nach drei Doppelseiten kommt eine Seite mit viel Papier (T3, T4 oder T6).
- Genau eine T6 pro Band, und sie trägt eine Bedeutung.

**Entscheidung: eine leere Seite pro Band.** Mara wollte bis zu drei, Lena bis zu zwei. Auf Lava trägt Leere nur, wenn sie selten ist, deshalb gilt Aikos eine pro Band.

### Sequenz (26 Tafeln, 14 Bild-Doppelseiten)

Die Folge läuft über Licht und Farbe: Meer und Blau, dann Rot und Grün im Landesinneren, dann Wände, Türen und Gelb. Gelb klammert das Buch.

| | links | rechts | Tafeln | warum |
|---|---|---|---|---|
| F1 | Vorsatz | Titel, leise | | |
| F2 | `08-drachenbaum` T1 | `03-strand` T4 | 1, 2 | Der Fotograf tritt zweimal ein: gespiegelt im Fenster, dann am Wasser. Das Panorama liegt nicht im Bund. |
| F3 | `01-schild-am-meer` T1 | `02-palme` T1 | 3, 4 | zwei senkrechte Pfosten vor Blau, Kante an Kante |
| F4 | `sonnenschirm` T3 oben außen | `09-rettungsturm` T1 | 5, 6 | erste Pause, der weiße Himmel geht ins Papier über. Das Coverbild kommt erst hier. |
| F5 | `11-felsbogen` T5 über beide Seiten | | 7 | Michel steht links, im Bund liegt der Himmel im Bogen. Ab hier Landesinneres. |
| F6 | `05-kaktus-dach` T1 | `markisen` T1 | 8, 9 | steigende Diagonalen, Orange gegen Blau-Weiß |
| F7 | `06-mittagsblume` T4 | `14-seetraube` T1 | 10, 11 | Lachs und Rostrot, die Blüte nicht im Bund |
| F8 | `12-weihnachtsstern` T1 | `garten-auto` T1 | 12, 13 | dieselben dunstigen Hügel, einmal mit Rot, einmal mit Blech |
| F9 | `07-wolfsmilch` T2 | `04-bougainvillea` T2 | 14, 15 | gleiches Himmelblau, gelbe Spitzen. Gerahmt, die Lautstärke sinkt. |
| F10 | `13-trompetenblume` T3 unten am Bund | `blumentopf` T1 | 16, 17 | die leiseste Blüte neben einem vollen Bild |
| F11 | `raupe` T1 | `gitter-garten` T1 | 18, 19 | beide durch Latten oder Gitter gesehen |
| F12 | `10-stuhl` T2 | `spiegel` T2 | 20, 21 | Rahmen im Rahmen: Öffnung in der Wand, Spiegel |
| F13 | `nr2` T1 | `padel` T1 | 22, 23 | zwei Grüns, Türkassetten gegen Zaunraster, die dichteste Stelle |
| F14 | `reifen` T3 außen | `15-hunde` T1 | 24, 25 | trockene Pause, dann vier Hunde, die in einer Reihe warten |
| F15 | **T6**, Unterschrift von 26 | `stuehle-gelb` T1 | 26 | die einzige leere Seite neben den zwei leeren Stühlen: Abreise |
| F16 | Bildverzeichnis (Kontaktbogen) | Kolophon | | |

**Prüfung:**
- Alle 26 Dateien kommen genau einmal vor.
- Die T1|T1-Paare stehen bei F3, F6, F8, F11 und F13, nie direkt hintereinander.
- Papierseiten kommen bei F2, F4, F7, F10, F12, F14 und F15.

**Entscheidungen zur Folge:**
- **Rettungsturm auf Tafel 6 statt Tafel 2.** Maras F2 `08-drachenbaum` | `09-rettungsturm` ist verworfen, weil es Einband und Tafel 2 wieder gleich macht.
- **`stuehle-gelb` als T1 statt T2.** Neben der leeren Seite gerahmt wäre das fast eine ganze Papier-Doppelseite und die hellste Fläche des Buchs.
- **`raupe` | `gitter-garten` randlos statt T2|T2.** Maras gerahmte Variante ist verworfen, weil direkt danach `10-stuhl` | `spiegel` den Rahmen-Reim schon gerahmt trägt.
- **`blumentopf` als T1 statt T2** (Mara). Aikos T2 gegenüber einer T3 hätte eine zweite fast leere Doppelseite ergeben.
- **`03-strand` als T4.** Es läuft nicht über den Bund. Aikos `focusX 0.68` ist verworfen, weil Michel dabei rechnerisch nur bei ≈44 % landet, also wieder am Falz.

---

## 5. Buch 2: Japan

### Dateien und Motive (aus den Bildern bestimmt)

| Datei | Motiv | Format, Größe |
|---|---|---|
| `j01` | rote Holzbrücke über einer Schlucht, kahle Bäume, Nebel, Weg rechts | 3:4, 1500×2000 |
| `j02` | großes Fisch-Wandbild in Rotviolett an einem Hotelhochhaus, harter blauer Himmel | 3:4, 1500×2000 |
| `j03` | weißer Reiher im flachen Wasser, mit Spiegelbild | 9:16, 1125×2000 |
| `j04` | Weg durch den Bambuswald, zwei Menschen am Ende | 9:16, 1125×2000 |
| `j05` | Sakefässer gestapelt, links schmaler roter Pfosten, rechts zwei rote Säulen | 3:4, 3024×4032 (DNG) |
| `j06` | Sakefässer nah, am rechten Rand eine breite rote Säule | 3:4, 3024×4032 (DNG) |
| `j07` | Jizō-Steinfiguren mit roten Mützen in Reihen am Weg | 3:4, 3024×4032 (DNG) |
| `j08` | oranges Torii im Wasser, Berge, Wolken | 3:4, 3024×4032 (DNG) |
| `j09` | Blick über die Stadt von erhöhter Stelle, Straße und Bahn, tiefe Sonne, Dunsthimmel | 3:4, 3024×4032 (DNG) |

### Einband

- **Material:** nebelgraues Leinen `#c9c8c3`. Es ist dieselbe Leinen-Textur wie bei Fuerteventura, nur anders getönt: eine Reihe, eine Textur.
- **Fenster:** ein ausgestanztes Rechteck an derselben Stelle und in derselben Größe wie die Prägemulde des gelben Bands (4 Spalten, oben an der Bundecke). Durch das Fenster sieht man `j08`, das auf der Titelseite darunter liegt. Das Torii ist die einzige Farbe auf dem Einband.
- **Schrift:** Titel und Autorname in `ink`, nachgerechnet 10.21:1. `ink-2` erreicht dort nur 4.04:1, deshalb gibt es auf dem Einband keine graue Schrift.
- **Kontrast zum Tisch:** Auf Lava liegt das Grau bei 10.46:1, das Buch hebt sich klar ab, ohne zu schreien.
- **Technik:** Alpha-Test im Shader (`discard` im Fensterrechteck), darunter die Titelseiten-Textur. Rückfall für Safari: `j08` eingelassen, mit einer Linie in `ink` darum.
- **Arbeitstitel:** „Japan“, darunter klein „Kyoto Tokio Miyajima“. Den endgültigen Namen entscheidet Michel.

**Entscheidungen zum Einband:**
- **Leinen statt Karton.** Maras Karton `#d9d8d3` ist verworfen: Er braucht eine zweite Textur und läse sich auf dem Canvas wie eine weitere Papierseite.
- **Grau statt Zinnober.** Maras Zinnober-Leinen ist verworfen, weil zwei gesättigte Einbände nebeneinander den Blick von den Fotos abziehen.
- **`j08` statt `j01`.** Lenas `j01` als Coverbild ist verworfen, weil es den Auftakt innen verbraucht.

### Seitentypen

Dieselben wie in Band 1: T1, T2, T3, T6 und T7, Satzspiegel 82×109cqw, Papier `#eee9df`.

**Entscheidung: dasselbe Papier für beide Bände.** Maras kühlerer Ton `#ebeae4` ist verworfen, weil der Unterschied auf Lava nicht sichtbar wäre und nur ein zweites Token kostet.

### Sequenz (9 Tafeln, 5 Bild-Doppelseiten)

| | links | rechts | Tafeln | warum |
|---|---|---|---|---|
| J1 | Vorsatz | Titel: „Japan“ in 7cqw oben, `j08` auf 4 Spalten an der Fensterstelle | | |
| J2 | `j01` T1 | `j04` T7 | 1, 2 | Grau nach den gelben Stühlen, nur die Brücke ist rot. Zwei Wege, die in den Dunst führen. |
| J3 | `j06` T1 | `j05` T1 | 3, 4 | Die breite Säule rechts in `j06` trifft im Bund auf den roten Pfosten links in `j05`: eine Doppelsäule genau im Falz. Die einzige laute Doppelseite. |
| J4 | `j07` T1 | `j03` T3, 2 Spalten, unten außen | 5, 6 | Figuren in einer Reihe, dann ein kleiner weißer Vogel auf viel Papier |
| J5 | `j02` T2 | `j09` T2 | 7, 8 | zweimal Stadt, zweimal Blau, beide gerahmt: der harte Bruch in der Stille, zitiert |
| J6 | **T6**, Unterschrift von 9 | `j08` T1 | 9 | Leere wie Wasser vor dem Tor. Das Fensterbild kommt groß, die Klammer zum Einband schließt sich. |
| J7 | Bildverzeichnis | Kolophon | | |

**Entscheidungen zur Folge:**
- **`j06` | `j05` in dieser Reihenfolge**, darin sind sich alle drei einig. Maras erste Fassung `j05` | `j06` ist verworfen, weil dort der Bund durch die beschrifteten Fässer liefe.
- **Japan endet mit `j08`, nicht mit `j09` klein.** Maras T6 | `j09` T3 wäre eine fast leere Doppelseite am Schluss, und die Fensterklammer ist stärker als ein zweites Abreisebild.
- **`j09` als T2 statt T1.** So bleibt das niedrig aufgelöste Bild gerahmt, und `j02` wird nicht randlos laut.

### Auflösung

`j05` bis `j09` lagen dem Workshop nur als 800px-Vorschau vor. Die DNG-Originale haben 4032×3024px und tragen auch auf dem iPhone; die Einschränkung entfällt.

---

## 6. Typografie und Bildunterschriften

- **Eine Schrift:** Bricolage Grotesque. Der große Titel steht nur im Intro und auf dem Einband.
- **Titelseite Fuerteventura:** „Fuerteventura“ in 7cqw an der oberen Satzspiegellinie, darunter „Sechsundzwanzig Fotografien von Fuerteventura“ in 3cqw, der Name am Fuß.
- **Titelseite Japan:** „Japan“ in 7cqw, „Neun Fotografien“ in 3cqw, „Kyoto Tokio Miyajima“, der Name am Fuß.
- **Unterschriften** in `max(11px, 2.6cqw)`, Nummer halbfett in `ink` mit tabellarischen Ziffern, Titel in `ink-2`. Sie stehen nur auf Papier (T2, T3, T4, T6, T7).
- **Auf T1 und T5 steht nichts auf der Seite.** Nummer und Titel stehen in der Kopfzeile, zum Beispiel „Fuerteventura · 4 Palme“, außerdem im Vollbild und im Verzeichnis.
- **Keine Seitenzahlen**, nur Tafelnummern. Japan zählt eigenständig von 1 bis 9.
- **Bildverzeichnis:** ein Kontaktbogen auf dem Raster mit Daumen, Nummer und Titel. Ein Klick springt zur Tafel.
- **Kolophon:** nur gesicherte Angaben: Titel, Anzahl, Orte, „Fotografie und Gestaltung: Michel Leotta“, Schrift, Jahr. Kameraangaben für Japan nur, wenn Michel sie bestätigt.
- **Fuerteventura-Titel** bleiben wie in `plates.ts`, einschließlich der Notizen (zum Beispiel „Playa El Bajo Negro“).

**Japan-Titel** (beschreibend, Ortsnamen nur, wo Michel sie genannt hat):

| Datei | Titel | Alt-Text (Kurzform) |
|---|---|---|
| `j01` | Rote Brücke im Nebel | Eine rote Holzbrücke über einer bewaldeten Schlucht, kahle Bäume, Nebel, rechts ein Weg. |
| `j04` | Bambusweg, Arashiyama | Ein Weg zwischen hohen Bambusstämmen, am Ende zwei Menschen. |
| `j06` | Fässer an der roten Säule | Gestapelte, beschriftete Sakefässer, rechts eine breite zinnoberrote Säule. |
| `j05` | Sakefässer zwischen Säulen | Gestapelte Sakefässer unter einem Dach mit roten Säulen. |
| `j07` | Jizō mit roten Mützen | Steinfiguren mit roten Strickmützen in Reihen an einem Kiesweg. |
| `j03` | Reiher im flachen Wasser | Ein weißer Reiher steht im klaren, flachen Wasser, unter ihm sein Spiegelbild. |
| `j02` | Fisch an der Hauswand, Tokio | Ein großer gemalter Fisch an der Fassade eines Hochhauses vor blauem Himmel. |
| `j09` | Blick über die Stadt | Von erhöhter Stelle über Straßen, Bahngleise und Häuser, tiefe Sonne im Dunst. |
| `j08` | Torii im Wasser, Miyajima | Ein orangefarbenes Torii steht im Meer, dahinter Berge und Wolken. |

**Offen für Michel:**
- Welche Bilder gehören zu Kyoto, welche zu Tokio (`j01`, `j03`, `j05`–`j07`, `j09`)?
- Welcher Schrein ist auf `j05`–`j07` zu sehen?
- Ist der Reiher ein Seidenreiher? Gelbe Füße und schwarzer Schnabel sprechen dafür. Bis dahin bleibt der Titel ohne Artnamen.

---

## 7. Bewegung

**Bleibt:**
- das Intro mit 26 Abzügen und FUJIVENTURA
- die WebGL-Seitenkrümmung (64 Segmente), sie bekommt nur das Seitenverhältnis als Parameter (1.5 oder 1.333)
- die Feder auf dem Scrollwert
- auf dem Handy die Seite, die dem Finger folgt
- das Anheben des Einbands als Hinweis
- Klick auf ein Bild vergrößert es (jetzt ohne Beschnittunterschied zur Seite)
- Palmenschatten und Lichtkegel für Fuerteventura

**Neu:**
- die Kamera als Transform auf der Tischebene: Rückfahrt im Intro, Fahrt beim Öffnen und Schließen (900 ms, `cubic-bezier(0.77,0,0.175,1)`)
- Hover auf dem Tisch (−8px, `scale(1.015)`, Schattenebene über `opacity`, 500 ms `ease-out-expo`)
- die Tischstrecke im Scrub (≈120dvh)
- auf dem Handy nach unten ziehen zum Zurücklegen
- Licht pro Band: zwei Lichtebenen, Überblendung über `opacity` in 900 ms; auf dem Tisch liegt das Licht dazwischen, bei einem Neuntel der Auflösung, auf Safari ohne Filter
- das Einbandfenster per Shader-`discard`
- die Bildfolge-Linie mit Punkten und Lücke
- ein Zustandsautomat `table | opening | reading(book) | closing`

**Muss weg:**
- der Papierstreifen und `single()`/`bleed()`
- die `compact`-Sonderlogik
- die 26 Striche in der Linie
- der dauerhafte Wisch-Hinweis
- der Scroll-Snap-Absatz in `DESIGN.md`

**Kommt nicht:**
- Bindung von rechts nach links, ein zweites Intro
- Neigung zur Maus, Regal, Ton, Partikel
- ein „Weiter zu Japan“-Knopf, Text auf Fotos

**Regeln:**
- Animiert werden nur `transform`, `opacity` und `clip-path`.
- Bei reduzierter Bewegung gibt es kein Intro, Kamera und Bücher springen, Hash und Linie funktionieren wie sonst.
- Es gibt einen WebGL-Kontext mit höchstens drei Doppelseiten-Texturen im Speicher.
- Japan lädt anfangs nur Einband und Titelseite, die übrigen Seiten bei Hover, Tipp oder 80 % Fortschritt in Fuerteventura.

---

## 8. Umsetzung in kleinen Schritten

Nach jedem Schritt: Commit und Prüfung im Browser bei 1440px und am iPhone.

1. **Tisch und Doku:** Lava wird Standard. `DESIGN.md` bekommt den Scroll-Snap-Absatz gestrichen, Papier `#eee9df`, die neuen Kontrastwerte und Seitentypen. `?tisch=` bleibt nur zum Testen.
2. **Datenmodell:** `plates.ts` wird zu `books.ts` mit `Book = { id, aspect, cloth, plates, spreads }`. Die Seitentypen `full | plate | small | landscape | across | blank | tall` haben Parameter für Rasterzelle und `focusX`. `single`, `bleed` und `pair` fallen weg.
3. **Fuerteventura neu setzen:** Format 2:3, Satzspiegel, Raster und die Typen T1–T6 in `page-view.tsx`. Sequenz F1–F16, leise Titelseite. Den Canvas-Zeichner für die neuen Typen nachziehen.
4. **Mobil auf ein System umstellen:** Einzelseiten aus Doppelseiten ableiten, `compact` entfernen, T6 entfällt, Unterschrift in die Kopfzeile (Live-Region).
5. **Verzeichnis und Kolophon:** Kontaktbogen mit Trefferflächen, Sprung zur Tafel.
6. **Einband Fuerteventura:** Prägemulde statt aufgeklebtem Abzug.
7. **Japan-Buch:** Bilder einbinden (aus den DNG-Originalen), Format 3:4 mit 85 % Breite, T7, Sequenz J1–J7. Erst einzeln über `#japan` lesbar machen.
8. **Japan-Einband:** graues Leinen und Fenster per `discard`, Rückfall mit Linie.
9. **Tisch als Wahl:** Zustandsautomat, Kamera-Transform, beide Bücher liegen auf dem Tisch, Hover, Klick öffnet, `Esc`, Wortmarke, Hash und Zurück-Taste.
10. **Durchgehende Scrollspur:** Fuerteventura → Tisch (Scrub) → Japan, direkter Sprung beim Klick ohne Feder.
11. **Intro erweitern:** Kamerarückfahrt und Hinweis für das zweite Buch, Eingabe springt ans Ende, reduzierte Bewegung startet auf dem Tisch.
12. **Bildfolge-Linie:** 26 + Lücke + 9 Punkte, Kopfzeile „Japan · 4–5 / 9“.
13. **Mobile Gesten:** nach unten ziehen, über den Deckel hinaus wischen, Hinweis ausblenden.
14. **Licht pro Band:** Überblendung der Lichtebenen.
15. **Laden und Speicher:** Japan-Texturen verzögert laden, höchstens drei Doppelseiten im Speicher. Messen auf dem iPhone (Bildrate beim Blättern und bei der Kamerafahrt), Lighthouse mobil.

---

## 9. Zitate

- **Aiko Mori:** „Ein Panorama über den Bund darf sein Motiv nie in die Mitte legen.“
- **Mara Lindqvist:** „Leerraum, der zwölfmal kommt, trägt keine Bedeutung mehr, er ist nur noch Leerlauf.“
- **Lena Okafor:** „Ein Regal ist ein Menü im Kostüm, und auf einem Tisch steht keins.“