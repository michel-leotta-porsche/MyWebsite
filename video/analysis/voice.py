"""Voiceover für „Prompters Anonymous“: Kokoro-TTS pro Figur, Wort-Timings, Einstellungen.

Erzeugt:
  audio/voiceover.wav   nur Stimmen (für Mundbewegung und Hüllkurven)
  data/lyrics.json      Zeilen mit Wörtern, Sprecher, Abschnitt (rule) und Einstellungen (shots)
  data/audio.json       Lautstärke-Hüllkurve, Wort-Onsets, nominales Raster
Danach: analysis/sfx.py mischt Soundeffekte dazu (audio/mix.wav).

Aufruf (aus video/):
  python -m uv run --no-project --with kokoro --with soundfile --with numpy python analysis/voice.py
(torch für CPU vorher aus https://download.pytorch.org/whl/cpu installieren, siehe README)
"""

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parent.parent
SR = 24000
LEAD_IN = 2.7  # Titelkarte vor der ersten Zeile
TAIL = 4.6  # Abspann nach der letzten Zeile

# Figur: Kokoro-Stimme, Sprachvariante (a = US, b = UK), Tempo, Tonhöhe (Halbtöne, Formanten wandern mit)
CAST = {
    "DOUG": dict(voice="am_onyx", lang="a", speed=0.92, pitch=0.0),
    "KEVIN": dict(voice="am_puck", lang="a", speed=1.05, pitch=2.0),
    "BARB": dict(voice="af_bella", lang="a", speed=1.0, pitch=-0.5),
    "TYLER": dict(voice="am_fenrir", lang="a", speed=1.08, pitch=1.0),
    "PRIYA": dict(voice="bf_emma", lang="b", speed=0.95, pitch=0.0),
    "TODO": dict(voice="af_sky", lang="a", speed=1.12, pitch=6.0),
}
CHORUS = ["KEVIN", "BARB", "TYLER", "PRIYA"]

# Pausen vor einer Zeile (s)
GAP_RULE, GAP_SWITCH, GAP_SAME = 0.55, 0.18, 0.28

# Drehbuch: (Sprecher, gesprochener Text, Abschnitt oder None, Einstellungen)
# Einstellungen: Liste aus (Einstellung, ab Wort oder None). Einstellungen:
#   wide · cu:<FIGUR> · flip · cut:<gag>   (siehe app/src/scenes/club.ts)
SCRIPT = [
    ("DOUG", "Welcome to Prompters Anonymous. Who'd like to share?", "open", [("wide", None)]),
    ("TODO", "Ooh! Me! Me! Did anyone write me down?", None, [("cu:TODO", None)]),
    ("DOUG", "Not now, To do.", None, [("cu:DOUG", None)]),
    ("KEVIN", "Hi. I'm Kevin.", "verify", [("cu:KEVIN", None)]),
    ("ALL", "Hi, Kevin.", None, [("wide", None)]),
    ("KEVIN", "I let Claude ship without running a single test. It said, looks done.", None, [("cu:KEVIN", None), ("cut:fire", "It")]),
    ("DOUG", "Rule one. Give it a check it can run. Tests. A build. A screenshot.", None, [("flip", None)]),
    ("TYLER", "Yo. Tyler. I made it write a twelve page plan. To fix one typo.", "plan", [("cu:TYLER", None), ("cut:plan", "twelve")]),
    ("DOUG", "Plan the big stuff. If the diff fits in one sentence, skip the plan.", None, [("cu:DOUG", None), ("flip", "If")]),
    ("BARB", "I'm Barb. I typed, make it better. Then I typed, no. Better!", "specific", [("cu:BARB", None), ("cut:gaudy", "make")]),
    ("ALL", "Oh, Barb.", None, [("wide", None)]),
    ("DOUG", "Name the file. The edge case. The pattern to copy.", None, [("flip", None)]),
    ("PRIYA", "Priya. My session has been open since March. I corrected it eleven times.", "context", [("cu:PRIYA", None), ("cut:cobweb", "My")]),
    ("DOUG", "Clear between tasks. Send subagents to dig. Corrected it twice? Start fresh.", None, [("cu:DOUG", None), ("flip", "Send")]),
    ("TYLER", "Also. I set effort to max. In all caps. To say hello.", "effort", [("cu:TYLER", None), ("cut:max", "In")]),
    ("DOUG", "Start at medium. It matches the old Opus on high. Turn the dial, not the caps lock.", None, [("flip", None), ("cu:DOUG", "Turn"), ("cu:TYLER", "caps")]),
    ("BARB", "My Claude dot M D is longer than my divorce papers.", "memory", [("cu:BARB", None), ("cut:scroll", "is")]),
    ("DOUG", "Keep it short. If cutting a line causes no mistake, cut it. Rules that must always run? Hooks.", None, [("flip", None)]),
    ("PRIYA", "I let it grade its own homework.", "review", [("cu:PRIYA", None), ("cut:homework", "grade")]),
    ("KEVIN", "Did it pass?", None, [("cu:KEVIN", None)]),
    ("PRIYA", "With honors.", None, [("cu:PRIYA", None), ("wide", "+end")]),
    ("DOUG", "Second opinion. A fresh subagent sees the diff, not the excuses.", None, [("flip", None)]),
    ("TODO", "Can someone please write me down?", "outro", [("cu:TODO", None)]),
    ("DOUG", "Fine. Bonus rule. Long task? Keep a checklist the model updates.", None, [("cu:DOUG", None), ("flip", "Keep")]),
    ("TODO", "I'm on the list! I'm on the list!", None, [("cu:TODO", None)]),
    ("ALL", "Hi, To do.", None, [("wide", None)]),
]

# Comedy-Pausen nach Pointen (s), Schlüssel: Anfang der Zeile
BEAT_AFTER = {
    "I let Claude ship": 1.1,  # Platz für die traurige Posaune
    "Yo. Tyler.": 0.5,
    "I'm Barb.": 0.35,
    "Priya. My session": 0.5,
    "Also. I set effort": 0.7,
    "My Claude dot": 0.6,
    "With honors.": 1.5,  # Kevin kippt mit dem Stuhl um
    "Can someone please": 0.3,
}

# Anzeige, wo sie vom Gesprochenen abweicht (gesprochene Wortfolge → angezeigtes Token)
DISPLAY = {
    "To do.": "Todo.",
    "To do,": "Todo,",
    "Claude dot M D": "CLAUDE.md",
    # Listen: ein Anzeige-Token pro gesprochenem Wort (Wortzeiten bleiben einzeln)
    "make it better.": ["“make", "it", "better.”"],
    "no. Better!": ["“no.", "Better!”"],
    "looks done.": ["“looks", "done.”"],
}


def display_words(spoken):
    out, i = [], 0
    keys = sorted(DISPLAY, key=lambda k: -len(k.split()))
    while i < len(spoken):
        for k in keys:
            n = len(k.split())
            if " ".join(spoken[i:i + n]) == k:
                v = DISPLAY[k]
                if isinstance(v, list):
                    out.extend((tok, i + j, i + j) for j, tok in enumerate(v))
                else:
                    out.append((v, i, i + n - 1))
                i += n
                break
        else:
            out.append((spoken[i], i, i))
            i += 1
    return out


_pipes = {}


def pipe(lang):
    if lang not in _pipes:
        _pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    return _pipes[lang]


def pitch_shift(a, semis):
    if abs(semis) < 0.01:
        return a
    with tempfile.TemporaryDirectory() as d:
        i, o = Path(d) / "i.wav", Path(d) / "o.wav"
        sf.write(i, a, SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(i), "-af", f"rubberband=pitch={2 ** (semis / 12):.5f}", str(o)], check=True)
        b, _ = sf.read(o, dtype="float32")
    n = len(a)
    return np.pad(b, (0, max(0, n - len(b))))[:n]


def synth(who, text):
    """Audio und Wortspannen [(start, end)] (s), eine Spanne pro Leerzeichen-Wort."""
    c = CAST[who]
    audio, toks, off = [], [], 0.0
    for r in pipe(c["lang"])(text, voice=c["voice"], speed=c["speed"]):
        a = r.audio.detach().cpu().numpy().astype(np.float32)
        for tk in r.tokens or []:
            toks.append((tk.text, tk.whitespace, None if tk.start_ts is None else tk.start_ts + off, None if tk.end_ts is None else tk.end_ts + off))
        audio.append(a)
        off += len(a) / SR
    a = pitch_shift(np.concatenate(audio), c["pitch"])
    # Tokens zu Wörtern gruppieren: ein Wort endet an einem Token mit folgendem Leerzeichen
    words, cur = [], []
    for tk in toks:
        cur.append(tk)
        if tk[1]:
            words.append(cur)
            cur = []
    if cur:
        words.append(cur)
    spans = []
    for w in words:
        s = [x[2] for x in w if x[2] is not None]
        e = [x[3] for x in w if x[3] is not None]
        spans.append((min(s) if s else None, max(e) if e else None))
    return a, spans


def fix_spans(spans, n, dur):
    """Zeiten auf die (getrimmte) Audiolänge begrenzen; bei falscher Anzahl None (dann geschätzt).
    Kokoro rechnet die Stille nach dem letzten Wort diesem Wort zu, daher die Kappung."""
    if len(spans) != n or any(s is None or e is None for s, e in spans):
        return None
    out = []
    for s, e in spans:
        s = min(max(0.0, s), dur - 0.05)
        out.append((s, max(s + 0.05, min(e, dur))))
    return out


def trim(a, thr=0.008):
    nz = np.nonzero(np.abs(a) > thr)[0]
    if not len(nz):
        return a, 0.0
    s = max(0, nz[0] - int(0.02 * SR))
    e = min(len(a), nz[-1] + int(0.06 * SR))
    return a[s:e], s / SR


def main():
    track = [np.zeros(int(LEAD_IN * SR), np.float32)]
    t = LEAD_IN
    lines, prev = [], None
    for i, (who, text, rule, shots) in enumerate(SCRIPT):
        if i > 0:
            gap = GAP_RULE if rule else (GAP_SWITCH if who != prev else GAP_SAME)
            gap += next((v for k, v in BEAT_AFTER.items() if SCRIPT[i - 1][1].startswith(k)), 0.0)
            track.append(np.zeros(int(gap * SR), np.float32))
            t += gap
        spoken = text.split()
        if who == "ALL":
            parts = []
            # wer begrüßt wird, grüßt nicht mit („Hi, Kevin.“ ohne Kevin)
            voices = [w for w in CHORUS if w.capitalize() not in text]
            for k, w in enumerate(voices):
                a, sp = synth(w, text)
                a, s0 = trim(a)
                sp = [(None if s is None else s - s0, None if e is None else e - s0) for s, e in sp]
                parts.append((a, sp, int((0.012 + 0.035 * k) * SR)))
            n = max(len(a) + d for a, _, d in parts)
            a = np.zeros(n, np.float32)
            for p, _, d in parts:
                a[d:d + len(p)] += p * 0.55
            spans = fix_spans(parts[0][1], len(spoken), len(parts[0][0]) / SR)
        else:
            a, sp = synth(who, text)
            a, s0 = trim(a)
            sp = [(None if s is None else max(0.0, s - s0), None if e is None else e - s0) for s, e in sp]
            spans = fix_spans(sp, len(spoken), len(a) / SR)
        if spans is None:
            print(f"! Wortzeiten geschätzt: {text}")
            tot = sum(len(w) + 1 for w in spoken)
            dur, acc, spans = len(a) / SR, 0, []
            for w in spoken:
                spans.append((dur * acc / tot, dur * (acc + len(w)) / tot))
                acc += len(w) + 1
        words = [{"w": tok, "start": round(t + spans[a0][0], 3), "end": round(t + spans[a1][1], 3)} for tok, a0, a1 in display_words(spoken)]
        shot_list = []
        for s, at in shots:
            if at is None:
                st = t - 0.12 if i > 0 else 0.0
            elif at == "+end":  # Schnitt in der Pause nach der Zeile (Reaktion)
                st = words[-1]["end"] + 0.12
            else:
                st = next(w["start"] for w in words if w["w"].strip("“”.,!?").startswith(at)) - 0.08
            shot_list.append({"s": s, "t": round(st, 3)})
        lines.append({
            "text": " ".join(w["w"] for w in words), "speaker": who, "rule": rule, "shots": shot_list,
            "start": words[0]["start"], "end": words[-1]["end"], "words": words,
        })
        track.append(a)
        t += len(a) / SR
        prev = who
    track.append(np.zeros(int(TAIL * SR), np.float32))
    y = np.concatenate(track)
    y = y / max(1e-6, np.abs(y).max()) * 0.89
    dur = len(y) / SR
    (ROOT / "audio").mkdir(exist_ok=True)
    sf.write(ROOT / "audio" / "voiceover.wav", y, SR, subtype="PCM_16")

    fps, hop = 100, SR // 100
    n = len(y) // hop
    rms = np.sqrt(np.mean(y[: n * hop].reshape(n, hop) ** 2, axis=1))
    rms = np.clip(rms / max(1e-6, np.percentile(rms, 98)), 0, 1)
    bpm = 120.0
    beats = [round(float(x), 3) for x in np.arange(0.0, dur, 60 / bpm)]
    sections = []
    for l in lines:
        if l["rule"]:
            if sections:
                sections[-1]["end"] = l["start"]
            sections.append({"name": l["rule"], "start": l["start"], "end": dur})
    audio = {
        "duration": round(dur, 3), "bpm": bpm, "fps": fps, "beats": beats, "downbeats": beats[::4], "sections": sections,
        "features": {"rms": [round(float(v), 3) for v in rms], "vocal": [round(float(v), 3) for v in rms]},
        "onsets": {"vocal": [[w["start"], 1.0] for l in lines for w in l["words"]]},
    }
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "lyrics.json").write_text(json.dumps({"lines": lines}, ensure_ascii=False, indent=1))
    (ROOT / "data" / "audio.json").write_text(json.dumps(audio))
    print(f"{len(lines)} Zeilen, {dur:.2f} s")
    for l in lines:
        print(f"{l['start']:6.2f}-{l['end']:6.2f} {l['speaker']:5} {l['text']}   {[s['s'] for s in l['shots']]}")


if __name__ == "__main__":
    main()
