"""Grade the scene-3d passes into the two house variants (python3, numpy).

Glass (any pixel whose first hit is a surface) is graded from the key, rim,
sky and page passes; the page pass is tinted with the page colour of the
variant (the house sky or the ink lane), so the glass bends the page it will
sit on. Cloud (volume only) pixels go through the cloud rig's own grade
(`tools/cloud-3d/grade.py`), so a cloud here is the same cloud as the
buttons and the sky. The shadow catcher becomes the house shade: ink, soft,
light (cloud-system section 5, cloud-shade); deep ink on the dark lane.
Output: straight-alpha sRGB RGBA uint8.
"""
import os
import numpy as np

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "cloud_grade", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cloud-3d", "grade.py"))
cloud_grade = importlib.util.module_from_spec(_spec)  # the cloud rig's grade, read only
_spec.loader.exec_module(cloud_grade)


def lin(h):
    h = h.lstrip("#")
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# light: the page is the house sky; warm key, a breath of rim, cool sky fill
LIGHT = dict(key=1.30, rim=0.35, sky=0.55, page=lin("#E6EDFC"), sky_tint=(0.86, 0.93, 1.12),
             shade="#1C2436", shade_amt=0.30, knee=0.78)
# dark lane: the page is ink; the rim carries the shape, the key is low
DARK = dict(key=0.30, rim=1.25, sky=0.22, page=lin("#1C2436") * 1.35 + lin("#3A4B74") * 0.12,
            sky_tint=(0.80, 0.88, 1.15), rim_tint=(0.88, 0.94, 1.08),
            shade="#0B101C", shade_amt=0.40, knee=0.70)


def _srgb(x):
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def _shoulder(x, k):
    """Identity below the knee, a soft roll to white above it."""
    return np.where(x < k, x, k + (1 - k) * (1 - np.exp(-(x - k) / (1 - k))))


def grade(p, variant):
    cfg = LIGHT if variant == "light" else DARK
    a = np.clip(p["alpha"].astype(np.float32), 0, 1)
    key, rim, sky, page = (p[g].astype(np.float32) for g in ("key", "rim", "sky", "page"))
    st = np.array(cfg["sky_tint"], np.float32)
    rt = np.array(cfg.get("rim_tint", (1, 1, 1)), np.float32)
    col = cfg["key"] * key + cfg["rim"] * rim * rt + cfg["sky"] * sky * st + page * cfg["page"]
    ae = np.maximum(a, 1e-3)[..., None]
    c = np.maximum(col, 0) / ae
    c = _shoulder(c, cfg["knee"])
    surf = (p["index"].astype(np.float32) > 0.5)
    glass = np.concatenate([_srgb(c), a[..., None]], -1)
    out = glass
    if (~surf & (a > 1 / 512)).any():
        q = dict(p)
        if "vkey" in p:
            q.update(key=p["vkey"], rim=p["vrim"], sky=p["vsky"])
        cl = cloud_grade.grade(q, variant).astype(np.float32) / 255.0
        m = (~surf)[..., None]
        out = np.where(m, cl, glass)
    # the shade: what the catcher lost, as ink under the object
    cat = p["catcher"].astype(np.float32).mean(-1)
    s = np.clip(1.0 - cat, 0, 1)
    # the catcher is not denoised; a shade is soft anyway, so blur it
    s = _blur(s, max(1.0, s.shape[1] / 300.0)) * cfg["shade_amt"]
    shade = np.concatenate([np.broadcast_to(_srgb(lin(cfg["shade"])), s.shape + (3,)), s[..., None]], -1)
    return over_rgba(out, shade)


def _blur(a, sigma):
    """Separable gaussian, edges clamped."""
    r = int(3 * sigma + 0.5)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    a = a.astype(np.float32)
    for ax in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[ax] = (r, r)
        b = np.pad(a, pad, mode="edge")
        a = sum(k[i] * np.take(b, np.arange(i, i + a.shape[ax]), axis=ax) for i in range(2 * r + 1))
    return a


def over_rgba(top, bot):
    """Straight-alpha float RGBA over straight-alpha float RGBA."""
    at, ab = top[..., 3:4], bot[..., 3:4]
    ao = at + ab * (1 - at)
    rgb = (top[..., :3] * at + bot[..., :3] * ab * (1 - at)) / np.maximum(ao, 1e-6)
    out = np.concatenate([rgb, ao], -1)
    out[ao[..., 0] < 1 / 512] = 0
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


def load(path):
    z = np.load(path)
    return {k: z[k] for k in z.files}
