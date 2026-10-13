"""Stage 2 (Blender bpy): render the car objects into linear light-group passes.

  python render_objects.py WORK NAME WIDTH SAMPLES [--frames=23|0-23|all] [--tag=final] [--clay]

Writes WORK/<tag>/<NAME>/<frame>.npz (float16 key, rim, sky, page, alpha,
catcher, index). WIDTH is the master width; the height follows the object's
aspect. Skips frames already on disk (resumable). Cloud grids for the hammer
come from build_clouds.py (WORK/clouds/hammer-<frame>.npy).
"""
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

import objects  # noqa: E402
import rig  # noqa: E402

MARGIN = 0.86   # the box fills this much of the frame


def fit(box, az, elev, lens, w, h):
    """Distance and lens shift so the 8 corners of box fit MARGIN of the
    frame, centred. Pure geometry: same inputs, same camera."""
    lo, hi = Vector(box[0]), Vector(box[1])
    tgt = (lo + hi) / 2
    d = Vector((math.cos(math.radians(elev)) * math.sin(math.radians(az)),
                -math.cos(math.radians(elev)) * math.cos(math.radians(az)),
                math.sin(math.radians(elev))))
    f = -d
    r = f.cross(Vector((0, 0, 1))).normalized()
    u = r.cross(f)
    corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    tw = 18.0 / lens
    th = tw * h / w

    def spans(D):
        C = tgt + d * D
        xs, ys = [], []
        for p in corners:
            q = p - C
            z = q.dot(f)
            xs.append(q.dot(r) / z)
            ys.append(q.dot(u) / z)
        return min(xs), max(xs), min(ys), max(ys)

    a, b = 0.5, 400.0
    for _ in range(80):
        m = (a + b) / 2
        x0, x1, y0, y1 = spans(m)
        if (x1 - x0) / 2 <= tw * MARGIN and (y1 - y0) / 2 <= th * MARGIN:
            b = m
        else:
            a = m
    x0, x1, y0, y1 = spans(b)
    shift = ((x0 + x1) / 2 / (2 * tw), (y0 + y1) / 2 / (2 * tw))
    return tgt, b, shift


def frames_of(spec, arg):
    n = spec.get("frames")
    if arg in ("all",):
        return list(range(n)) if n else [23]
    if "-" in arg:
        a, b = (int(v) for v in arg.split("-"))
        return [f for f in range(a, b + 1) if n or f == 23]
    return [int(v) for v in arg.split(",")]


def load_cloud(work, frame):
    p = os.path.join(work, "clouds", f"hammer-{frame:02d}.npy")
    meta = json.load(open(p + ".json"))
    meta["dens"] = np.load(p).astype(np.float32)
    return meta


def main():
    work, name, width, samples = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    opts = dict(a[2:].split("=", 1) for a in sys.argv[5:] if a.startswith("--") and "=" in a)
    clay = "--clay" in sys.argv
    spec = objects.OBJECTS[name]
    W0, H0 = spec["size"]
    height = int(round(width * H0 / W0))
    tag = opts.get("tag", "final")
    out_dir = os.path.join(work, tag, name)
    os.makedirs(out_dir, exist_ok=True)
    for fr in frames_of(spec, opts.get("frames", "23")):
        out = os.path.join(out_dir, f"{fr:02d}.npz")
        if os.path.exists(out):
            continue
        t0 = time.time()
        rig.setup(width, height, samples, motion_blur=spec.get("blur", False))
        if spec.get("cloud"):
            spec["build"](fr, cloud_grid=None if clay else load_cloud(work, fr))
        else:
            spec["build"](fr)
        az, elev, lens = spec["cam"]
        tgt, dist, shift = fit(spec["box"], az, elev, lens, width, height)
        rig.camera(tgt, az, elev, dist, lens, shift)
        if clay:
            cm = bpy.data.materials.new("clay")
            cm.diffuse_color = (0.7, 0.7, 0.7, 1)
            bpy.context.view_layer.material_override = cm
        t = rig.render(out)
        print(f"render {name} {fr:02d} {width}x{height} {samples}spp {t:.1f} s (total {time.time() - t0:.1f} s)", flush=True)


if __name__ == "__main__":
    main()
