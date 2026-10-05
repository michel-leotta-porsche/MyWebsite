# Prompters Anonymous (Erklärvideo)

Ein 92-Sekunden-Cartoon (1920×1080, Englisch) im Bastelpapier-Stil: eine Selbsthilfegruppe für
Leute, die Claude Opus 5.5 falsch prompten. Jede Figur beichtet eine Sünde, Gruppenleiter Doug
schreibt die passende Regel ans Flipchart, Rückblenden zeigen die Folgen. Running Gag: Todo,
ein Klebezettel, will aufgeschrieben werden (Bonusregel: Checkliste führen).

Alle Figuren sind eigene Figuren. Stil-Vorbild ist der Cutout-Look bekannter Serien, es werden
keine fremden Figuren verwendet.

Inhaltliche Quellen:
[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) und
[Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5).

Die Render-Engine stammt aus [pdoom-video](https://github.com/mexicat/pdoom-video) von mexicat
(MIT, siehe `LICENSE.pdoom-engine`). Angepasst: Palette, Schriften (Schibsted Grotesk, IBM Plex Mono),
Browserstart ohne GPU. Dieser Ordner ist vom Next-Build ausgenommen (`tsconfig.json`, `eslint.config.mjs`).

## Aufbau

| Pfad | Rolle |
| --- | --- |
| `analysis/voice.py` | Drehbuch (`SCRIPT`: Sprecher, Text, Abschnitt, Einstellungen), Stimmen mit Kokoro, Wort-Timings |
| `analysis/music.py` | Musikbett aus Formeln (Sitcom-Groove), setzt in Rückblenden und nach Pointen aus |
| `analysis/sfx.py` | Soundeffekte aus Formeln, Mischung mit Ducking, −14 LUFS → `audio/mix.wav` |
| `app/src/scenes/_paper.ts` | Werkzeug: ausgeschnittene Formen, Filzstruktur, Stop-Motion-Schritt (12 fps) |
| `app/src/scenes/_cast.ts` | Figuren: Doug, Kevin, Barb, Tyler, Priya, Todo |
| `app/src/scenes/_room.ts` | Kulisse in Perspektive, Flipchart mit Handschrift, Easter Eggs (`EGG`) |
| `app/src/scenes/club-gags.ts` | Sieben Rückblenden |
| `app/src/scenes/club.ts` | Regie: Kamera, Blicke, Launen, Untertitel, Titel, Abspann, Punch-Zooms |
| `app/src/timeline.ts` | Abschnitte aus dem Feld `rule` im Drehbuch |
| `app/scripts/render.ts` | Offline-Renderer (Headless-Chrome → ffmpeg) |

Einstellungen im Drehbuch: `wide`, `cu:<FIGUR>`, `flip`, `cut:<gag>`, jeweils ab einem Wort
(`"It"`) oder nach der Zeile (`"+end"`). Ton und Bild lesen dieselben Daten und bleiben synchron.

## Ablauf

Voraussetzungen: bun, ffmpeg mit libx264 und rubberband, Python mit uv, Chrome oder Chromium.

1. Python-Umgebung (einmalig): torch für CPU, dann Kokoro.
   ```sh
   uv venv kok && . kok/bin/activate
   uv pip install torch --index-url https://download.pytorch.org/whl/cpu
   uv pip install "kokoro==0.9.4" "transformers>=4.45" "tokenizers>=0.20" soundfile numpy pip
   ```
2. Ton erzeugen (aus `video/`):
   ```sh
   python analysis/voice.py && python analysis/music.py && python analysis/sfx.py
   ```
3. Vorschau: `cd app && bun install && bunx vite`, dann http://localhost:5173 (Leertaste spielt ab).
4. Standbilder: `bun scripts/render.ts stills --t 15.5,60 --out ../out/wip`
5. Video (Cartoon-typisch 24 fps):
   ```sh
   bun scripts/render.ts video --fps 24 --preset veryfast --out ../out/draft.mp4
   ```

Ohne installiertes Chrome: `CHROME_PATH=/pfad/zu/chromium`. Ohne GPU rendert der Browser über
SwiftShader (ca. 1 s pro Frame); Abschnitte parallel mit `--from`/`--to` rendern und mit
`ffmpeg -f concat` zusammensetzen.

## Ändern

- **Text:** `SCRIPT` in `analysis/voice.py`, dann Schritt 2. Zeitpunkte im Bild hängen an Wörtern
  (`this.at('<Teil der Zeile>', '<Wort>')`); wer Wörter ändert, prüft `club.ts` und `club-gags.ts`.
- **Eigene Stimmen (z. B. ElevenLabs):** `voice.py` schreibt Audio und Timings in einem Schritt.
  Für fertige Aufnahmen braucht es eine Ausrichtung (Forced Alignment) ins selbe `data/lyrics.json`-Format.
- Alles bleibt eine reine Funktion von `f.t`: kein `Math.random()`, kein `Date.now()`.
