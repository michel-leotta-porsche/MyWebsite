"""Soundeffekte aus reiner Mathematik plus Mischung mit dem Voiceover.

Liest audio/voiceover.wav und data/lyrics.json, schreibt audio/mix.wav (−14 LUFS).
Die Einsätze kommen aus denselben Daten wie die Bilder (Einstellungen `shots`, Wortzeiten),
deshalb laufen Ton und Bild auch nach einem neuen Voiceover synchron.

Aufruf (aus video/):  python -m uv run --no-project --with numpy --with soundfile python analysis/sfx.py
"""

import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 24000
rng = np.random.default_rng(7)


def t_(n):
    return np.arange(n) / SR


def env_adsr(n, a=0.005, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cut):
    # einfacher Einpol-Tiefpass
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def pluck(freq, dur=0.6):
    """Karplus-Strong: gezupfte Saite (Ukulele-artig)."""
    n = int(dur * SR)
    p = int(SR / freq)
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * 0.6


def jingle():
    notes = [(0.0, 392.0), (0.16, 523.25), (0.32, 659.25), (0.48, 783.99), (0.72, 1046.5)]
    out = np.zeros(int(1.6 * SR))
    for st, f in notes:
        s = pluck(f, 0.8)
        i = int(st * SR)
        out[i:i + len(s)] += s[: len(out) - i]
    return out * 0.7


def sad_trombone():
    """Wah, wah, wah, waaah: Sägezahn mit Vibrato, gedämpft."""
    notes = [(311.1, 0.38), (293.7, 0.38), (277.2, 0.38), (261.6, 1.2)]
    parts = []
    for i, (f, d) in enumerate(notes):
        n = int(d * SR)
        tt = t_(n)
        vib = 1 + (0.012 if i == 3 else 0.004) * np.sin(2 * np.pi * 5.5 * tt) * np.minimum(1, tt * 3)
        bend = 1 - (0.03 * tt / d if i == 3 else 0)
        ph = np.cumsum(f * vib * bend / SR)
        saw = 2 * (ph % 1) - 1
        e = env_adsr(n, 0.04, 0.12 if i < 3 else 0.5)
        # „Wah“: Filter öffnet sich am Notenanfang
        parts.append(lowpass(saw * e, 900) * 0.9)
    return np.concatenate(parts)


def whoosh(d=0.35):
    n = int(d * SR)
    x = rng.standard_normal(n)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    return lowpass(x * e, 1800) * 0.5


def scribble(d=1.8):
    """Filzstift auf Papier: Rauschen in kurzen Strichen."""
    n = int(d * SR)
    x = rng.standard_normal(n)
    hp = x - lowpass(x, 2500)
    tt = t_(n)
    strokes = (np.sin(2 * np.pi * 6.5 * tt + 3 * np.sin(2 * np.pi * 1.3 * tt)) > -0.2).astype(float)
    strokes = lowpass(strokes, 40)
    return hp * strokes * env_adsr(n, 0.02, 0.1) * 0.28


def ding(f=1318.5, d=0.9):
    n = int(d * SR)
    tt = t_(n)
    s = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) + 0.15 * np.sin(2 * np.pi * 3.01 * f * tt)
    return s * np.exp(-tt * 5) * 0.35


def crickets(d=3.0):
    n = int(d * SR)
    out = np.zeros(n)
    tt = t_(int(0.045 * SR))
    chirp = np.sin(2 * np.pi * 4600 * tt) * np.sin(np.pi * np.linspace(0, 1, len(tt)))
    for k in range(int(d / 0.55)):
        base = int((0.1 + k * 0.55) * SR)
        for j in range(3):
            i = base + int(j * 0.065 * SR)
            if i + len(chirp) < n:
                out[i:i + len(chirp)] += chirp
    return out * 0.18


def power_hum(d=2.4):
    """Steigendes Brummen, dann Strom weg."""
    n = int(d * SR)
    tt = t_(n)
    f = 60 + 180 * (tt / d) ** 2
    ph = np.cumsum(f / SR)
    s = np.sign(np.sin(2 * np.pi * ph)) * 0.5 + np.sin(2 * np.pi * 2 * ph) * 0.3
    s = lowpass(s, 1200) * np.minimum(1, tt * 2)
    cut = int((d - 0.35) * SR)
    s[cut:] *= np.linspace(1, 0, n - cut) ** 3
    return s * 0.35


def slide_whistle(d=0.5, up=True):
    n = int(d * SR)
    tt = t_(n)
    f = (700 + 900 * (tt / d)) if up else (1600 - 900 * (tt / d))
    ph = np.cumsum(f / SR)
    return np.sin(2 * np.pi * ph) * env_adsr(n, 0.03, 0.08) * 0.25


def stamp():
    n = int(0.25 * SR)
    tt = t_(n)
    s = np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 25) + rng.standard_normal(n) * np.exp(-tt * 60) * 0.4
    return s * 0.6


def crash():
    """Metallstuhl auf Linoleum: Rumms plus Scheppern."""
    n = int(0.7 * SR)
    tt = t_(n)
    thud = np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 18)
    clang = sum(np.sin(2 * np.pi * f * tt) for f in (523, 811, 1307, 1999)) * np.exp(-tt * 9) * 0.18
    noise = rng.standard_normal(n) * np.exp(-tt * 30) * 0.4
    return (thud + clang + noise) * 0.7


def confetti_pop():
    n = int(0.3 * SR)
    tt = t_(n)
    return (rng.standard_normal(n) * np.exp(-tt * 40) * 0.6 + np.sin(2 * np.pi * 160 * tt) * np.exp(-tt * 25)) * 0.6


def bling():
    return ding(2093.0, 0.5) * 0.8 + np.concatenate([np.zeros(int(0.06 * SR)), ding(2637.0, 0.45) * 0.6])[: int(0.5 * SR)]


def rattle(d=2.2):
    n = int(d * SR)
    x = rng.standard_normal(n)
    tt = t_(n)
    trem = (np.sin(2 * np.pi * 22 * tt) > 0).astype(float)
    return lowpass(x * trem, 3000) * env_adsr(n, 0.05, 0.4) * 0.22


def main():
    voice, sr = sf.read(ROOT / "audio" / "voiceover.wav", dtype="float32")
    assert sr == SR
    lines = json.loads((ROOT / "data" / "lyrics.json").read_text())["lines"]
    n = len(voice)
    fx = np.zeros(n)

    def put(sig, at, db=0.0):
        i = int(max(0, at) * SR)
        if i >= n:
            return
        m = min(len(sig), n - i)
        fx[i:i + m] += sig[:m] * 10 ** (db / 20)

    def line(prefix):
        return next(l for l in lines if l["text"].startswith(prefix))

    def word(l, w):
        return next(x for x in l["words"] if x["w"].strip("“”.,!?") == w)

    put(jingle(), 0.15, -3)
    # Einstellungen: Gags bekommen einen Papier-Wisch, Flipchart-Schreiben ein Kratzen
    for l in lines:
        for s in l["shots"]:
            if s["s"].startswith("cut:"):
                put(whoosh(), s["t"] - 0.12, -6)
            if s["s"] == "flip":
                put(scribble(1.9), s["t"] + 0.3, -4)
    put(sad_trombone(), line("I let Claude")["end"] + 0.08, -4)
    barb = line("I'm Barb")
    put(bling(), word(barb, "better")["start"], -8)
    put(bling(), word(barb, "Better")["start"], -4)
    put(bling(), word(barb, "Better")["start"] + 0.18, -6)
    pri = line("Priya. My session")
    put(crickets(pri["end"] - word(pri, "My")["start"] + 0.5), word(pri, "My")["start"], -6)
    ty = line("Also. I set effort")
    put(power_hum(ty["end"] - word(ty, "In")["start"] + 0.6), word(ty, "In")["start"], -7)
    sc = line("My CLAUDE.md")
    put(rattle(sc["end"] - word(sc, "is")["start"] + 0.5), word(sc, "is")["start"], -6)
    hw = line("I let it grade")
    put(stamp(), hw["end"] - 0.15, -3)
    put(ding(1567.98), line("With honors")["end"] + 0.05, -6)
    # Kevin kippt mit dem Stuhl um
    put(slide_whistle(0.4, up=False), line("With honors")["end"] + 0.2, -6)
    put(crash(), line("With honors")["end"] + 0.62, -2)
    on = line("I'm on the list")
    put(slide_whistle(0.45), on["start"] - 0.05, -6)
    put(ding(), line("Fine. Bonus")["end"] - 0.2, -4)
    put(confetti_pop(), lines[-1]["start"] - 0.05, -2)
    put(jingle(), lines[-1]["end"] + 0.9, -4)
    # leises Raumrauschen gegen digitale Stille
    room = lowpass(rng.standard_normal(n), 300) * 0.006
    # Ducking: Effekte unter der Stimme leiser (bis −7 dB)
    hop = SR // 100
    k = n // hop
    env = np.sqrt(np.mean(voice[: k * hop].reshape(k, hop) ** 2, axis=1))
    env = np.clip(env / (np.percentile(env, 95) + 1e-6), 0, 1)
    env = np.repeat(lowpass(env.astype(float), 3), hop)
    env = np.pad(env, (0, n - len(env)), constant_values=0)
    duck = 10 ** (-7 * env / 20)
    # Musikbett (analysis/music.py), unter der Stimme bis −10 dB abgesenkt
    mpath = ROOT / "audio" / "music.wav"
    music = np.zeros(n)
    if mpath.exists():
        m, _ = sf.read(mpath, dtype="float32")
        music[: min(n, len(m))] = m[:n]
    mduck = 10 ** (-10 * env / 20)
    mix = voice + (fx * duck + music * 0.22 * mduck + room)
    out = ROOT / "audio" / "mix_raw.wav"
    sf.write(out, mix.astype(np.float32), SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(out), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "2", str(ROOT / "audio" / "mix.wav")], check=True)
    out.unlink()
    print("audio/mix.wav geschrieben")


if __name__ == "__main__":
    main()
