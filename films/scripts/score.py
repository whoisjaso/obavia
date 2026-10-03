"""Scores for the phone films: the phone's own sounds in one small room.

Reads a film's cues from its timeline (via scripts/cues.ts) so the sound sits
on the picture's own beats. Every sound is synthesised here: no recordings,
no Apple audio. Writes public/sfx/<film>/mix.wav at -16 LUFS, true peak
-3.5 dBTP.

    python3 scripts/score.py evening
    python3 scripts/score.py pain
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
import soundfile as sf

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FILM = sys.argv[1] if len(sys.argv) > 1 else "evening"
OUT = os.path.join(ROOT, "public", "sfx", FILM)
rng = np.random.default_rng(7)

def t(sec): return np.arange(int(sec * SR)) / SR
def env(n, a, d):
    """Attack in seconds, then an exponential decay with time constant d."""
    x = np.arange(n) / SR
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def lp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak

def click(body_hz, bright_lo, bright_hi, length=0.045, body=0.55, seed=0):
    """A key: a bright tick of filtered noise over a short woody body."""
    r = np.random.default_rng(seed)
    n = int(length * SR)
    tick = bp(r.standard_normal(n), bright_lo, bright_hi) * env(n, 0.0004, 0.004)
    x = np.arange(n) / SR
    wood = np.sin(2 * np.pi * body_hz * x) * env(n, 0.0008, 0.009)
    return norm(tick + body * norm(wood))

def key(v=0):
    # slight variation per press, as a real keyboard never repeats exactly
    return click(820 + 37 * (v % 4), 2600, 6800, seed=v)

def delete(v=0):
    # the delete key sits lower and a touch longer
    return click(560, 1700, 4800, length=0.06, body=0.75, seed=40 + v)

def tap(v=0):
    # a finger on glass: soft, low, short
    c = click(420, 900, 3000, length=0.04, body=0.9, seed=80 + v)
    return lp(c, 3500) * 0.7

def lock(v=0):
    """The side button: two mechanical transients a few ms apart."""
    n = int(0.12 * SR)
    out = np.zeros(n)
    for k, (at, hz, g) in enumerate([(0.0, 1250 if v == 0 else 1100, 1.0), (0.007, 380 if v == 0 else 330, 0.8)]):
        i = int(at * SR); m = n - i
        noise = bp(np.random.default_rng(100 + k + 10 * v).standard_normal(m), hz * 0.6, hz * 2.4) * env(m, 0.0003, 0.006)
        x = np.arange(m) / SR
        thunk = np.sin(2 * np.pi * hz * 0.5 * x) * env(m, 0.0005, 0.012)
        out[i:] += g * (norm(noise) + 0.6 * norm(thunk))
    return norm(out)

def tone(hz, dur, decay, partials=((1, 1.0), (2.0, 0.28), (3.01, 0.12), (4.2, 0.05))):
    x = t(dur); y = np.zeros_like(x)
    for ratio, g in partials:
        y += g * np.sin(2 * np.pi * hz * ratio * x) * np.exp(-x / (decay / ratio ** 0.7))
    return y * np.minimum(1, x / 0.002)

def note(v=0):
    """The notification: two soft glass notes, a fifth apart; v 1 up a step; v 2 (mail) falls a fourth."""
    a, b = [(1318.5, 1975.5), (1480.0, 2217.5), (1568.0, 1174.7)][v % 3]
    out = np.zeros(int(0.9 * SR))
    for at, hz, g in [(0.0, a, 0.8), (0.085, b, 1.0)]:
        y = tone(hz, 0.9 - at, 0.22) * g
        i = int(at * SR); out[i:i + len(y)] += y
    return norm(out)

def done(v=0):
    """Done: a rising third, and the haptic's two pulses under it."""
    out = np.zeros(int(1.1 * SR))
    for at, hz, g in [(0.0, 987.8, 0.75), (0.07, 1244.5, 0.8), (0.14, 1480.0, 1.0)]:
        y = tone(hz, 1.1 - at, 0.32) * g
        i = int(at * SR); out[i:i + len(y)] += y
    out = norm(out, 0.8)
    for at in (0.0, 0.1):                       # the haptic, felt more than heard
        m = int(0.05 * SR); x = np.arange(m) / SR
        buzz = np.sin(2 * np.pi * 165 * x) * np.sin(np.pi * x / 0.05) ** 2
        i = int(at * SR); out[i:i + m] += 0.55 * buzz
    return norm(out)

def buzz(v=0):
    """The phone vibrating on a desk: pulses of motor hum with a wooden rattle."""
    pulses = 2 if v == 0 else 3
    out = np.zeros(int((0.42 * pulses) * SR))
    for k in range(pulses):
        m = int(0.3 * SR); x = np.arange(m) / SR
        shape = np.minimum(1, x / 0.02) * np.minimum(1, (0.3 - x) / 0.04)
        motor = np.sin(2 * np.pi * 172 * x + 0.6 * np.sin(2 * np.pi * 11 * x))
        rattle = bp(np.random.default_rng(200 + k).standard_normal(m), 600, 2400) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 172 * x)))
        i = int(k * 0.42 * SR); out[i:i + m] += shape * (motor + 0.35 * norm(rattle))
    return norm(out)

MAKE = {"key": key, "del": delete, "tap": tap, "lock": lock, "note": note, "done": done, "buzz": buzz}
GAIN = {"key": 0.5, "del": 0.5, "tap": 0.32, "lock": 0.7, "note": 0.55, "done": 0.62, "buzz": 0.42}

def room(x):
    """One small room for everything: a short, dark, diffuse tail."""
    n = int(0.45 * SR)
    ir = np.random.default_rng(3).standard_normal(n) * np.exp(-np.arange(n) / SR / 0.09)
    ir = lp(ir, 5200); ir[: int(0.004 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return x + 0.16 * wet

def last_json(text):
    """loudnorm prints its JSON block, then more log lines."""
    i = text.rindex("{"); return json.loads(text[i:text.index("}", i) + 1])

def main():
    cues = json.loads(subprocess.check_output(["npx", "tsx", os.path.join(HERE, "cues.ts"), FILM], cwd=ROOT))
    total = int(cues["seconds"] * SR)
    dry = np.zeros(total)
    os.makedirs(OUT, exist_ok=True)
    for kind, fn in MAKE.items():                # each sound on its own, for auditioning
        sf.write(os.path.join(OUT, f"{kind}.wav"), (fn(0) * 0.8).astype(np.float32), SR, subtype="PCM_16")
    for c in cues["cues"]:
        y = MAKE[c["kind"]](c.get("v", 0)) * GAIN[c["kind"]]
        i = int(c["t"] * SR); j = min(total, i + len(y))
        dry[i:j] += y[: j - i]
    mix = room(dry)
    mix = np.stack([mix, mix], 1)               # a phone in the room is mono; both sides carry it
    tmp = os.path.join(OUT, "_raw.wav"); sf.write(tmp, mix.astype(np.float32), SR, subtype="FLOAT")
    # two-pass loudnorm, linear, so the dynamics stay as written
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "loudnorm=I=-16:TP=-3.5:LRA=11:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    m = last_json(probe)
    af = (f"loudnorm=I=-16:TP=-3.5:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
          f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:print_format=json")
    res = subprocess.run(["ffmpeg", "-hide_banner", "-y", "-i", tmp, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le", os.path.join(OUT, "mix.wav")],
                         capture_output=True, text=True).stderr
    r = last_json(res)
    os.remove(tmp)
    print(f"in {m['input_i']} LUFS / {m['input_tp']} dBTP -> out {r['output_i']} LUFS / {r['output_tp']} dBTP ({r['normalization_type']})")

if __name__ == "__main__":
    main()
