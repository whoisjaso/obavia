"""Stage 2a (Blender bpy): render the button frames from their grids.

  python render_button.py WORK WIDTH SPP [--frames=0,1,...]
Writes WORK/button-NN.npz (linear premultiplied key, rim, sky, alpha).
Frame 23 is the rest state and frame 5 the pressed state.
"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402
import scene  # noqa: E402

DENSITY = 110.0     # extinction per scene unit at grid density 1
ANISO = 0.55        # forward scatter: the silver lining
DETAIL = (18.0, 0.62)

if __name__ == "__main__":
    work, width, spp = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    frames = list(range(24))
    for a in sys.argv[4:]:
        if a.startswith("--frames="):
            frames = [int(x) for x in a.split("=")[1].split(",")]
    B = field.BUTTON
    for f in frames:
        out = os.path.join(work, f"button-{f:02d}.npz")
        if os.path.exists(out):
            continue
        meta = json.load(open(os.path.join(work, f"button-{f:02d}.npy.json")))
        d = np.load(os.path.join(work, f"button-{f:02d}.npy")).astype(np.float32)
        p = meta["params"]
        sz = p["sy"] * (1.0 + (p["sxy"] - 1.0) * 0.6)
        t = scene.render_grid(d, tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"]), out,
                              width, int(round(width / B["aspect"])), B["ortho"], B["center"],
                              samples=spp, density_scale=DENSITY * 1.0, anisotropy=ANISO,
                              bounces=12, step_rate=2.0, detail=DETAIL,
                              detail_xform=(p["sxy"], sz, B["base"], 0.0, 0.0))
        print(f"render button {f:02d} {width}px {spp}spp {t:.1f} s", flush=True)
