# Opus 5.5 Field Guide (Erklärvideo)

Ein 94-Sekunden-Video (1920×1080, Englisch): Dr. Vex, ein genervter Wissenschaftler, erklärt dem
Praktikanten Jo sieben Regeln für die Arbeit mit Claude Opus 5.5. Cartoon-Stil, eigene Figuren.
Jedes Bild ist eine Funktion der Zeit; die Szenen finden ihre Einsätze über den gesprochenen Text.

Inhaltliche Quellen:
[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) und
[Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5).

Die Render-Engine stammt aus [pdoom-video](https://github.com/mexicat/pdoom-video) von mexicat
(MIT, siehe `LICENSE.pdoom-engine`). Angepasst: Palette, Schriften (Schibsted Grotesk, IBM Plex Mono),
Browserstart ohne GPU. Dieser Ordner ist vom Next-Build ausgenommen (`tsconfig.json`, `eslint.config.mjs`).

## Aufbau

| Pfad | Rolle |
| --- | --- |
| `analysis/voice.py` | Drehbuch (`SCRIPT`), Entwurfs-Voiceover mit Piper, Wort-Timings |
| `audio/voiceover.wav`, `data/*.json` | Erzeugt von `voice.py` (nicht im Repo) |
| `app/src/engine/` | Engine (WebGL, Post-Processing, Typografie) |
| `app/src/scenes/_lab.ts` | Figuren, Sprechblase mit Karaoke, Kopfzeile, Linien mit „Boil“ |
| `app/src/scenes/lab-props.ts` | Eine Requisite pro Regel |
| `app/src/scenes/lab.ts` | Szene: Portal-Hintergrund, Ebenen, Post-Werte |
| `app/src/timeline.ts` | Abschnitte aus dem Feld `rule` im Drehbuch |
| `app/scripts/render.ts` | Offline-Renderer (Headless-Chrome → ffmpeg) |

## Ablauf

Voraussetzungen: bun, ffmpeg mit libx264, Python mit uv, Chrome oder Chromium.

1. Stimmen laden (einmalig, je ca. 115 MB) nach `analysis/voices/`:
   `en_US-ryan-high` und `en_US-lessac-high` aus
   [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) (`.onnx` und `.onnx.json`).
2. Voiceover und Timings erzeugen (aus `video/`):
   ```sh
   python -m uv run --no-project --with piper-tts --with onnx --with numpy python analysis/voice.py
   ```
3. Vorschau: `cd app && bun install && bunx vite`, dann http://localhost:5173 (Leertaste spielt ab).
4. Standbilder: `bun scripts/render.ts stills --t 15.5,60 --out ../out/wip`
5. Video:
   ```sh
   bun scripts/render.ts video --fps 30 --preset veryfast --out ../out/draft.mp4   # Entwurf
   bun scripts/render.ts video --samples auto                                     # final, 60 fps
   ```

Ohne installiertes Chrome: `CHROME_PATH=/pfad/zu/chromium`. Ohne GPU rendert der Browser über
SwiftShader (ca. 0,8 s pro Frame bei 1080p); mehrere Abschnitte parallel mit `--from`/`--to`
rendern und mit `ffmpeg -f concat` zusammensetzen.

## Ändern

- **Text:** `SCRIPT` in `analysis/voice.py`, dann Schritt 2. Requisiten suchen ihre Wörter per
  `sc.at('<Teil der Zeile>', '<Wort>')`; wer Wörter ändert, passt die Abfragen in `lab-props.ts` an.
- **Eigene Stimme (z. B. ElevenLabs):** `voice.py` schreibt Audio und Timings in einem Schritt.
  Für eine fertige Aufnahme braucht es stattdessen eine Ausrichtung (Forced Alignment), die dasselbe
  `data/lyrics.json`-Format mit `speaker` und `rule` pro Zeile erzeugt.
- Alles bleibt eine reine Funktion von `f.t`: kein `Math.random()`, kein `Date.now()`.
