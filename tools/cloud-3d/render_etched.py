"""Stage 2d (Blender bpy): the etched-label reference (not shipped in the
sprites; labels vary per screen). The rest grid (frame 23) with the label
carved into its front surface in the volume shader, lit by the same sun.

  python render_etched.py WORK WIDTH SPP
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402
import scene  # noqa: E402
from render_button import DENSITY, ANISO, DETAIL  # noqa: E402

if __name__ == "__main__":
    work, width, spp = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    out = os.path.join(work, f"etched-{width}.npz")
    if os.path.exists(out):
        sys.exit(0)
    B = field.BUTTON
    meta = json.load(open(os.path.join(work, "button-23.npy.json")))
    d = np.load(os.path.join(work, "button-23.npy")).astype(np.float32)
    e = dict(np.load(os.path.join(work, "etch.npz")))
    etch = dict(mask_png=os.path.abspath(os.path.join(work, "etch-mask.png")),
                front_png=os.path.abspath(os.path.join(work, "etch-front.png")),
                **{k: float(e[k]) for k in ("x0", "x1", "z0", "z1", "depth", "feather", "fmin", "fscale")})
    t = scene.render_grid(d, tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"]), out,
                          width, int(round(width / B["aspect"])), B["ortho"], B["center"],
                          samples=spp, density_scale=DENSITY, anisotropy=ANISO, bounces=12,
                          step_rate=1.0, detail=DETAIL, etch=etch)
    print(f"render etched {width}px {spp}spp {t:.1f} s", flush=True)
