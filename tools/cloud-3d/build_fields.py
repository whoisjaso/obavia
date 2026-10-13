"""Stage 1 (python3 + numpy): build every density grid as float16 .npy.

  python3 build_fields.py WORK [button|sky|all] [--frames 0,5,23]
"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402

SEED = 1012


def res_of(lo, hi, vox):
    return tuple(int(round((hi[i] - lo[i]) / vox)) + 1 for i in range(3))


def button(work, frames):
    B = field.BUTTON
    res = res_of(B["lo"], B["hi"], B["vox"])
    P = field.grid_points(B["lo"], B["hi"], res)
    for f in frames:
        out = os.path.join(work, f"button-{f:02d}.npy")
        if os.path.exists(out):
            continue
        t = time.time()
        prm = field.press_params(f)
        d = field.button_density(P, SEED, prm).reshape(res)
        np.save(out, d.astype(np.float16))
        with open(out + ".json", "w") as fh:
            json.dump(dict(lo=B["lo"], hi=B["hi"], res=res, params=prm), fh)
        print(f"field button {f:02d} {res} {time.time() - t:.1f} s", flush=True)


def sky(work, layers):
    S = field.SKY
    for layer in layers:
        out = os.path.join(work, f"sky-{layer}.npy")
        if os.path.exists(out):
            continue
        t = time.time()
        lo, hi = field.sky_domain(layer, S["seed"][layer], S["period"])
        res = res_of(lo, hi, S["vox"][layer])
        hi = tuple(lo[i] + (res[i] - 1) * S["vox"][layer] for i in range(3))
        P = field.grid_points(lo, hi, res)
        d = field.sky_density(P, layer, S["seed"][layer], S["period"]).reshape(res)
        np.save(out, d.astype(np.float16))
        with open(out + ".json", "w") as fh:
            json.dump(dict(lo=lo, hi=hi, res=res), fh)
        print(f"field sky {layer} {res} {time.time() - t:.1f} s", flush=True)


def fx(work):
    F = field.FX
    res = res_of(F["lo"], F["hi"], F["vox"])
    P = field.grid_points(F["lo"], F["hi"], res)
    for name, fn in (("wisp", field.wisp_density), ("ring", field.ring_density)):
        out = os.path.join(work, f"fx-{name}.npy")
        if os.path.exists(out):
            continue
        t = time.time()
        d = fn(P, SEED).reshape(res)
        np.save(out, d.astype(np.float16))
        with open(out + ".json", "w") as fh:
            json.dump(dict(lo=F["lo"], hi=F["hi"], res=res), fh)
        print(f"field fx {name} {res} {time.time() - t:.1f} s", flush=True)


ETCH = dict(text="GET ON THE LANE", x0=-1.2, x1=1.2, z0=-0.45, z1=0.15, tex_w=2048,
            cap=0.118, depth=0.14, feather=0.03, threshold=0.06)


def etch(work):
    """Glyph mask and front-surface depth for the etched-label reference.
    The mask is the label in upright spaced capitals, centred in the safe
    rect; the front map is the y of the first voxel above `threshold`
    along the view axis, from the rest grid (frame 23)."""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    out = os.path.join(work, "etch.npz")
    if os.path.exists(out):
        return
    E, B = ETCH, field.BUTTON
    tw = E["tex_w"]
    th = int(round(tw * (E["z1"] - E["z0"]) / (E["x1"] - E["x0"])))
    upx = tw / (E["x1"] - E["x0"])                        # texture px per unit
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 400)
    # cap height of the font at 400 px, to scale to the target cap height
    bb = font.getbbox("E")
    size = int(round(400 * E["cap"] * upx / (bb[3] - bb[1])))
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    m = Image.new("L", (tw, th), 0)
    d = ImageDraw.Draw(m)
    track = 0.28 * size                                   # spaced capitals
    widths = [d.textlength(ch, font=font) for ch in E["text"]]
    total = sum(widths) + track * (len(E["text"]) - 1)
    # centre of the safe rect in world z: canvas fractions -> world
    S = (0.25, 0.52, 0.75, 0.74)
    top = B["center"][1] + B["ortho"] / B["aspect"] / 2
    zc = top - (S[1] + S[3]) / 2 * (B["ortho"] / B["aspect"])
    cb = font.getbbox("E")
    y = (E["z1"] - zc) * upx - (cb[1] + cb[3]) / 2
    x = (tw - total) / 2
    for ch, w in zip(E["text"], widths):
        d.text((x, y), ch, font=font, fill=255)
        x += w + track
    m = m.filter(ImageFilter.GaussianBlur(E["cap"] * upx * 0.035))
    mask = np.asarray(m).astype(np.float32) / 255.0
    g = np.load(os.path.join(work, "button-23.npy")).astype(np.float32)
    lo, hi, res = B["lo"], B["hi"], g.shape
    hit = g > E["threshold"]
    iy = np.where(hit.any(1), hit.argmax(1), res[1] - 1)    # (x, z)
    fy = lo[1] + iy * (hi[1] - lo[1]) / (res[1] - 1)
    gx = np.linspace(lo[0], hi[0], res[0]); gz = np.linspace(lo[2], hi[2], res[2])
    tx = np.linspace(E["x0"], E["x1"], tw); tz = np.linspace(E["z1"], E["z0"], th)
    a = np.stack([np.interp(tx, gx, fy[:, k]) for k in range(res[2])], 1)   # (tw, nz)
    front = np.stack([np.interp(tz, gz, a[i]) for i in range(tw)], 1)      # (th, tw)
    # 16-bit grayscale PNGs (Blender reads them as float, Non-Color); the
    # front map is encoded to 0..1 with an offset and scale kept in etch.npz
    fmin, fmax = float(front.min()), float(front.max())
    Image.fromarray((mask * 65535 + 0.5).astype(np.uint16)).save(os.path.join(work, "etch-mask.png"))
    Image.fromarray(((front - fmin) / (fmax - fmin) * 65535 + 0.5).astype(np.uint16)).save(os.path.join(work, "etch-front.png"))
    np.savez(out, mask=mask.astype(np.float32), front=front.astype(np.float32), fmin=fmin, fscale=fmax - fmin,
             **{k: E[k] for k in ("x0", "x1", "z0", "z1", "depth", "feather")})
    print("etch mask", mask.shape, "front y range", float(front.min()), float(front.max()), flush=True)


if __name__ == "__main__":
    work = sys.argv[1]
    what = sys.argv[2] if len(sys.argv) > 2 else "all"
    os.makedirs(work, exist_ok=True)
    frames = list(range(24))
    layers = ["far", "mid", "near"]
    for a in sys.argv[3:]:
        if a.startswith("--frames="):
            frames = [int(x) for x in a.split("=")[1].split(",")]
        if a.startswith("--layers="):
            layers = a.split("=")[1].split(",")
    if what in ("button", "all"):
        button(work, frames)
    if what in ("sky", "all"):
        sky(work, layers)
    if what in ("fx", "all"):
        fx(work)
    if what in ("etch", "all"):
        etch(work)
