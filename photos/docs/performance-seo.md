# Fujiventura: Performance und SEO

Stand: 7. Oktober 2026. Gemessen auf Branch `claude/fujiventura-performance`, Code unverändert.
Dieser Bericht ändert keinen Anwendungscode. Alle Änderungen stehen unten als Diff-Vorschlag.

## Auf einen Blick

1. **Live sind gerade alle Fotos kaputt.** Die Startseite fragt 28 Fotos an, alle 28 liefern 404 (Abschnitt 1.1). Das hat Vorrang vor allem anderen.
2. **Startseite:** LCP 2,3–3,2 s im Testaufbau (Playwright, gedrosselt), Lighthouse simuliert 7,9 s. Bremsen: 26 Intro-Abzüge (361 kB), die bei *jedem* Besuch laden, und 235 kB PNG-Texturen mit nur 1 h Cache.
3. **Gastlink `/b`:** LCP 6,0–6,4 s lokal, 6,6–7,6 s live. Die Gastansicht wartet auf das volle Firebase-Paket (197 kB gz) und eine Firestore-Verbindung über WebChannel.
4. **Blättern auf dem Handy:** Die WebGL-Biegung kostet im Hauptthread etwa 15× so viel wie das flache Blättern. Texturen werden mitten im Blättern vorbereitet.
5. **iPhone-Risiko:** Das Einlesen von Kamera-Originalen (40 MP) erreicht bei uns 782 MB Prozessspeicher und friert die Seite bis zu 1,6 s ein. In Safari ist das ein Absturzkandidat.

## Messaufbau

| | |
| --- | --- |
| Builds | `STATIC_EXPORT=1 next build` (echt) und mit `NEXT_PUBLIC_FUJI_MOCK=1` (Testmodus), danach `scripts/shrink-export.mjs` wie bei `npm run export` |
| Server | kleiner Python-Server: saubere URLs (`/neu` → `neu.html`), gzip für Text, `immutable` für `/_next/static` wie in `firebase.json`. Echt auf Port 4300, Testmodus auf 4301 |
| Handy | Chromium per CDP: 375 × 812, DPR 3, Touch, CPU 4× langsamer, 150 ms Latenz, 1,6 Mbit/s runter, 750 kbit/s hoch (wie die Ausgangsmessung) |
| Lighthouse | Lighthouse 12, mobil, simulierte Drosselung, Chromium aus `/opt/pw-browsers` |
| Fotos | 30 Testfotos (16 aus `public/photos`, 14 aus `public/photos/japan`, je etwa 5 MP) und 10 künstlich vergrößerte 40-MP-Fotos (7728 × 5152 Pixel, wie eine Fuji X-T5) |
| Skripte | `docs/perf-skripte/` (zum Wiederholen) |

**Grenzen der Messung**

- Nur Chromium, kein Safari. Was Safari betrifft, ist mit **in Safari prüfen** markiert.
- Der Testbrowser rechnet Grafik ohne GPU (SwiftShader). Absolute Bildraten beim WebGL-Blättern sind deshalb zu niedrig. Belastbar sind die Anteile im Hauptthread: Skript, Dekodieren, Textur-Upload.
- TBT ist aus Long Tasks nach dem FCP berechnet, nicht aus Lighthouse. Werte schwanken zwischen Läufen um etwa ±0,4 s, deshalb stehen dort Spannen.

---

## 1. Laden je Route

### 1.1 Dringend: Live fehlen alle verkleinerten Fotos

Der Loader `src/image-loader.ts` verlangt Dateien wie `08-drachenbaum.2wqjfpvjxj_30.w960.jpg`. Live gibt es nur das Original:

```
/_next/static/media/08-drachenbaum.2wqjfpvjxj_30.jpg        200  1 430 551 Bytes
/_next/static/media/08-drachenbaum.2wqjfpvjxj_30.w960.jpg   404
```

Gemessen auf https://fujiventura.web.app: 28 von 28 Fotoanfragen der Startseite liefern 404 (26 Intro-Abzüge und 2 Einbände). Im Buch fehlen damit alle Tafeln. Die Chunks sind identisch mit dem lokalen Build. Vermutlich lief also `next build` ohne `node scripts/shrink-export.mjs` (`npm run export` macht beides).

**Folgeschaden:** `firebase.json` setzt `Cache-Control: public, max-age=31536000, immutable` auf alles unter `/_next/static/**`, **auch auf die 404-Antworten**. Wer die Seite seit dem Deploy (07.10., 12:46) geöffnet hat, kann die Fehlantwort ein Jahr im Browser-Cache behalten. Ein korrekter Deploy unter denselben Dateinamen hilft diesen Besuchern nicht. Deshalb braucht es beim Reparieren einen neuen Dateinamen (Maßnahme M1).

### 1.2 Messwerte (Handy, gedrosselt)

Playwright, frischer Browser, je zwei Läufe (Intro zeigen / Intro schon gesehen):

| Route | FCP | LCP | TBT | CLS | JS (gz) | Übertragen | LCP-Element |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 0,9–1,1 s | **2,3–3,2 s** | 110–370 ms | 0,003 | 229 kB | 1 176 kB | Einband „Fuerteventura“ (Leinen-PNG als Hintergrund) |
| `/b?t=gibtesnicht` (echtes Firestore) | 0,8 s | **6,0–6,4 s** | ~400 ms | 0 | 435 kB | 773 kB | Text „Dieses Buch liegt hier nicht mehr“ |
| `/b?t=…` mit echtem Buch, Testmodus ohne Firestore | 0,8 s | **5,6 s** | 400–520 ms | 0,002 | 431 kB | 1 105 kB | Einband |
| `/tisch` | 1,1 s | **5,4–5,5 s** | 365–545 ms | 0 | 437 kB | 774 kB | Text nach der Anmeldeprüfung |
| `/neu` | 1,1 s | **5,7–6,0 s** | 400–600 ms | 0 | 486 kB | 825 kB | Text nach der Anmeldeprüfung |
| `/qfd` | 1,3 s | 1,3 s | 545–650 ms | **0,06** | 371 kB | 822 kB | Einleitungstext |
| `/kritik` | 1,0 s | 1,0 s | 170–280 ms | **0,07** | 134 kB | 466 kB | Einleitungstext |

Live, gleiche Drosselung: `/` LCP 3,7 s (nur so schnell, weil die Fotos 404 liefern), `/b?t=gibtesnicht` LCP 6,6–7,6 s.

Lighthouse (mobil, simuliert):

| Route | Performance | Barrierefreiheit | Best Practices | SEO | LCP | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | **61** | 100 | 100 | 100 | 7,9 s | 570 ms |
| `/b` | **67** | 100 | 100 | 60* | 8,1 s | 380 ms |
| `/neu` | **69** | 100 | 96 | 60* | 6,7 s | 340 ms |
| `/qfd` | 79 | 97 | 96 | 100 | 4,2 s | 320 ms |
| `/kritik` | 89 | 100 | 96 | 100 | 3,5 s | 150 ms |

\* SEO 60 kommt vom gewollten `noindex`, das ist kein Fehler.

Zum Vergleich: In `messungen.json` stehen 6,70 s (Startseite) und 4,99 s (Gastlink). Die Startseite misst heute schneller, weil live die Fotos fehlen. Mit funktionierenden Fotos liegt sie lokal bei 2,3–3,2 s. Lighthouse rechnet mit 7,9 s strenger. Das Ziel ≤ 2,5 s erreicht die Startseite also nur im günstigen Fall. Der Gastlink verfehlt es deutlich.

### 1.3 Was zu früh oder zu viel lädt

**Startseite `/`, 1 176 kB:**

- **26 Intro-Abzüge, 361 kB, bei jedem Besuch.** `intro.tsx` rendert die Abzüge im Server-HTML mit `loading="eager"`. CSS blendet sie aus (`.intro-cover { display: none }`), wenn das Intro nicht läuft. Bilder in `display: none` lädt der Browser trotzdem. Gemessen: Erstbesuch und Folgebesuch laden beide 32 Bilder mit 754 kB. Auf 1,6 Mbit/s sind 361 kB etwa 1,8 s Leitung, die mit dem Einband konkurrieren.
- **Texturen 235 kB PNG.** `linen-weft`, `linen-warp`, `stone-grain`, `stone-cloud` (dazu `paper.png` 62 kB im Buch). Sie stecken im LCP-Element (Leinen auf dem Einband). Sie haben keinen Hash im Namen und deshalb nur `max-age=3600`. Als WebP wären sie etwa 45 % kleiner (gemessen mit sharp, q80: 235 kB → 133 kB).
- **Schrift 128 kB vorgeladen.** Bricolage Grotesque als variable Schrift mit den Achsen `wdth` und `opsz` (`74effe…woff2`, 131 kB). Das ist die größte einzelne Datei vor dem ersten Bild.
- **JS 229 kB gz.** Darin sind das Buch und das WebGL-Blättern (`book.tsx`, `page-curl.tsx`, Chunk mit 46 kB gz) und Motion (47 kB gz), obwohl zuerst nur der Tisch zu sehen ist. Lighthouse meldet 91 kB ungenutztes JS.
- Die Ladeleiste von Lighthouse zeigt beim LCP 80 % „Render Delay“. Der Einband ist früh im HTML, wartet aber auf Texturen und das Ende des Intros.

**Gastlink `/b`:**

- Firebase komplett (Firestore mit `persistentLocalCache`, Auth, Storage) in einem Chunk mit 197 kB gz (684 kB roh). Er ist erst nach 4,0 s geladen.
- Wasserfall gedrosselt: JS fertig bei 4,0 s → Firestore baut eine WebChannel-Verbindung auf (`Listen/channel`, drei Anfragen) → Antwort ab 5,2 s → Buch rendern → Einbandfoto laden.
- `useUser()` startet Firebase Auth sofort. Das lädt `apis.google.com` und ein iframe von `fujiventura.firebaseapp.com`. Ein Gast braucht beides nur, wenn er „Auf meinen Tisch legen“ tippt.
- Fotos aus Storage gehen am Loader vorbei (`/^https?:/` → Original-URL). Das Handy lädt immer die 1280er-Fassung („page“, etwa 200 kB pro Foto). Das passt bei DPR 3 noch, ein `srcset` gibt es aber nicht.

**`/tisch`, `/neu`:** Bis Firebase Auth geantwortet hat (`user === undefined`), zeigt die Seite nur eine leere Fläche (`my-table.tsx:59`, `editor.tsx:409`). Der erste Text erscheint deshalb erst nach 5,4–6,0 s.

**`/qfd`, `/kritik`:** CLS 0,06 und 0,07 (Grenze für „gut“: 0,1). Die Ursache ist nachgeladener Inhalt oder ein Schriftwechsel oberhalb des Einleitungstexts. Das ist niedrige Priorität.

### 1.4 Caching (`firebase.json`)

| Pfad | heute | Vorschlag |
| --- | --- | --- |
| `/_next/static/**` | 1 Jahr, `immutable`, auch für 404 | bleibt so, aber Deploy absichern (M1) |
| `/textures/*.png` | 1 h (Standard) | 30 Tage, besser mit Hash im Namen |
| `/presets/**` | 1 h | 1 Tag |
| HTML | 1 h | `no-cache` (immer prüfen, ETag spart die Übertragung), damit ein neuer Deploy sofort gilt |
| Storage-Fotos | `public, max-age=31536000` beim Hochladen gesetzt | gut |

### 1.5 Bildformate und srcset

- Feste Breiten 480/960/1440/1800 als progressive mozjpeg, Qualität 78–80. Das ist solide.
- Thumbnails (360 px) werden ebenfalls in vier „Breiten“ abgelegt, die alle 360 px groß sind (`withoutEnlargement`). Das ist harmlos, verwirrt aber beim Lesen von Netzprotokollen.
- AVIF oder WebP für Fotos würde 25–40 % sparen (Schätzung). Das erfordert mehr Varianten in `shrink-export.mjs` und eine Formatwahl ohne Bildserver (`<picture>`). Aufwand M, Wirkung mittel. Steht deshalb hinten an.
- Buchseiten auf dem Handy: `sizes` ergibt bei DPR 3 die 1440er-Datei. Für ein 375-px-Telefon reicht optisch die 960er. Das spart Bytes und Dekodierspeicher (siehe „Handy und Safari“).

---

## 2. Laufzeit

### 2.1 Blättern im Buch

Startseite, Buch `#fuerteventura`, 8× weiterblättern (Handy: Pfeiltaste, Desktop: Scrollrad):

| Gerät | Modus | Long Tasks gesamt | längster Task | Textur-Uploads | Bildrate im Testbrowser* |
| --- | --- | --- | --- | --- | --- |
| Handy, CPU 4× | WebGL (heute) | **6,7 s** | 249–549 ms | 16 Uploads, 1,1–1,9 s, einzeln bis 510 ms | 8–10 fps |
| Handy, CPU 4× | flach (`?ohne=biegung`) | 0,4 s | 86 ms | – | 24 fps |
| Handy, CPU 1× | WebGL | 3,7 s | 156 ms | 279 ms | 16 fps |
| Handy, CPU 1× | flach | 0 | – | – | 24 fps |
| Desktop 1440, CPU 1× | WebGL | 9,1 s | 532 ms | 18 Uploads, 0,6 s | 4–5 fps |
| Desktop 1440, CPU 1× | flach | 0 | – | – | 10 fps |

\* Rechnet ohne GPU, absolute fps sind zu niedrig. Aussagekräftig ist der Abstand zwischen WebGL und flach.

**Aufschlüsselung des Hauptthreads (Trace, Handy, CPU 4×, 6 Blätter):**

| Posten | Zeit |
| --- | --- |
| `GLES2::ReadPixels` und Warten auf die GPU | 2,5 s + 2,2 s (größtenteils ein Effekt der Software-Grafik, auf echten Geräten deutlich kleiner) |
| `texImage2D` (Canvas → Textur) | ~0,9–1,1 s |
| Fotos dekodieren im Hauptthread (`Decode Image` beim `drawImage`) | **0,5 s** |
| React und Motion | ~0,3 s |

Was davon auf echten Geräten gilt:

1. **Texturen entstehen mitten im Blättern.** `PageCurl` bekommt `k = kt`. `kt` springt bei `t ≈ x,5` (`Math.round`), also auf halbem Weg. Genau dann startet `drawPage` für die neuen Nachbarn, und `texImage2D` blockiert den Hauptthread (gemessen bis 510 ms bei CPU 4×). Die zweite Hälfte der Bewegung ruckelt dadurch.
2. **Synchrones Dekodieren.** `loadImage` wartet auf `onload`, nicht auf `decode()`. Das erste `drawImage` dekodiert die 960er- bis 1440er-Fotos deshalb im Hauptthread (0,5 s in 6 Blättern).
3. **Bildcache ohne Grenze.** Die Map `images` in `page-texture.ts` hält jedes je geladene `HTMLImageElement` fest. Wer das ganze Buch durchblättert, behält bis zu 40 dekodierte Fotos (bis ~200 MB, Schätzung). **In Safari prüfen:** WebKit gibt dekodierte Bilddaten lebender Image-Objekte nicht immer frei.
4. **WebGL-Canvas:** 1404 × 1792 Pixel bei DPR 2 mit `antialias: true`. Mit Multisampling sind das rund 40 MB Grafikspeicher (Schätzung), dauerhaft, auch wenn gerade niemand blättert. Nach `webglcontextlost` gibt es kein `webglcontextrestored`: Verliert iOS den Kontext (App im Hintergrund), blättert das Buch bis zum Neuladen flach. Das ist nicht schlimm, aber unbemerkt.

### 2.2 Editor: Übersicht mit 30 Fotos

| Messung (Handy, CPU 4×, Testmodus ohne Hochladen) | Wert |
| --- | --- |
| Reinziehen bis Erstentwurf, 30 Fotos à 5 MP | **24,9–29,0 s** |
| davon `drawImage` im Hauptthread (Neukodieren) | 9,7–10,0 s, einzeln bis 284 ms |
| Bildrate beim Einlesen | p95 67–117 ms pro Frame, 48–77 Ruckler > 50 ms |
| Prozessspeicher, Spitze beim Einlesen | 465–479 MB |
| Übersicht durchscrollen (16 Doppelseiten) | 60 fps, keine Long Tasks |
| Dekodierte Bilder in der Übersicht | **141 MB** für 31 Bilder |
| Bildgröße in der Übersicht | Quelle im Schnitt 941 px breit, gezeigt 373 Gerätepixel |

Die Übersicht scrollt flüssig, hält aber 2,5× zu große Bilder pro Achse (≈ 6× zu viele Pixel). Grund: `PageView` nutzt `p.src` (1280er „page“), und der Loader reicht Storage- und Blob-URLs unverändert durch. Mit `p.thumb` (360 px) sinkt das auf etwa 11–25 MB (Schätzung).

**Einlesen von Kamera-Originalen (10 Fotos à 40 MP):**

| | |
| --- | --- |
| Erstentwurf | 17,0 s |
| `drawImage` im Hauptthread | 10,8 s, ein einzelner Aufruf **1,56 s** |
| längster Frame | **2,2 s** (Seite steht) |
| Prozessspeicher, Spitze | **782 MB** (danach 474 MB) |

Ursache: zwei Fotos gleichzeitig (`work(), work()`). Je Foto liegen das voll dekodierte Original (40 MP × 4 Byte = 160 MB), der 2560er-Canvas (17 MB) und die kleineren Canvas gleichzeitig im Speicher. Die Canvas werden nicht aktiv freigegeben, sondern warten auf die Garbage Collection.

### 2.3 Bühne: Ziehen, Zuschneiden, Tippen (Handy, CPU 4×)

| Aktion | Bildrate | Long Tasks | Reaktionszeit Eingabe |
| --- | --- | --- | --- |
| Foto ziehen (60 Bewegungen) | 60 fps, längster Frame 33 ms | 0 | 72 ms (Druck und Loslassen) |
| Zuschneiden, Bild verschieben | 60 fps | 0 | 16 ms |
| Tippen, 39 Zeichen | 49 fps, 3 Ruckler | 4, längster 57 ms | p75 56 ms, max 88 ms |

Die Bühne ist gut gebaut: `MemoPage` verhindert, dass die Seite beim Ziehen neu gerendert wird, und der Zeiger wird per `requestAnimationFrame` gebündelt. Beim Tippen geht jeder Tastendruck durch `commit` → `update` → das ganze Buch (Rückgängig-Stapel, `data` per `useMemo`). Das liegt bei CPU 4× noch unter 100 ms, also im grünen Bereich (INP ≤ 200 ms). Bei 150 Fotos wird es enger. Gespeichert wird zum Glück nur alle 900 ms.

Beim Zuschneiden ruft jede Zeigerbewegung `setSt` ohne rAF-Bündelung auf und verändert `left/top/width/height` (Layout). Bei uns ist das unauffällig. **In Safari prüfen**, auf älteren iPhones mit 120-Hz-Zeigerereignissen.

### 2.4 Speicher auf iPhone-Niveau

Prozessspeicher in Chromium (Renderer + GPU):

| Zustand | Renderer | GPU |
| --- | --- | --- |
| Startseite im Leerlauf | 223 MB | 97 MB |
| Buch offen, WebGL, Handy | 430–450 MB | 280–290 MB |
| Buch offen, flach | 325 MB | 126–129 MB |
| Editor nach 30 Fotos | 350–400 MB | 80 MB |
| Bühne offen | 501 MB | 134 MB |
| Einlesen 10 × 40 MP, Spitze | **782 MB** | 80 MB |

Zur Einordnung (Erfahrungswerte, keine Messung hier): Safari auf dem iPhone beendet einen Tab je nach Gerät ab etwa 1–1,5 GB (ältere Geräte mit 3–4 GB RAM früher). Zusätzlich gilt eine Grenze für Canvas-Speicher; die Konsolenmeldung lautet „Total canvas memory use exceeds the maximum limit“.

**Risiko, absteigend:**

1. **Hoch:** Einlesen vieler Kamera-Originale oder iPhone-48-MP-Fotos, zwei parallel → Tab-Absturz oder Fehler „Kodieren fehlgeschlagen“ (`toBlob` liefert `null`, wenn die Canvas-Grenze erreicht ist). **In Safari prüfen** mit 20 HEIC-Fotos in 48 MP.
2. **Mittel:** Editor-Übersicht mit 100+ Fotos in 1280er-Fassung (≈ 4,4 MB dekodiert je Bild → 450 MB+).
3. **Mittel:** Ganzes Buch durchblättern mit WebGL (Bildcache ohne Grenze, MSAA-Canvas).
4. **Niedrig:** Tisch und Intro.

### 2.5 Safari-Besonderheiten (alle „in Safari prüfen“)

- `createImageBitmap(blob, { imageOrientation: "from-image" })` in `ingest.ts`: Falls Safari das ablehnt, greift der Rückfall mit `HTMLImageElement` + `decode()`. Dann dekodiert das volle Original im Speicher.
- Der Canvas-Speicher ist gedeckelt (siehe oben). Danach liefert `toBlob` `null` und `getContext` liefert `null`. `ingest.ts` behandelt das nur als „Kodieren fehlgeschlagen“.
- `texImage2D` aus einem 2D-Canvas ist in WebKit ein bekannter langsamer Weg (Kopie aus dem GPU-Canvas). `ImageBitmap` als Quelle ist meist schneller.
- `requestIdleCallback` fehlt in Safari (ohne Experimentierschalter). Für die Vorschläge unten gibt es einen Rückfall mit `setTimeout`.
- View Transitions (`startViewTransition`) gibt es ab Safari 18. Ältere Versionen springen ohne Übergang (ist so vorgesehen).
- Der Palmenschatten `.sway` läuft endlos mit zwei Animationen. Er ist auf der GPU billig, hält aber den Compositor dauerhaft wach (Akku). Auf dem Tisch des Handys ließe er sich nach dem Intro einmal ausschwingen lassen.
- `persistentLocalCache` mit `persistentMultipleTabManager`: Im privaten Modus und bei Speicherdruck fällt Safari auf den Speicher-Cache zurück. Das ist abgefangen (`catch` → `getFirestore`). Ob die Nutzerin dann einen Hinweis zum Offline-Speichern braucht: prüfen.

---

## 3. SEO und Teilen

| Punkt | heute | Bewertung |
| --- | --- | --- |
| `robots.txt` | 404 | fehlt |
| `sitemap.xml` | 404 | fehlt |
| Open Graph / Twitter Card | keine `og:`-Tags auf keiner Seite | **Ein `/b`-Link in WhatsApp oder iMessage zeigt nur den Titel, kein Bild.** |
| `metadataBase`, `canonical` | fehlen | nötig für absolute OG-URLs |
| `noindex` | `/b`, `/neu`, `/tisch`: ja | gut |
| `noindex` | `/qfd`, `/kritik`, `/umfrage`: nein | Interne Werkstattseiten sind indexierbar. Michel entscheidet, ob das gewollt ist. |
| `lang` | `de` | gut |
| Startseite Beschreibung | „Sechsundzwanzig Fotografien von Fuerteventura …“ | Es sind inzwischen zwei Bücher mit Japan. Text prüfen. |

**OG-Bild für `/b`-Links:** Mit statischem Export gibt es pro Link kein eigenes Bild, weil `/b?t=…` eine einzige HTML-Datei ist und die Vorschau-Crawler kein JavaScript ausführen. Machbar sind zwei Wege:

- **S:** ein festes, schönes Bild für alle Gastlinks („Jemand hat dir ein Fotobuch hingelegt“, mit Einband und Leinen). Dazu `opengraph-image.jpg` im Ordner `src/app/b/`. Next legt es beim Export als statische Datei ab und setzt die Meta-Tags (Dateikonvention, siehe `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`).
- **L:** pro Link der echte Einband. Das braucht eine Firebase Function hinter einer Hosting-Rewrite für `/b`, die die Meta-Tags aus Firestore einsetzt. Erst sinnvoll, wenn das Teilen ein Kernweg ist.

---

## 4. Maßnahmen nach Wirkung durch Aufwand

Reihenfolge nach Wirkung geteilt durch Aufwand. „Schätzung“ heißt: nicht gemessen, sondern aus Bytes, Trace oder Erfahrung abgeleitet.

| # | Maßnahme | Erwartete Wirkung | Aufwand | Dateien |
| --- | --- | --- | --- | --- |
| M1 | Deploy absichern, Fotonamen ändern | Live wieder Fotos (heute 28/28 kaputt) | S | `firebase.json`, `scripts/check-export.mjs` (neu), `src/image-loader.ts`, `scripts/shrink-export.mjs` |
| M2 | Intro-Abzüge nur laden, wenn das Intro läuft | −361 kB je Folgebesuch, LCP `/` −0,5 bis −1,5 s auf langsamem Netz (Schätzung) | S | `src/components/intro.tsx` |
| M3 | Gastlink ohne volles Firebase: Firestore Lite, Auth erst bei Bedarf | `/b` JS −150 bis −180 kB gz, LCP 6,0 s → etwa 3–3,5 s (Schätzung) | M | `src/lib/share.ts` (neu), `src/lib/book-data.ts` (neu, `toBookData` herausgelöst), `guest-book.tsx`, `use-user.ts` |
| M4 | Texturen als WebP, 30 Tage Cache | −100 kB auf jeder Seite, schnellerer LCP auf `/` (Einband), Schätzung −0,3 bis −0,5 s | S | `public/textures/*`, `globals.css`, `page-texture.ts`, `firebase.json` |
| M5 | Blättern: Texturen erst nach dem Umblättern, Fotos vorher dekodieren, Cache begrenzen | Long Tasks beim Blättern −50 bis −70 % (Schätzung aus Trace), weniger Speicher | S–M | `page-curl.tsx`, `page-texture.ts` |
| M6 | Einlesen auf dem Handy: ein Foto statt zwei, Canvas sofort freigeben, verkleinert dekodieren | Speicherspitze bei 40 MP von +400 MB auf etwa +200 MB, Absturzrisiko deutlich kleiner (Schätzung) | S (1+2), M (3) | `editor.tsx`, `lib/ingest.ts` |
| M7 | Editor-Übersicht mit Thumbnails | dekodierte Bilder 141 MB → ~20 MB bei 30 Fotos (Schätzung) | S | `page-view.tsx`, `editor.tsx` |
| M8 | Anmeldestatus vorab raten (`/tisch`, `/neu`) | erster Text bei ~1,1 s statt 5,4–6,0 s | S | `lib/use-user.ts`, `my-table.tsx`, `editor.tsx` |
| M9 | Buch erst laden, wenn es aufgeschlagen wird | `/` JS −45 bis −60 kB gz, TBT −100 bis −200 ms (Schätzung) | S | `components/books.tsx` |
| M10 | SEO: robots, sitemap, OG-Bilder, `metadataBase` | Vorschaubild für Gastlinks, sauberer Index | S | `src/app/robots.ts`, `sitemap.ts`, `opengraph-image.jpg`, `b/opengraph-image.jpg`, `layout.tsx` |
| M11 | WebGL-Canvas schlanker: kein MSAA auf dem Handy, Kontext wiederherstellen | ~30 MB weniger Grafikspeicher (Schätzung) | S | `page-curl.tsx` |
| M12 | Schrift: `opsz`-Achse prüfen | −30 bis −50 kB vor dem ersten Bild (Schätzung, Optik prüfen) | S | `layout.tsx` |
| M13 | Fotos als AVIF/WebP | −25 bis −40 % Bildbytes (Schätzung) | M | `shrink-export.mjs`, Loader, `<picture>` |
| M14 | Einlesen im Worker (`OffscreenCanvas`) | Seite friert beim Einlesen nicht mehr ein (heute bis 1,6 s) | L | `lib/ingest.ts`, neuer Worker |

### M1 Deploy absichern (S, zuerst)

Ein Prüfschritt, der den Deploy abbricht, wenn eine referenzierte Datei fehlt. Dazu neue Dateinamen, damit gecachte 404-Antworten nicht weiterleben.

```diff
--- a/photos/firebase.json
+++ b/photos/firebase.json
@@ "hosting": {
     "public": "out",
+    "predeploy": ["npm run export", "node scripts/check-export.mjs"],
     "cleanUrls": true,
```

```js
// photos/scripts/check-export.mjs (neu)
// Bricht ab, wenn eine HTML-Seite in out/ eine Datei unter /_next/static verlangt, die nicht existiert.
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";

const out = path.join(import.meta.dirname, "..", "out");
const html = (await readdir(out, { recursive: true })).filter((f) => f.endsWith(".html"));
const missing = new Set();
for (const f of html) {
  const text = await readFile(path.join(out, f), "utf8");
  for (const [, url] of text.matchAll(/(\/_next\/static\/[^"'\s,)]+)/g))
    await access(path.join(out, url)).catch(() => missing.add(url));
}
if (missing.size) {
  console.error(`${missing.size} Dateien fehlen, z. B.:\n${[...missing].slice(0, 5).join("\n")}`);
  process.exit(1);
}
console.log(`Export vollständig (${html.length} Seiten geprüft)`);
```

Neue Endung, damit Browser mit einem gecachten 404 die Fotos neu holen:

```diff
--- a/photos/src/image-loader.ts
+++ b/photos/src/image-loader.ts
-  return src.replace(/\.jpg$/, `.w${w}.jpg`);
+  // „-s“ statt „.w“: neue Namen, weil am 07.10. die alten URLs als 404 ein Jahr lang gecacht wurden
+  return src.replace(/\.jpg$/, `-s${w}.jpg`);
--- a/photos/scripts/shrink-export.mjs
+++ b/photos/scripts/shrink-export.mjs
-const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg") && !/\.w\d+\.jpg$/.test(f));
+const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg") && !/-s\d+\.jpg$/.test(f));
@@
-      .toFile(file.replace(/\.jpg$/, `.w${w}.jpg`));
+      .toFile(file.replace(/\.jpg$/, `-s${w}.jpg`));
```

`sharp` steht nicht in `package.json`, sondern kommt nur über Next mit. Für den Deploy-Rechner besser ausdrücklich als `devDependency` eintragen (vorher prüfen wie in AGENTS.md beschrieben).

### M2 Intro-Abzüge nur laden, wenn das Intro läuft (S)

Heute stehen die 26 `<img loading="eager">` im Server-HTML und laden auch hinter `display: none`. Vorschlag: Die Abzüge erst im Browser einsetzen, wenn `html.intro` gesetzt ist. Das Wort „FUJIVENTURA“ und die Zählung bleiben im HTML.

```diff
--- a/photos/src/components/intro.tsx
+++ b/photos/src/components/intro.tsx
 export function Intro() {
   const root = useRef<HTMLDivElement>(null);
   const [count, setCount] = useState(0);
   const [gone, setGone] = useState(false);
+  // Abzüge erst einsetzen, wenn das Intro wirklich läuft: sonst lädt jeder Besuch 26 Bilder für nichts
+  const [prints, setPrints] = useState(false);

   useEffect(() => {
     const el = root.current;
     if (!el || !introActive()) {
       setGone(true);
       return;
     }
+    // erster Durchlauf: Abzüge einsetzen, die Animation startet im nächsten
+    if (!prints) {
+      setPrints(true);
+      return;
+    }
     const anims: Animation[] = [];
@@
-  }, []);
+  }, [prints]);
@@
-        {plates.map((p) => {
+        {prints && plates.map((p) => {
```

Anmerkung: Das Intro startet damit nach dem Laden von JS, nicht früher als heute (die Animation startet auch heute erst in `useEffect`). Der Sicherheits-Timeout in CSS (`intro-failsafe` nach 7 s) bleibt.

### M3 Gastlink ohne volles Firebase (M)

1. `toBookData` und seine reinen Helfer aus `store.ts` in `lib/book-data.ts` verschieben. `store.ts` importiert Firestore und Storage auf oberster Ebene, deshalb zieht jeder Import von `toBookData` das ganze SDK mit.
2. Für Gäste nur Firestore Lite (REST, ein Request, kein IndexedDB, kein WebChannel):

```ts
// photos/src/lib/share.ts (neu): nur lesen, für die Gastansicht
"use client";
import { doc, getDoc, getFirestore } from "firebase/firestore/lite";
import { app } from "@/lib/firebase-app"; // nur initializeApp + config, ohne Auth/Firestore/Storage
import type { Share } from "@/lib/book-data";

export async function loadShareLite(token: string): Promise<Share | null> {
  const s = await getDoc(doc(getFirestore(app()), "shares", token));
  if (!s.exists()) return null;
  const share = s.data() as Share;
  return share.paused || !share.book ? null : share;
}
```

3. In `guest-book.tsx` Auth und Schreiben erst bei Bedarf laden:

```diff
--- a/photos/src/components/guest-book.tsx
+++ b/photos/src/components/guest-book.tsx
-import { signIn } from "@/lib/firebase";
-import { keepInInbox, leaveNote, loadShare, toBookData, type Share } from "@/lib/store";
+import { toBookData, type Share } from "@/lib/book-data";
+import { loadShareLite } from "@/lib/share";
+// Schreiben (Zettel, Eselsohr, Anmelden) braucht das volle SDK: erst laden, wenn jemand tippt
+const store = () => import("@/lib/store");
+const fb = () => import("@/lib/firebase");
@@
-    loadShare(token)
+    loadShareLite(token)
@@
-          leaveNote(token, { kind: "ear", no, from }).catch(() => {});
+          store().then((s) => s.leaveNote(token, { kind: "ear", no, from })).catch(() => {});
```

4. `useUser()` auf `/b` erst nach dem ersten Bild starten (z. B. `useUser({ lazy: true })`, das Auth per `import()` in `requestIdleCallback`, Rückfall `setTimeout(…, 1500)`, nachlädt).
5. In `b/page.tsx` die Verbindungen vorwärmen. React 19 setzt `<link>` aus dem Body in den Kopf:

```tsx
<link rel="preconnect" href="https://firestore.googleapis.com" />
<link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="" />
```

Vorher prüfen: `firestore.rules` muss das Lesen von `shares/{token}` ohne Anmeldung erlauben (heute über das volle SDK, also gleich). Firestore Lite liefert keine Offline-Daten, für Gäste ist das richtig.

### M4 Texturen (S)

```diff
--- a/photos/firebase.json
+++ b/photos/firebase.json
       {
         "source": "/_next/static/**",
         "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
-      }
+      },
+      {
+        "source": "/textures/**",
+        "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000" }]
+      },
+      {
+        "source": "**/*.html",
+        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
+      }
```

Die PNGs einmalig mit sharp nach WebP (q80) wandeln und in `globals.css` (5 Stellen) und `page-texture.ts` (`loadImage("/textures/….webp")`) umstellen. Gemessen: 235 kB → 133 kB für die vier Tisch- und Leinentexturen, `paper` 62 → 38 kB. WebP kann jedes Safari ab Version 14. Bei einem späteren Austausch der Textur einen neuen Dateinamen wählen (`linen-weft-2.webp`), weil der Cache 30 Tage hält.

### M5 Blättern ruhiger (S–M)

```diff
--- a/photos/src/components/page-texture.ts
+++ b/photos/src/components/page-texture.ts
-const images = new Map<string, Promise<HTMLImageElement>>();
+// begrenzt: das iPhone hält dekodierte Fotos sonst für das ganze Buch im Speicher
+const images = new Map<string, Promise<HTMLImageElement>>();
+const MAX_IMAGES = 12;
 function loadImage(url: string) {
   let p = images.get(url);
-  if (!p) {
+  if (p) {
+    // zuletzt benutzt nach hinten
+    images.delete(url);
+    images.set(url, p);
+  } else {
     p = new Promise((resolve, reject) => {
       const img = new Image();
       if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
       img.decoding = "async";
-      img.onload = () => resolve(img);
+      // außerhalb des Hauptthreads dekodieren, sonst tut es das erste drawImage synchron
+      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
       img.onerror = reject;
       img.src = url;
     });
     images.set(url, p);
+    if (images.size > MAX_IMAGES) images.delete(images.keys().next().value!);
   }
   return p;
 }
```

```diff
--- a/photos/src/components/page-curl.tsx
+++ b/photos/src/components/page-curl.tsx
+// Arbeit erst, wenn der Hauptthread frei ist; Safari kennt requestIdleCallback nicht
+const idle = () =>
+  new Promise<void>((r) =>
+    "requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 800 }) : setTimeout(r, 250),
+  );
@@  // Texturen für die Blätter rund um die aufgeschlagene Seite vorbereiten, eins nach dem anderen
     (async () => {
       for (const i of want) {
         if (cancelled) return;
         if (textures.current.has(i) || pending.current.has(i)) continue;
+        // nicht mitten im Umblättern: warten, bis das Blatt liegt
+        while (!cancelled && Math.abs(t.get() - Math.round(t.get())) > 0.01) await idle();
+        await idle();
+        if (cancelled) return;
         const { W, H, dpr } = size.current;
```

Dazu `t` in die Abhängigkeiten des Effekts aufnehmen. Die Reihenfolge `want = [k, k - 1, k + 1]` sollte für Vorwärtsblättern `[k, k + 1, k - 1]` sein: Das nächste Blatt ist wichtiger als das vorige.

Erwartung (Schätzung): Die Textur-Uploads (bis 510 ms bei CPU 4×) fallen aus der Bewegung in die Ruhephase. Das synchrone Dekodieren (0,5 s je 6 Blätter) entfällt. Ruckler beim Blättern sollten dadurch spürbar weniger werden. Wird schnell hintereinander geblättert, blättert das Blatt ohne fertige Textur flach (so ist es heute schon vorgesehen).

### M6 Einlesen auf dem Handy (S + M)

```diff
--- a/photos/src/components/editor.tsx
+++ b/photos/src/components/editor.tsx
-      await Promise.all([work(), work()]);
+      // Telefon: ein Foto nach dem anderen, zwei Originale gleichzeitig sprengen den Speicher von Safari
+      const lanes = window.matchMedia("(pointer: coarse)").matches ? 1 : 2;
+      await Promise.all(Array.from({ length: lanes }, work));
```

```diff
--- a/photos/src/lib/ingest.ts
+++ b/photos/src/lib/ingest.ts
     const [bl, bp, bt, subject] = await Promise.all([toJpeg(large), toJpeg(page), toJpeg(thumb), findSubject(page)]);
+    const color = averageColor(thumb);
+    // Canvas sofort freigeben: Safari zählt sie gegen eine feste Grenze, bis der Speicher aufgeräumt ist
+    for (const c of [large, page, thumb]) c.width = c.height = 0;
     return {
@@
-      color: averageColor(thumb),
+      color,
```

Schritt 3 (M): Original gleich verkleinert dekodieren, `createImageBitmap(blob, { resizeWidth, resizeHeight, resizeQuality: "high", imageOrientation: "from-image" })`. Die Zielgröße lässt sich aus den EXIF-Maßen (`exifr`, schon geladen) berechnen. Damit liegt nie das volle 40-MP-Bild im Speicher (160 MB → 17 MB je Foto). **In Safari prüfen**, ob `resizeWidth` unterstützt wird. Wenn nicht, bleibt der heutige Weg als Rückfall.

### M7 Editor-Übersicht mit Thumbnails (S)

```diff
--- a/photos/src/components/page-view.tsx
+++ b/photos/src/components/page-view.tsx
-function Element({ book, el, eager, z }: { book: BookData; el: El; eager: boolean; z: number }) {
+function Element({ book, el, eager, z, small }: { book: BookData; el: El; eager: boolean; z: number; small?: boolean }) {
@@
             <Image
-              src={p.src}
+              // kleine Vorschau (Editor-Übersicht): 360er-Abzug statt 1280er-Seite
+              src={small ? p.thumb : p.src}
@@ export function PageView({
   eager = false,
+  small = false,
 }: {
@@
-        <Element key={i} book={book} el={el} eager={eager} z={i + 1} />
+        <Element key={i} book={book} el={el} eager={eager} z={i + 1} small={small} />
```

```diff
--- a/photos/src/components/editor.tsx
+++ b/photos/src/components/editor.tsx
-                              {page && <PageView book={data} page={page} side={side} />}
+                              {page && <PageView book={data} page={page} side={side} small />}
```

Die Übersicht zeigt etwa 125–150 CSS-Pixel pro Seite. Bei DPR 3 sind das bis 450 Gerätepixel, der 360er-Abzug ist dann minimal weicher. Wenn das stört: `small` nur, wenn `pageW < 140`.

### M8 Anmeldestatus vorab raten (S)

```diff
--- a/photos/src/lib/use-user.ts
+++ b/photos/src/lib/use-user.ts
+const HINT = "fuji:signed-in";
 export function useUser() {
   const [user, setUser] = useState<User | null | undefined>(undefined);
   useEffect(() => {
@@
-    return onAuthStateChanged(auth(), (u) => setUser(u));
+    // ohne Spur einer früheren Anmeldung gleich „abgemeldet“ zeigen, statt 4–5 s eine leere Fläche
+    try {
+      if (!localStorage.getItem(HINT)) setUser(null);
+    } catch {}
+    return onAuthStateChanged(auth(), (u) => {
+      try {
+        if (u) localStorage.setItem(HINT, "1");
+        else localStorage.removeItem(HINT);
+      } catch {}
+      setUser(u);
+    });
   }, []);
```

Wer schon einmal angemeldet war, sieht weiter kurz die leere Fläche. Für diese Personen wäre ein Skelett des Tisches besser als die leere Fläche.

### M9 Buch erst laden, wenn es aufgeschlagen wird (S)

```diff
--- a/photos/src/components/books.tsx
+++ b/photos/src/components/books.tsx
-import { Book } from "@/components/book";
+import dynamic from "next/dynamic";
+// Buch, Blättern und WebGL erst, wenn eins aufgeschlagen wird; der Tisch kommt ohne aus
+const Book = dynamic(() => import("@/components/book").then((m) => m.Book), { ssr: false });
```

Damit das erste Aufschlagen nicht wartet: in `ClosedBook` bei `onPointerEnter` und `onFocus` `import("@/components/book")` anstoßen. Der Aufruf von `#fuerteventura` als Direktlink lädt dann kurz nach. Die View Transition prüfen: Der Einband-Name `cover-…` muss gesetzt sein, bevor `startViewTransition` den neuen Zustand aufnimmt. Das sollte passen, weil `flushSync` erst nach dem Laden greift, wenn das Modul vorher angestoßen wurde.

### M10 SEO (S)

```ts
// photos/src/app/robots.ts (neu)
import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/b", "/neu", "/tisch"] },
    sitemap: "https://fujiventura.web.app/sitemap.xml",
  };
}
```

```ts
// photos/src/app/sitemap.ts (neu)
import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://fujiventura.web.app/", changeFrequency: "monthly", priority: 1 }];
}
```

```diff
--- a/photos/src/app/layout.tsx
+++ b/photos/src/app/layout.tsx
 export const metadata: Metadata = {
+  metadataBase: new URL("https://fujiventura.web.app"),
   title: "Fujiventura · Fotografien von Michel Leotta",
   description:
     "Sechsundzwanzig Fotografien von Fuerteventura, gebunden als Buch zum Durchblättern.",
+  openGraph: { type: "website", locale: "de_DE", siteName: "Fujiventura" },
 };
```

Dazu zwei Bilddateien (1200 × 630, JPEG): `src/app/opengraph-image.jpg` (Tisch mit beiden Büchern) und `src/app/b/opengraph-image.jpg` (Einband mit Zettel „Für dich“). Next erzeugt daraus `og:image` samt Maßen. `robots.ts` und `sitemap.ts` werden beim Export zu statischen Dateien. Bitte nach dem Build in `out/` nachsehen, ob `robots.txt` und `sitemap.xml` vorhanden sind.

Zu `/qfd`, `/kritik`, `/umfrage`: Falls sie nicht in die Suche sollen, je `robots: { index: false, follow: false }` in die `metadata` der Seite und in `robots.ts` unter `disallow`.

### M11 WebGL-Canvas schlanker (S)

```diff
--- a/photos/src/components/page-curl.tsx
+++ b/photos/src/components/page-curl.tsx
-  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
+  // Kantenglättung nur bei DPR 1: bei DPR 2–3 sieht man sie kaum, sie kostet aber 4× Speicher
+  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true });
```

Dazu bei `webglcontextrestored` den Effekt neu starten (z. B. `setSizeKey` hochzählen und `init` erneut aufrufen). Die Kante des Blatts im Simulator und am iPhone ansehen, bevor das live geht.

### M12 Schrift (S, Optik prüfen)

`Bricolage_Grotesque({ axes: ["wdth", "opsz"] })` erzeugt eine 131-kB-Datei. Genutzt wird `opsz` nur für große Zeilen (`"opsz" 96`). Wenn der optische Unterschied zwischen `opsz 96` und Standard am Wortzeichen und an den Titeln vertretbar ist, `axes: ["wdth"]` setzen. Das spart geschätzt 30–50 kB vor dem ersten Bild. Vorher und nachher als Screenshot vergleichen.

---

## 5. Handy und Safari flüssig

Die fünf Dinge, die auf dem iPhone am meisten bringen, in dieser Reihenfolge:

1. **M1 Fotos live reparieren.** Ohne das sind alle anderen Messungen auf dem Handy nur Theorie.
2. **M6 Einlesen entschärfen:** eine Bahn auf Touch-Geräten, Canvas mit `width = 0` freigeben, später verkleinert dekodieren. Das ist das einzige Absturzrisiko, das ich für wahrscheinlich halte. Test in Safari: 20 iPhone-Fotos (HEIC, 48 MP) in einen neuen Entwurf ziehen und dabei in der Web-Inspector-Zeitleiste „Memory“ beobachten.
3. **M5 Blättern:** Texturen erst nach dem Umblättern, `decode()` vor `drawImage`, Bildcache begrenzen. Spürbar beim ersten Wischen nach dem Aufschlagen.
4. **M2 + M4 + M3 Laden:** auf Mobilfunk die größten Brocken (361 kB Intro, 235 kB Texturen, 197 kB Firebase für Gäste).
5. **M7 Übersicht mit Thumbnails:** hält den Editor bei 50–150 Fotos unter der Speichergrenze.

Was am iPhone von Hand zu prüfen ist (Safari, Web Inspector am Mac, „Zeitleisten“ → „Speicher“ und „Bildrate“):

| Test | Erwartung | Achten auf |
| --- | --- | --- |
| `/` erster Besuch auf 4G | Intro startet < 1,5 s, Einband sichtbar < 3 s | leere dunkle Fläche vor dem Intro |
| Buch auf dem Handy, 10× schnell wischen | keine Hänger > 100 ms | Hänger auf halbem Weg (Textur-Upload) |
| ganzes Buch durchblättern | Speicher < 500 MB | Tab lädt neu („Diese Seite wurde neu geladen“) |
| 20 HEIC-Fotos einlesen | keine Fehlermeldung „Kodieren fehlgeschlagen“ | Konsole: „Total canvas memory use exceeds …“ |
| App in den Hintergrund, zurück, weiterblättern | Biegung wieder da | WebGL-Kontext verloren, flaches Blättern |
| Bühne: Zuschneiden mit dem Finger | 60/120 fps | Ruckeln bei schnellen Bewegungen |
| `?ohne=biegung`, `?ohne=schatten` | zum Eingrenzen, falls etwas hakt | |

## Anhang: Rohdaten

- Lade-Messung je Route: `docs/perf-skripte/load.mjs`
- Blättern: `docs/perf-skripte/flip.mjs`, Trace `trace.mjs`
- Editor (30 Fotos, 40 MP, Bühne, Gastlink): `docs/perf-skripte/editor.mjs`
- Messhilfen im Browser: `docs/perf-skripte/instr.js`, `common.mjs`
- Server mit sauberen URLs: `docs/perf-skripte/serve.py`
- Lighthouse: `npx lighthouse@12 <url> --form-factor=mobile` mit `CHROME_PATH=/opt/pw-browsers/chromium`
