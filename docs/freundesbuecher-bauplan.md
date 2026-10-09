# Bauplan: Freundesbücher mit Rezept

## 1. Was wir bauen

Ein kleines, privates Werkzeug für Michel und 5–30 Freunde (Schätzung): Fotos reinziehen, nach Michels Regeln entsteht ein Fotobuch, und es wird per persönlichem Link mit echter Seitenkrümmung auf einem Basalttisch geöffnet. Unter jedem Bild liegt, wenn die Datei es hergibt, das Rezept: Fuji-Einstellungen zum Nachstellen an der Kamera oder ein Lightroom-Preset zum Laden. Es gibt keinen Feed, keine Likes und keinen Verkauf, nur Bücher, Widmungen und Rezepte im Freundeskreis.

## 2. So fühlt es sich an

1. Michel kommt aus Japan zurück und zieht 40 JPGs in `/neu`. Die DNGs legt er daneben.
2. Der Browser liest die Rezepte lokal und kodiert die Bilder neu, GPS fällt dabei weg. Nach einer Minute liegt ein fertiges Buch da.
3. Michel tauscht zwei Doppelseiten, wählt graues Leinen und tippt auf „Hinlegen für Lena“.
4. In der WhatsApp-Vorschau sieht Lena den Leineneinband mit Titel, ohne Foto.
5. Auf ihrem Handy ist der Tisch leer. Ein Buch gleitet herein, daneben ein Zettel: „Für Lena, von Michel“.
6. Sie blättert, tippt bei einem Bild auf „Rezept“, und der Rezeptzettel gleitet unter der Seite hervor.
7. Sie tippt auf „An der Kamera einstellen“ und hakt Wert für Wert ab. Am Ende kommt „Auf C3 gespeichert?“.
8. Sie knickt bei ihrem Lieblingsbild ein Eselsohr und hinterlässt einen Zettel. Beides sieht nur Michel.

## 3. Editor in drei Schritten

1. **Reinziehen:** Fotos werden lokal gelesen (Aufnahmezeit, Kamera, Rezept) und nacheinander in drei Größen neu kodiert (360/1280/2560 px). Nur diese Größen werden hochgeladen.
2. **Auto-Sequenz:** `autoSequence(photos)` gibt `Spec[]` aus und wendet Michels Rhythmus-Regeln an. Kein T1|T1 zweimal hintereinander, spätestens nach drei Doppelseiten eine papierreiche Seite, genau eine T6. Die Ausgabe füttert die bestehende `build()`.
3. **Ändern:** Doppelseiten tauschen (Ziehen oder Pfeiltasten), „anderes Layout“ per Klick, Fokuspunkt setzen, Titel und eines von sechs Leinen wählen. Ein Regel-Prüfer weist leise auf Verstöße hin. „Ansehen“ öffnet das Buch sofort in 3D. Der Entwurf wird laufend in IndexedDB gespeichert.

## 4. Teilen

- **Rollen:** Michel ist Gastgeber. Macher melden sich per Google oder E-Mail-Link an, aber nur mit Einladung. Gäste brauchen kein Konto.
- **Widmungslinks:** Jeder Empfänger bekommt einen eigenen Link `/b/<buch>/<token>`. Er lässt sich einzeln zurückziehen, ein Ablaufdatum ist optional. Michel sieht nur einmal „geöffnet von Lena“, keine Lesezeit und keine Statistik.
- **Gast ohne Konto:** Der Gast kann blättern, Rezepte als Einstellliste oder `.xmp` mitnehmen, ein Eselsohr setzen (Antippen der oberen Außenecke) und einen Zettel mit höchstens 280 Zeichen schreiben. Technisch läuft das über eine unsichtbare Anonymous-Auth-Sitzung, die an den Token gebunden ist.
- **Gemeinsamer Tisch:** Für angemeldete Macher gibt es einen Tisch mit einem Stapel pro Person. Neue Bücher tragen ein Lesebändchen in `signal`. Entwürfe liegen umgedreht. Die Schublade am Tisch ist die Rezeptkiste: alle Rezepte im Kreis, mit Herkunft („von Lena, aus *Lissabon*“).

## 5. Rezepte

| Quelle | Automatisch | Nicht möglich |
|---|---|---|
| Fuji-JPG aus der Kamera (MakerNotes) | Filmsimulation, DR, WB plus Shift, Highlight, Shadow, Farbe, Schärfe, NR, Körnung, Color Chrome, Clarity | Kein Lightroom-Preset (keine ehrliche Umrechnung), kein Export in die Kamera |
| Lightroom-Classic-JPG | crs:-Werte, wenn beim Export „Alle Metadaten“ gewählt ist und die Katalogeinstellung „Entwicklungseinstellungen … einschließen“ an ist ([Adobe](https://helpx.adobe.com/in/lightroom-classic/help/exporting-photos-basic-workflow.html), [Lightroom Killer Tips](https://lightroomkillertips.com/controlling-metadata-export/)) | Standard-Export „Alle außer Camera-Raw-Infos“ |
| Lightroom mobile | Schalter „Kamera- und Camera-Raw-Infos“ ([Adobe](https://helpx.adobe.com/lightroom-cc/using/save-and-export-photos-android.html)) | Ob dabei der volle crs:-Satz geschrieben wird, ist **unbelegt**, Test nötig |
| iPhone-DNG (ProRAW) | XMP liegt in der DNG selbst, wenn Lightroom die Metadaten gespeichert hat ([Lightroom Queen](https://www.lightroomqueen.com/community/threads/writing-develop-settings-to-file.123/)) | Ein frisches DNG aus der Kamera-App enthält kein Rezept |
| Messenger, Instagram, AirDrop aus Fotos | – | Alle Metadaten sind weg, es bleibt nur der Kamerazettel |

- **Lesen:** exifr liest XMP und EXIF. Die Fuji-MakerNote liest ein eigener Leser (ca. 150 Zeilen), unbekannte Werte erscheinen als „unbekannt“. DNG und `.xmp` werden nur gelesen und über Dateiname und Aufnahmezeit dem JPG zugeordnet, die DNG wird nie hochgeladen. Gespeichert wird nur eine Whitelist von Feldern als `recipes/{id}`.
- **Preset (.xmp):** Es entsteht aus den globalen Werten: Grundeinstellungen, Tonkurve, HSL, Color Grading, Körnung, Vignette, Kalibrierung, Profil. Weggelassen werden Zuschnitt, Masken, Retusche, Objektivkorrektur und der absolute Weißabgleich. Dass Presets sich so aus JPGs erzeugen lassen, zeigt [PixelPeeper](https://pixelpeeper.com/resources/what-is-an-xmp-file). Der Zettel nennt ehrlich, worauf das Preset am besten passt, z. B. „iPhone-ProRAW“. Ob der Import in Lightroom mobile klappt, ist **noch offen**.
- **Ohne Rezept:** Der Kamerazettel zeigt Gerät, Brennweite, Blende, Zeit und ISO. Ein von Hand nachgetragenes Rezept wird als „Angabe des Nutzers“ gekennzeichnet.
- **Animation:** Der Zettel gleitet unter der Seite hervor (`translateY` plus `clip-path`, 500 ms ease-out-expo) und kommt 1–2° schräg zur Ruhe. Die Filmsimulation wird wie ein Stempel aufgedruckt, die Zahlen rollen wie ein Zählwerk ein (40 ms versetzt). Lightroom-Werte zeigen eine Mini-Tonkurve, die sich zeichnet, und acht HSL-Balken. Bei reduzierter Bewegung steht alles sofort da. Zum Teilen nach außen gibt es eine Rezeptkarte als Story-PNG mit Link.

## 6. Technik und Kosten

- Der statische Next-Export bleibt. Neue Client-Seiten sind `/neu` und `/b/…`. Eine Cloud Function liefert nur die OG-Hülle aus (Einband ohne Foto, das Foto nur per Schalter). App Hosting fällt damit weg.
- Firestore: `books`, `books/{id}/links/{token}`, `recipes`, `reactions`, `circle/members`. `photos[key].by` ist schon für das spätere Gemeinschaftsbuch vorgesehen.
- Bilder liegen in Cloud Storage, Region EU. Es gibt Storage-Regeln, eine Obergrenze von 60 Bildern pro Buch und App Check.
- `Photo.src` wird von `StaticImageData` auf `{base, w, h}` umgestellt. `page-curl`, `layout.ts` und `build()` bleiben.
- Auf dem iPhone: Bilder per `createImageBitmap` verkleinert dekodieren, jedes einzeln und danach mit `close()` freigeben. Höchstens drei Doppelseiten-Texturen gleichzeitig, auf schwachen Geräten wird flach geblättert.
- **Kosten (Schätzung):** Ein Blaze-Konto mit Kreditkarte ist Pflicht ([Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)). In der EU kostet das ≈1–2 € im Monat für 3–4 GB, mit Budget-Alarm bei 5 €.

## 7. Bauschritte (Schätzungen, Abendarbeit)

1. **Rezeptzettel in Michels Büchern (1–2 Wochen):** Fuji-Leser, Rezept- und Kamerazettel mit Animation, Einstell-Ansicht, Rezeptverzeichnis. Dazu der Testexport aus Classic, mobile und ProRAW, geprüft mit exiftool. *Benutzbar:* Michels Bücher zeigen Rezepte.
2. **Widmungslinks und Reaktionen (1 Woche):** Token-Links, Anonymous Auth, Eselsohr, Zettel, OG-Function. *Benutzbar:* Michel schickt drei Freunden ein Buch.
3. **Lightroom-Rezepte und Preset (1 Woche):** crs:-Leser, `.xmp`-Erzeugung, Import von Hand geprüft. *Benutzbar:* Preset-Download in Michels Büchern.
4. **Editor (3–4 Wochen):** URL-Bilder, Reinziehen, Neukodieren, `autoSequence`, Doppelseiten-Leiste, IndexedDB. *Benutzbar:* Michel baut neue Bücher selbst.
5. **Kreis (1–2 Wochen):** Einladungen, Macher-Login, gemeinsamer Tisch mit Rezept-Schublade, Story-PNG, Löschknopf, Datenschutzseite und Impressum. *Benutzbar:* Freunde bauen eigene Bücher.

Gesamt sind das geschätzt 7–10 Wochen.

**Entschieden:** Der Editor folgt direkt nach Schritt 3, und nach Schritt 2 gibt es nur eine kurze Prüfung statt eines harten Abbruchs. *Alternative:* Erst bauen, wenn Freunde nach Schritt 2 sichtbar reagiert haben. **Entschieden:** Das Eselsohr setzt man durch Antippen der Ecke. *Alternative:* Doppeltipp, der aber mit dem Zoom in iOS kollidiert. **Entschieden:** Die Rezeptkiste ist die Schublade am Tisch. *Alternative:* eine eigene Seite `/kiste`.

**Später, nur wenn gefragt:** Das Gemeinschaftsbuch einer Reise mit Lichtkasten, Stern-Favoriten, Uhrenabgleich der Kameras über ein gemeinsames Foto, Einwilligung und Namensnennung. Danach Druck: Aus der Layout-Funktion ließe sich ein PDF mit 300 dpi und 3 mm Beschnitt für einen Fotobuch-Dienst erzeugen. Dafür bräuchte es Originale in voller Auflösung.

## 8. Bewusst weggelassen

Öffentliche Profile, Feed, Likes und Zähler, Kommentar-Threads, Direktnachrichten, Suche, Push-Benachrichtigungen, App-Store-App, gleichzeitiges Bearbeiten, freies Platzieren, öffentliche Rezeptseiten und SEO, Analytics, Verkauf, Download der Originale, ein Werkzeugname mit „Fuji“.

## 9. Fragen an Michel

1. Exportierst du aus Lightroom Classic oder mobile, und darf ich mit einer Datei von dir testen, ob die crs:-Werte drinstehen?
2. Bearbeitest du die Japan-DNGs in Lightroom oder in Apple Fotos?
3. Reichen Google und E-Mail-Link als Login für deine Freunde?
4. Ist Kreditkarte plus 1–2 € im Monat (Schätzung) für dich in Ordnung, oder lieber US-Region für 0 €, dann aber außerhalb der EU?
5. Welche drei Freunde testen zuerst, und fotografiert einer davon auch mit Fuji?