# Rezeptbücher: Ergebnis von Nora und Jonas

## 1. Urteil

Als Werkzeug lohnt sich das, als offene Social-Media-Plattform nicht. Eine Einzelperson kommt gegen Instagram, VSCO und Glass nicht an. Feed, Kommentare und Moderation sind ein Dauerbetrieb, den Michel neben der Freelance-Arbeit nicht stemmen kann. Die Bedingung: Michel baut erst das Rezept-Feature auf seiner eigenen Seite (Stufe 0). Nur wenn das nachweislich begeistert, kommt der Buchmacher für eingeladene Fuji-Fotografen.

## 2. Was es ist und was es anders macht

**„Dein Foto-Buch, und jedes Bild verrät sein Rezept.“**

- **Buch statt Feed:** Eine Reise oder Serie wird als gestaltetes Buch mit Satzspiegel gezeigt und nicht in Kacheln versenkt.
- **Das Rezept kommt aus der Datei:** Es wird aus den MakerNotes der Original-JPG gelesen. Niemand tippt etwas ab, und es gibt keine Tippfehler. Fuji X Weekly, PixelPeeper und Filos zeigen zwar schon Rezepte mit Beispielbildern, aber keiner verbindet das mit der Buchform.
- **Teilbare Rezeptkarte:** Ein Bild im Story-Format (Foto plus Rezept) ersetzt den abgetippten Rezepttext, den Fotografen heute posten, und trägt den Link nach draußen.

## 3. Das Rezept-Feature

**Aussehen und Bewegung (der „Rezeptzettel“):**
- **Auslöser:** An der Bildunterschrift steht ein Textknopf „Rezept“ (Unterstrich bei Hover, Taste `R`). Alle Werte stehen schon im Server-HTML, die Animation versteckt nichts.
- **Einblenden:** Ein Zettel aus dünnerem, leicht vergilbtem Papier gleitet unter der Seite hervor: `translateY` plus `clip-path` an der Seitenkante, 500 ms `ease-out-expo`. Er kommt mit 1–2° Schräglage zur Ruhe. Mobil kommt er von unten als halbhohes Blatt.
- **Filmsimulation:** Sie steht als gestempeltes Etikett da, der Name wird per `clip-path`-Wischen aufgedruckt. Es gibt keine Filmschachtel-Optik und kein Logo.
- **Zahlenwerte:** Highlight, Shadow, Farbe, Schärfe, Clarity, ISO und Belichtungskorrektur rollen wie ein Zählwerk ein (tabellarische Ziffern, je 40 ms gestaffelt).
- **Weißabgleich-Shift:** Er erscheint als kleines R/B-Kreuz, ein Punkt wandert von der Mitte zum Wert, z. B. R+3/B−4.
- **Stufen:** Körnung, Color Chrome (inkl. FX Blue) und Dynamikbereich werden als Stufenbalken gezeigt, die sich nacheinander füllen.
- **Weitere Elemente:** eine Einstellliste „Auf meiner Kamera“ in der Reihenfolge des IQ-Menüs und ein Rezeptverzeichnis nach dem Bildverzeichnis.
- **Reduzierte Bewegung und Umblättern:** Bei `prefers-reduced-motion` steht der Zettel sofort fertig da. Beim Umblättern schließt er sich zuerst.

**Woher die Daten kommen:**
- **Aus den Fuji-MakerNotes der Originale:** FilmMode, DynamicRange, WhiteBalance plus FineTune (in 20er-Schritten gespeichert, wird umgerechnet), HighlightTone, ShadowTone, Saturation, Sharpness, NoiseReduction, GrainEffect, ColorChromeEffect und FXBlue. Clarity schreiben nur neuere Modelle. ISO und Belichtungskorrektur kommen aus dem Standard-EXIF.
- **Unsicher:** Monochrom/Acros mit Farbfilter und neue Simulationen bei älteren Parsern. Deshalb braucht es eine Testmatrix pro Kameramodell.
- **Fehlt immer:** Rezeptname, Quelle und die Angabe, ob nachbearbeitet wurde. Das fragt eine Zeile beim Upload ab. Was der Nutzer selbst ergänzt, steht in Mono kursiv als „Angabe des Nutzers“.
- **Kein Rezept bei Exporten:** Bilder aus Instagram, Lightroom oder Messengern (auch Michels Chat-Uploads) haben keine MakerNotes. iPhone-Bilder wie im Japan-Buch bekommen stattdessen einen schlichten **Kamerazettel** (Gerät, Brennweite, Blende, Zeit).

## 4. MVP in Stufen

**Stufe 0: auf Fujiventura, statisch (Schätzung 1–2 Wochen)**
- Eigener Rezept-Leser auf Basis von `exifr`.
- Testmatrix mit Michels Fuji-Originalen.
- Rezeptzettel, Kamerazettel und Rezeptverzeichnis im Fuerteventura- und im Japan-Buch, dazu die Rezeptkarte als Export.
- Michel teilt das Buch öffentlich. Die Reaktionen sind der Test.

**Stufe 0,5: Nachfrage-Probe von Hand (Schätzung 3–4 Wochen nebenher)**
- 5–10 Fuji-Fotografen schicken Originale mit Einwilligung per Mail. GPS wird sofort entfernt.
- Michel baut ihnen das Buch und die Rezeptkarte.
- Gemessen wird: Teilen sie es, wollen sie ein zweites, schreiben ihre Kameras alle Felder?
- *Entscheidung:* Wir machen diese Stufe, weil sie Konten, Speicher und Rechtstexte erspart. *Alternative (Jonas):* direkt nach Stufe 0 in Stufe 1 einsteigen, mit den Reaktionen auf Michels Buch als einzigem Test.

**Stufe 1: Buchmacher in geschlossener Beta (Schätzung 6–8 Wochen Abendarbeit)**
- 10–20 eingeladene Nutzer, minimales Konto nur mit E-Mail per Magic Link, Löschen jederzeit.
- Upload im Browser: Rezept als JSON auslesen, Bild auf 2560 px verkleinern und ohne EXIF hochladen.
- Einfacher Sequenzer: sortieren nach Aufnahmezeit, Hoch- und Querformat erkennen, wenige Seitentypen, „anderes Layout“ per Klick, 6 feste Leinen.
- Veröffentlichung nur über einen nicht gelisteten Link mit Vorschaubild, dazu Melden-Knopf.
- *Entscheidung:* zunächst einfacher Sequenzer. *Alternative:* die volle Regel-Logik aus dem Workshop sofort, kostet aber den größten Zeitposten.
- *Entscheidung:* Jeder Link wird von Michel selbst freigeschaltet, ohne automatische Bildprüfung. *Alternative:* Cloud-Vision-SafeSearch schon in der Beta, kostet aber Geld pro Bild und schickt fremde Fotos an einen weiteren Dienst.
- **Erfolgsmaß (selbst gesetzt, keine Marktzahl):** etwa 30 fremde Bücher in 3 Monaten, ein Teil davon extern geteilt.

**Stufe 2: nur bei Nachfrage**
- Öffentliche Profile als eigener Tisch (`/@handle`).
- Rezept-Index und Rezeptseiten für SEO, „Neu auf dem Tisch“ mit 6–8 Büchern.
- Zettelkasten zum Sammeln von Inspiration.

**Nie im Plan:** Feed, Likes, Kommentare, Direktnachrichten, QR-Export in die Kamera. Ein offizieller Weg für den QR-Export ist nicht bekannt.

## 5. Technik

- **Wiederverwendbar:** `page-curl.tsx`, `page-texture.ts`, `layout.ts`, `page-view.tsx`, `book.tsx`, `plate-viewer.tsx` und `table.tsx`, dazu die Seitentypen aus `books.ts`.
- **Hauptumbau:** `StaticImageData` durch `{ url, w, h, blurhash }` ersetzen und Texturen nachladen, nur für die aktuelle und die nächsten zwei Doppelseiten.
- **Parser:** selbst schreiben auf Basis von exifr. `fuji-recipes` wird erst nach Prüfung von Herausgeber, Repo und Wartung genutzt, sonst gar nicht. Das Rezept ist der Kern, dafür keine ungewartete fremde Abhängigkeit.
- **Ein Renderer für zwei Ausgaben:** Rezeptkarte (Story-Format) und OG-Vorschaubild.
- **Hosting:** Stufe 0 bleibt statischer Export auf Firebase Hosting. Ab Stufe 1 braucht es serverseitiges Rendern für die Link-Vorschau, also Firebase App Hosting oder Vercel.
- **Daten:** Firebase Auth und Firestore (`users`, `books`, `plates`, später `saves`), EU-Region.
- **Bilder:** Cloudflare R2 mit CDN von Anfang an. Eine Funktion mit `sharp` erzeugt Stufen in 360/1280/2560 px als AVIF und WebP.
- **Schwache Geräte:** Blättern ohne 3D-Krümmung.

## 6. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
| --- | --- |
| **Marke:** „FUJI“ und „FUJIFILM“ sind geschützt. Ein Produkt namens „Fuji…“ mit fremden Nutzern kann abgemahnt werden. | Neutraler Plattformname, Fujiventura bleibt Michels eigenes Buch. „Fujifilm“ nur beschreibend nennen, kein Logo, Hinweis „nicht mit Fujifilm verbunden“. Vor Stufe 1 DPMA/EUIPO-Recherche oder kurze Prüfung durch einen Markenrechtler. (Keine Rechtsberatung.) |
| **Datenschutz:** GPS, Seriennummer, Wohnorte in den Originalen. | Nur die Rezeptfelder lesen und speichern, Bilder ohne Metadaten ablegen. Dazu Impressum, Datenschutzerklärung, AV-Vertrag mit dem Hoster, keine Tracker, Löschfunktion. |
| **Moderation und DSA:** Spam, fremde oder illegale Inhalte. | Zugang nur auf Einladung, nicht gelistete Links, Melden-Knopf mit Reaktionsweg. Etwas öffentlich schalten erst mit fertigen Nutzungsbedingungen und Moderationsplan. |
| **Urheberrecht:** Nutzer laden fremde Fotos hoch. | Nutzungsbedingungen (Nutzer versichert Rechte, Lizenz nur zur Anzeige), schnelle Entfernung auf Meldung. Rezepte nicht automatisch mit Fuji X Weekly abgleichen, der Name kommt nur vom Nutzer. Quellen nennen und verlinken. |
| **Kosten:** Ausgehender Traffic, wenn ein Buch viral geht, Missbrauch als Gratis-Bildhoster. | R2 plus CDN, Obergrenze von 40 Bildern pro Buch, Kontingente, Budget-Alarm, Hotlinking-Schutz. Bei einigen hundert Büchern geschätzt ein- bis niedrig zweistellige Euro pro Monat. |
| **Rezept fehlt oder stimmt nicht:** bearbeitete Exporte. | Klarer Hinweis „Original von der Kamera“, Häkchen „nachbearbeitet“, Kamerazettel als Ersatz. |
| **Leerer Tisch und Zeitfresser:** Kaltstart, Konkurrenz mit dem Freelance-Geschäft. | Das Werkzeug muss allein schon Wert haben. Nach jeder Stufe eine feste Entscheidung: weiter oder als Portfolio-Feature einfrieren. |

## 7. Offene Entscheidungen für Michel

1. Willst du überhaupt Dauerbetrieb und Rechtspflichten (DSA, DSGVO, Moderation) übernehmen? Oder reicht dir Stufe 0 als Portfolio- und Referenzprojekt?
2. Hast du die Fuerteventura-Originale direkt von der Kamera mit vollständigen MakerNotes noch? Ohne sie gibt es keine Stufe 0.
3. Welchen neutralen Produktnamen ohne „Fuji“ würdest du nehmen, und bist du bereit, vor Stufe 1 eine Markenprüfung zu bezahlen?
4. Kennst du 5–10 Fuji-Fotografen für die Probe von Hand, oder sollen wir sie über Reddit und Fotowalks suchen?
5. Später Geld verdienen (Pro-Modell, gedrucktes Buch über einen Druckdienstleister) oder bewusst kostenlos und klein bleiben?