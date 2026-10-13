"""Stage 2c (Blender bpy): the after-effect sprites, wisp and ring, rendered
from the same volume material and lights as the button.

  python render_fx.py WORK
Grids are built in WORK/fx-*.npy by build_fields.py fx.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402
import scene  # noqa: E402

SIZE = dict(wisp=256, ring=512)   # the @2x master; @1x is 128 and 256

if __name__ == "__main__":
    work = sys.argv[1]
    for name, px in SIZE.items():
        out = os.path.join(work, f"fx-{name}.npz")
        if os.path.exists(out):
            continue
        meta = json.load(open(os.path.join(work, f"fx-{name}.npy.json")))
        d = np.load(os.path.join(work, f"fx-{name}.npy")).astype(np.float32)
        t = scene.render_grid(d, tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"]), out,
                              px, px, field.FX["ortho"], (0.0, 0.0), samples=48, density_scale=60.0,
                              anisotropy=0.55, bounces=12, step_rate=1.5, detail=(14.0, 0.35))
        print(f"render fx {name} {px}px {t:.1f} s", flush=True)
