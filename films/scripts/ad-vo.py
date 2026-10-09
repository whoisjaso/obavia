"""Voice-over for the Obavia ad, synthesised offline with Kokoro (am_michael).
Each line is its own file so it can sit exactly on its beat; durations go to
public/vo/ad/vo.json, which the picture and the score both read.

    python3 scripts/ad-vo.py /path/to/kokoro.onnx /path/to/voices.npz
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "vo", "ad")
FPS = 60
# (id, frame it starts on, text, speed)
LINES = [
    ("buy", 6, "You buy the car.", 1.22),
    ("photos", 60, "Photos.", 1.5), ("listings", 90, "Listings.", 1.5), ("leads", 120, "Leads.", 1.5),
    ("paperwork", 150, "Paperwork.", 1.5), ("title", 180, "Title.", 1.5), ("payments", 210, "Payments.", 1.5),
    ("onecar", 242, "One car.", 1.35), ("every", 270, "Every channel.", 1.25),
    ("forms", 327, "Every form, filled and signed.", 1.25),
    ("close", 444, "You close the deal.", 0.98),
    ("else", 552, "Everything else?", 1.0),
    ("obavia", 632, "Obavia.", 0.95),
    ("handled", 738, "The work in between, handled.", 1.0),
]

def trim(x, sr, thresh=0.008):
    idx = np.where(np.abs(x) > thresh)[0]
    if not len(idx): return x
    a = max(0, idx[0] - int(0.01 * sr)); z = min(len(x), idx[-1] + int(0.04 * sr))
    return x[a:z]

def main():
    k = Kokoro(sys.argv[1], sys.argv[2])
    os.makedirs(OUT, exist_ok=True)
    meta = []
    for id_, at, text, speed in LINES:
        y, sr = k.create(text, voice="am_michael", speed=speed, lang="en-us")
        y = trim(np.asarray(y, dtype=np.float32), sr)
        sf.write(os.path.join(OUT, f"{id_}.wav"), y, sr, subtype="PCM_16")
        meta.append({"id": id_, "at": at, "text": text, "sec": round(len(y) / sr, 3), "sr": sr})
        print(f"{id_:10s} at {at/FPS:5.2f}s  {len(y)/sr:4.2f}s  {text}")
    json.dump(meta, open(os.path.join(OUT, "vo.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
