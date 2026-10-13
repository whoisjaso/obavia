"""Stage 1 (python3, numpy): the hammer's cloud, one density grid per frame.

  python3 build_clouds.py WORK [frames, default 0-23]

The cloud rig's own field (`tools/cloud-3d/field.py`, button_density, read
only) with its own seed, pressed by the gavel and puffing (timing.puff_params).
Writes WORK/clouds/hammer-<frame>.npy (float16) and a .json with lo, hi, res
and `top`, the crown height above the base at the middle (where the head lands).
"""
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "cloud-3d"))
sys.path.insert(0, HERE)
import field  # noqa: E402
import timing  # noqa: E402

if __name__ == "__main__":
    work = sys.argv[1]
    a, b = (int(v) for v in (sys.argv[2] if len(sys.argv) > 2 else "0-23").split("-"))
    C = timing.HAMMER_CLOUD
    res = tuple(int(round((C["hi"][i] - C["lo"][i]) / C["vox"])) + 1 for i in range(3))
    hi = tuple(C["lo"][i] + (res[i] - 1) * C["vox"] for i in range(3))
    P = field.grid_points(C["lo"], hi, res)
    os.makedirs(os.path.join(work, "clouds"), exist_ok=True)
    for f in range(a, b + 1):
        out = os.path.join(work, "clouds", f"hammer-{f:02d}.npy")
        if os.path.exists(out):
            continue
        t = time.time()
        d = field.button_density(P, C["seed"], timing.puff_params(f)).reshape(res)
        # a soft window so no wisp ever meets the wall of the grid
        win = 1.0
        for ax in range(3):
            n = res[ax]
            u = np.minimum(np.arange(n), np.arange(n)[::-1]) / (0.06 * n)
            w = np.clip(u, 0, 1)
            w = w * w * (3 - 2 * w)
            sh = [1, 1, 1]
            sh[ax] = n
            win = win * w.reshape(sh)
        d = d * win
        xs = np.linspace(C["lo"][0], hi[0], res[0]); zs = np.linspace(C["lo"][2], hi[2], res[2])
        mid = np.abs(xs) < 0.3
        col = d[mid].max(axis=(0, 1))
        top = float(zs[np.nonzero(col > 0.35)[0].max()]) - C["base"]
        np.save(out, d.astype(np.float16))
        json.dump(dict(lo=C["lo"], hi=hi, res=res, top=top, params=timing.puff_params(f)), open(out + ".json", "w"))
        print(f"cloud hammer {f:02d} {res} top {top:.3f} {time.time() - t:.1f} s", flush=True)
