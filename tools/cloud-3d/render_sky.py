"""Stage 2b (Blender bpy): render the three sky layers.

  python render_sky.py WORK WIDTH SPP [--layers=far,mid,near]
An orthographic camera spans exactly one period of a field that is periodic
in x, so the left and right edges of every layer meet without a seam.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402
import scene  # noqa: E402

DENSITY = dict(far=50.0, mid=40.0, near=22.0)   # nearer layers are softer
DETAIL = dict(far=(0.0, 0.0), mid=(9.0, 0.30), near=(5.0, 0.30))
OVERLAP = 1.0 / 32.0        # 64 px at 2048: the wrap's crossfade band

if __name__ == "__main__":
    work, width, spp = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    layers = ["far", "mid", "near"]
    for a in sys.argv[4:]:
        if a.startswith("--layers="):
            layers = a.split("=")[1].split(",")
    S = field.SKY
    for layer in layers:
        out = os.path.join(work, f"sky-{layer}-{width}.npz")
        if os.path.exists(out):
            continue
        meta = json.load(open(os.path.join(work, f"sky-{layer}.npy.json")))
        d = np.load(os.path.join(work, f"sky-{layer}.npy")).astype(np.float32)
        # one period plus an overlap of OVERLAP of the width each side: the field is
        # periodic, but the shader's detail noise, the pixel filter and the denoiser
        # are not, so post.py crossfades the overlap into the wrap (see README)
        ov = int(round(width * OVERLAP))
        w2 = width + 2 * ov
        t = scene.render_grid(d, tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"]), out,
                              w2, width // 2, S["period"] * w2 / width, (0.0, S["zc"]),
                              samples=spp, density_scale=DENSITY[layer], anisotropy=0.45,
                              bounces=10, step_rate=2.0, detail=DETAIL[layer])
        with open(out[:-4] + ".json", "w") as fh:
            json.dump(dict(width=width, overlap=ov), fh)
        print(f"render sky {layer} {width}px (+{ov} each side) {spp}spp {t:.1f} s", flush=True)
