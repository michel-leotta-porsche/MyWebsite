"""Musikbett: Sitcom-Groove aus Formeln (104 BPM, Dm7 – G7 – Cmaj7 – A7).

Schreibt audio/music.wav (gleiche Länge wie das Voiceover). Die Musik setzt in Rückblenden
und nach Pointen aus (Comedy-Stille) und kommt danach wieder; die Pausen kommen aus
data/lyrics.json, damit Bild und Musik zusammenbleiben.

Aufruf (aus video/):  python -m uv run --no-project --with numpy --with soundfile python analysis/music.py
"""

import json
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 24000
BPM = 104.0
BEAT = 60 / BPM
rng = np.random.default_rng(3)

# Akkorde (MIDI) und Grundtöne pro Takt
CHORDS = [
    (50, [62, 65, 69, 72]),  # Dm7
    (43, [62, 65, 67, 71]),  # G7
    (48, [60, 64, 67, 71]),  # Cmaj7
    (45, [61, 64, 67, 69]),  # A7
]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def onepole(x, cut):
    """Einpol-Tiefpass; `cut` darf ein Array sein (Filter, der sich pro Note öffnet)."""
    a = np.broadcast_to(np.exp(-2 * np.pi * np.asarray(cut, dtype=float) / SR), x.shape)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.9


def snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - onepole(noise, 1500)
    return (noise * 0.5 * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * 0.4 * np.exp(-t * 30)) * 0.7


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = x - onepole(x, 7000)
    return x * np.exp(-t * (14 if open_ else 70)) * 0.22


def bass(m, d):
    n = int(d * SR)
    t = np.arange(n) / SR
    ph = np.cumsum(np.full(n, hz(m))) / SR
    saw = 2 * (ph % 1) - 1
    x = onepole(saw, 380 + 900 * np.exp(-t * 18))
    env = np.minimum(1, t / 0.005) * np.exp(-t * 3.5)
    return x * env * 0.55


def epiano(ms, d):
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in ms:
        f = hz(m)
        mod = np.sin(2 * np.pi * f * t) * 1.2 * np.exp(-t * 6)
        out += np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 4.5)
    trem = 1 + 0.15 * np.sin(2 * np.pi * 5 * t)
    return out * trem * np.minimum(1, t / 0.004) * 0.09


def put(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf) or i < 0:
        return
    m = min(len(sig), len(buf) - i)
    buf[i:i + m] += sig[:m]


def main():
    lines = json.loads((ROOT / "data" / "lyrics.json").read_text())["lines"]
    dur = sf.info(str(ROOT / "audio" / "voiceover.wav")).duration
    n = int(dur * SR)
    drums, bas, keys = np.zeros(n), np.zeros(n), np.zeros(n)
    K, S, Ho, Hc = kick(), snare(), hat(True), hat(False)
    bar = 4 * BEAT
    nbars = int(dur / bar) + 1
    for b in range(nbars):
        t0 = b * bar
        root, chord = CHORDS[b % 4]
        # Schlagzeug: Kick 1 und 3 (plus Synkope), Snare 2 und 4, Hi-Hats in Achteln
        for k in (0, 2.5):
            put(drums, K, t0 + k * BEAT)
        if b % 2:
            put(drums, K, t0 + 3.5 * BEAT)
        for k in (1, 3):
            put(drums, S, t0 + k * BEAT)
        for e in range(8):
            put(drums, Ho if e == 7 else Hc, t0 + e * BEAT / 2 + (0.012 if e % 2 else 0))
        # Bass: Grundton, Oktave, Quinte, vorgezogen auf die Eins des nächsten Takts
        pat = [(0, 0, 0.45), (0.75, 12, 0.2), (1.5, 7, 0.4), (2.5, 0, 0.3), (3.0, 10, 0.25), (3.5, 12, 0.4)]
        for at, iv, d in pat:
            put(bas, bass(root + iv, d), t0 + at * BEAT)
        # E-Piano: Akzente auf den Offbeats
        for at in (0.5, 1.5, 2.75, 3.5):
            put(keys, epiano(chord, 0.45), t0 + at * BEAT)
    music = drums * 0.8 + bas + keys

    # Lautstärkekurve: Musik aus in Rückblenden und für kurze Comedy-Stille nach Pointen
    gain = np.ones(n)
    def mute(a, b, fade=0.08):
        ia, ib = int(max(0, a) * SR), int(min(dur, b) * SR)
        if ib <= ia:
            return
        nf = int(fade * SR)
        gain[ia:ib] = 0.0
        gain[max(0, ia - nf):ia] *= np.linspace(1, 0, ia - max(0, ia - nf))
        gain[ib:ib + nf] *= np.linspace(0, 1, len(gain[ib:ib + nf]))
    shots = [(s["t"], s["s"]) for l in lines for s in l["shots"]]
    shots.sort()
    for i, (t, s) in enumerate(shots):
        if s.startswith("cut:"):
            end = shots[i + 1][0] if i + 1 < len(shots) else dur
            mute(t, end)
    for l in lines:
        if l["text"].startswith("Oh, Barb") or l["text"].startswith("With honors"):
            mute(l["start"] - 0.15, l["end"] + 0.6)
    # Einstieg mit dem Titel, Ausklang nach der letzten Zeile
    fin = lines[-1]["end"] + 4.0
    gain[int(fin * SR):] *= 0
    music = music * gain
    music /= max(1e-6, np.abs(music).max())
    sf.write(ROOT / "audio" / "music.wav", (music * 0.8).astype(np.float32), SR)
    print(f"audio/music.wav: {dur:.2f} s, {nbars} Takte")


if __name__ == "__main__":
    main()
