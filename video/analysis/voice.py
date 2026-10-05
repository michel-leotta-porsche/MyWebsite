"""Entwurfs-Voiceover mit Piper (lokale TTS) plus Wort-Timings.

Erzeugt:
  audio/voiceover.wav   der Dialog, alle Zeilen hintereinander
  data/lyrics.json      Zeilen und Wörter mit Start/Ende (Format der Engine) und Sprecher
  data/audio.json       Lautstärke-Hüllkurven, Wort-Onsets, nominales Taktraster

Die Wortgrenzen kommen aus Pipers Phonem-Alignment (Leerzeichen-Phoneme trennen Wörter).
Für einen echten Voiceover (z. B. ElevenLabs) wird dieses Skript durch eine Ausrichtung
ersetzt; die Szenen finden ihre Zeilen über den Text, nicht über Zeiten.

Aufruf (aus video/):
  python -m uv run --no-project --with piper-tts --with onnx --with numpy python analysis/voice.py
Stimmen: analysis/voices/<name>.onnx(.json), siehe README.
"""

import json
import re
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
VOICES = ROOT / "analysis" / "voices"
SR = 22050

# Sprecher: Stimme, Tempo (length_scale < 1 = schneller), Variation
CAST = {
    "VEX": dict(voice="en_US-ryan-high", length=0.88, noise=0.75, noise_w=0.9),
    "JO": dict(voice="en_US-lessac-high", length=0.95, noise=0.7, noise_w=0.85),
}

# Pause vor einer Zeile (s): neue Regel, Sprecherwechsel, gleicher Sprecher
GAP_RULE, GAP_SWITCH, GAP_SAME = 0.75, 0.22, 0.32

# Das Drehbuch. Jede Zeile ist eine Sprechblase. `rule` markiert den Anfang eines Abschnitts.
SCRIPT = [
    ("JO", "Doc! I asked Opus five point five to fix one login bug, and it refactored the entire universe!", "open"),
    ("VEX", "Because you prompted it like a fortune cookie, Jo.", None),
    ("VEX", "Sit down. Seven rules. Try not to drool on them.", None),
    ("VEX", "Rule one. Give it a check it can run. Tests. A build. A screenshot.", "verify"),
    ("JO", "Why can't it just, you know, be done?", None),
    ("VEX", "Without a check, looks done is the only signal. Then you are the test suite. Gross.", None),
    ("VEX", "Rule two. Explore, then plan, then code.", "plan"),
    ("JO", "Even for a typo?", None),
    ("VEX", "No! If you can say the diff in one sentence, skip the plan.", None),
    ("VEX", "Rule three. Be specific. Name the file, the edge case, the pattern to copy.", "specific"),
    ("JO", "So not just, make it better?", None),
    ("VEX", "Make it better is how dimensions collapse, Jo.", None),
    ("VEX", "Rule four. Context is the scarcest resource in the multiverse.", "context"),
    ("VEX", "Clear it between tasks. Send subagents to do the digging.", None),
    ("JO", "And if I already corrected it twice?", None),
    ("VEX", "Clear. Start fresh. Better prompt.", None),
    ("VEX", "Rule five. Effort is the dial. Not magic words.", "effort"),
    ("VEX", "Start at medium. Medium matches the old Opus on high.", None),
    ("JO", "So I can delete, think really really hard?", None),
    ("VEX", "Delete it. It's a model, not a seance.", None),
    ("VEX", "Rule six. Keep Claude dot M D short.", "memory"),
    ("VEX", "For every line, ask: would removing this cause a mistake?", None),
    ("JO", "And the stuff that has to happen every single time?", None),
    ("VEX", "Hooks. Hooks don't forget. Unlike you.", None),
    ("VEX", "Rule seven. Get a second opinion.", "review"),
    ("VEX", "A fresh subagent sees the diff. Not your excuses.", None),
    ("JO", "Check. Plan. Specific. Clean context. Effort. Short memory. Fresh eyes.", "outro"),
    ("VEX", "Look at you. Almost competent. Now go. The universe won't refactor itself.", None),
]

# Was auf dem Bildschirm steht, wenn es vom Gesprochenen abweicht (gleiche Wortzahl pro Gruppe).
# Schlüssel: gesprochene Wortfolge, Wert: angezeigtes Token.
DISPLAY = {
    "five point five": "5.5",
    "Claude dot M D": "CLAUDE.md",
    "looks done": "“looks done”",
    "make it better?": "“make it better”?",
    "Make it better": "“Make it better”",
    "think really really hard?": "“think really, really hard”?",
    "seance.": "séance.",
}


def words_of(text: str) -> list[str]:
    return text.split()


def display_words(spoken: list[str]) -> list[tuple[str, int, int]]:
    """Gesprochene Wörter zu Anzeige-Tokens gruppieren: (token, erstes Wort, letztes Wort)."""
    out, i = [], 0
    keys = sorted(DISPLAY, key=lambda k: -len(k.split()))
    while i < len(spoken):
        for k in keys:
            n = len(k.split())
            if " ".join(spoken[i : i + n]) == k:
                out.append((DISPLAY[k], i, i + n - 1))
                i += n
                break
        else:
            out.append((spoken[i], i, i))
            i += 1
    return out


def synth(voice: PiperVoice, cfg: SynthesisConfig, text: str):
    """Audio (float32) und Wortzeiten [(start, end)] relativ zum Zeilenanfang."""
    audio, spans, pos = [], [], 0
    for ch in voice.synthesize(text, cfg, include_alignments=True):
        a = ch.audio_int16_array.astype(np.float32) / 32768.0
        cur = None
        for al in ch.phoneme_alignments or []:
            n = int(al.num_samples)
            p = al.phoneme
            if p in ("^", "$", " ", ".", ",", "!", "?", ":", ";", "—"):
                if cur is not None:
                    spans.append(cur)
                    cur = None
            elif cur is None:
                cur = [pos, pos + n]
            else:
                cur[1] = pos + n
            pos += n
        if cur is not None:
            spans.append(cur)
        pos = sum(len(x) for x in audio) + len(a)
        audio.append(a)
    return np.concatenate(audio), [(s / SR, e / SR) for s, e in spans]


def main():
    voices = {k: PiperVoice.load(str(VOICES / f"{c['voice']}.onnx"), include_alignments=True) for k, c in CAST.items()}
    cfgs = {k: SynthesisConfig(length_scale=c["length"], noise_scale=c["noise"], noise_w_scale=c["noise_w"]) for k, c in CAST.items()}

    track: list[np.ndarray] = []
    t = 0.45  # kurzer Vorlauf
    track.append(np.zeros(int(t * SR), np.float32))
    lines, prev = [], None
    for i, (who, text, rule) in enumerate(SCRIPT):
        if i > 0:
            gap = GAP_RULE if rule else (GAP_SWITCH if who != prev else GAP_SAME)
            track.append(np.zeros(int(gap * SR), np.float32))
            t += gap
        a, spans = synth(voices[who], cfgs[who], text)
        spoken = words_of(text)
        if len(spans) != len(spoken):
            # Fallback: Zeichen-proportional über die gesprochene Dauer
            print(f"! Wortzahl weicht ab ({len(spans)} vs {len(spoken)}): {text}")
            nz = np.nonzero(np.abs(a) > 0.02)[0]
            s0, s1 = (nz[0] / SR, nz[-1] / SR) if len(nz) else (0, len(a) / SR)
            tot = sum(len(w) + 1 for w in spoken)
            acc, spans = 0, []
            for w in spoken:
                spans.append((s0 + (s1 - s0) * acc / tot, s0 + (s1 - s0) * (acc + len(w)) / tot))
                acc += len(w) + 1
        words = []
        for tok, a0, a1 in display_words(spoken):
            words.append({"w": tok, "start": round(t + spans[a0][0], 3), "end": round(t + spans[a1][1], 3)})
        disp = " ".join(w["w"] for w in words)
        lines.append({"text": disp, "speaker": who, "rule": rule, "start": words[0]["start"], "end": words[-1]["end"], "words": words})
        track.append(a)
        t += len(a) / SR
        prev = who
    tail = 3.2
    track.append(np.zeros(int(tail * SR), np.float32))
    y = np.concatenate(track)
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    dur = len(y) / SR

    (ROOT / "audio").mkdir(exist_ok=True)
    with wave.open(str(ROOT / "audio" / "voiceover.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())

    # Hüllkurven mit 100 fps: RMS, und pro Sprecher (für Mundbewegung)
    fps, hop = 100, SR // 100
    n = len(y) // hop
    rms = np.sqrt(np.mean(y[: n * hop].reshape(n, hop) ** 2, axis=1))
    rms = rms / max(1e-6, np.percentile(rms, 98))
    rms = np.clip(rms, 0, 1)

    # nominales Raster 120 BPM, damit beatAt/barAt sinnvolle Werte liefern
    bpm = 120.0
    beats = [round(x, 3) for x in np.arange(0.0, dur, 60 / bpm)]
    down = beats[::4]
    sections = []
    for i, l in enumerate(lines):
        if l["rule"]:
            sections.append({"name": l["rule"], "start": l["start"], "end": dur})
            if len(sections) > 1:
                sections[-2]["end"] = l["start"]
    onsets = {"vocal": [[w["start"], 1.0] for l in lines for w in l["words"]]}
    audio = {
        "duration": round(dur, 3),
        "bpm": bpm,
        "fps": fps,
        "beats": beats,
        "downbeats": down,
        "sections": sections,
        "features": {"rms": [round(float(v), 3) for v in rms], "vocal": [round(float(v), 3) for v in rms]},
        "onsets": onsets,
    }
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "lyrics.json").write_text(json.dumps({"lines": lines}, ensure_ascii=False, indent=1))
    (ROOT / "data" / "audio.json").write_text(json.dumps(audio))
    print(f"{len(lines)} Zeilen, {dur:.2f} s")
    for l in lines:
        print(f"{l['start']:6.2f}-{l['end']:6.2f} {l['speaker']:3} {l['text']}")


if __name__ == "__main__":
    main()
