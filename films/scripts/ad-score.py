"""Score for the 15-second Obavia ad: a light 120 bpm kit, swishes on the
text morphs, a riser into the mark, one impact, an airy pad. Everything is
synthesised here, cued from src/ad/timeline.ts. Writes public/sfx/ad/mix.wav
at -14 LUFS, true peak -1.5 dBTP (a short social ad sits louder than a film).

    python3 scripts/ad-score.py
"""
import json, os, subprocess
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "public", "sfx", "ad")
R = np.random.default_rng(11)

def env(n, a, d): x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def hp(x, hz, o=2): return signal.sosfilt(signal.butter(o, hz, "high", fs=SR, output="sos"), x)
def lp(x, hz, o=2): return signal.sosfilt(signal.butter(o, hz, "low", fs=SR, output="sos"), x)
def norm(x, p=0.9): return x / (np.max(np.abs(x)) + 1e-9) * p
def noise(n): return R.standard_normal(n)

def kick():
    n = int(0.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.16)
    click = hp(noise(n), 2500) * env(n, 0.0002, 0.004) * 0.35
    return norm(np.tanh(1.6 * (body + click)))

def snare():
    n = int(0.3 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    hiss = bp(noise(n), 1500, 9000) * env(n, 0.001, 0.09)
    clap = sum(np.roll(bp(noise(n), 900, 3000) * env(n, 0.0005, 0.012), int(k * 0.009 * SR)) for k in range(3))
    return norm(0.5 * tone + hiss + 0.6 * clap)

def hat():
    n = int(0.08 * SR)
    return norm(hp(noise(n), 7000) * env(n, 0.0005, 0.018), 0.6)

def swish():
    n = int(0.22 * SR); t = np.arange(n) / SR
    sweep = np.zeros(n); x = noise(n)
    for i, c in enumerate(np.linspace(1800, 6500, 6)):
        seg = slice(i * n // 6, (i + 1) * n // 6); sweep[seg] = bp(x, c * 0.7, c * 1.3)[seg]
    return norm(sweep * np.sin(np.pi * t / t[-1]) ** 2, 0.55)

def whoosh(dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(hp(noise(n), 300), 5000)
    shape = (t / t[-1]) ** 2.2 * np.exp(-np.maximum(0, t - t[-1] * 0.9) / 0.02)
    return norm(x * shape, 0.8)

def tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * 2400 * t) * env(n, 0.0003, 0.008) + 0.4 * hp(noise(n), 4000) * env(n, 0.0002, 0.003), 0.5)

def pop():
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t / 0.03) + 300
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.035), 0.55)

def sub():
    n = int(1.8 * SR); t = np.arange(n) / SR
    return norm(np.sin(2 * np.pi * 49 * t) * np.minimum(1, t / 0.05) * np.exp(-t / 0.7), 0.8)

def pad(dur=2.6):
    n = int(dur * SR); t = np.arange(n) / SR
    chord = [329.6, 415.3, 493.9, 659.3]                          # E major, open and bright
    y = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t) * 0.6) * (0.9 ** k) for k, f in enumerate(chord))
    y += 0.25 * sum(np.sin(2 * np.pi * f * 2.003 * t) for f in chord[:2])
    shape = np.minimum(1, t / 0.35) * np.exp(-np.maximum(0, t - 0.6) / 1.1)
    return norm(lp(y, 4000) * shape, 0.5)

def riser(dur=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * (12 ** (t / t[-1]))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    air = bp(noise(n), 2000, 12000) * 0.7
    return norm((tone + air) * (t / t[-1]) ** 2.5, 0.75)

def impact():
    n = int(2.2 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-t / 0.08)) / SR) * env(n, 0.001, 0.6)
    crash = hp(noise(n), 3000) * env(n, 0.001, 0.5) * 0.35
    return norm(np.tanh(1.4 * (boom + crash)))

MAKE = {"kick": (kick, 0.9), "snare": (snare, 0.55), "hat": (hat, 0.22), "swish": (swish, 0.35), "whoosh": (lambda: whoosh(0.45), 0.5),
        "tick": (tick, 0.3), "pop": (pop, 0.3), "sub": (sub, 0.6), "pad": (pad, 0.32), "riser": (lambda: riser(0.98), 0.45), "impact": (impact, 0.9)}

def room(x):
    n = int(0.6 * SR)
    ir = noise(n) * np.exp(-np.arange(n) / SR / 0.14); ir = lp(ir, 6000); ir[: int(0.006 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    return x + 0.12 * signal.fftconvolve(x, ir)[: len(x)]

def last_json(text):
    i = text.rindex("{"); return json.loads(text[i:text.index("}", i) + 1])

def main():
    d = json.loads(subprocess.check_output(["npx", "tsx", os.path.join(HERE, "ad-hits.ts")], cwd=ROOT))
    total = int(d["seconds"] * SR); mix = np.zeros(total)
    cache = {}
    for h in d["hits"]:
        fn, g = MAKE[h["kind"]]
        y = cache.setdefault(h["kind"], fn()) * g
        if h["kind"] == "whoosh": i = int(h["f"] / d["fps"] * SR) - len(y) + int(0.04 * SR)   # whooshes land on their frame
        elif h["kind"] == "riser": i = int(h["f"] / d["fps"] * SR)
        else: i = int(h["f"] / d["fps"] * SR)
        i = max(0, i); j = min(total, i + len(y)); mix[i:j] += y[: j - i]
    mix = room(mix)
    fade = np.ones(total); fade[-int(0.5 * SR):] = np.linspace(1, 0, int(0.5 * SR)) ** 2; mix *= fade
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(OUT, "_raw.wav"); sf.write(tmp, np.stack([mix, mix], 1).astype(np.float32), SR, subtype="FLOAT")
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = last_json(probe)
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:print_format=json")
    r = last_json(subprocess.run(["ffmpeg", "-hide_banner", "-y", "-i", tmp, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le", os.path.join(OUT, "mix.wav")], capture_output=True, text=True).stderr)
    os.remove(tmp)
    print(f"in {m['input_i']} LUFS / {m['input_tp']} dBTP -> out {r['output_i']} LUFS / {r['output_tp']} dBTP ({r['normalization_type']})")

if __name__ == "__main__":
    main()
