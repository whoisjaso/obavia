"""Grade the linear light-group passes into the two house variants.

Runs in plain python3 with numpy and Pillow (no Blender needed), so the look
can be tuned without re-rendering. Input: the .npz written by scene.py
(premultiplied linear key, rim, sky, alpha). Output: straight-alpha sRGB
RGBA uint8 (PNG and WebP store straight alpha; the render is premultiplied
and is un-premultiplied here, once, before the tone curve).
"""
import numpy as np

# light: white mass, warm low key, blue-grey underside from the sky fill
LIGHT = dict(key=2.60, rim=0.10, sky=0.36, exposure=1.30, sky_tint=(0.80, 0.90, 1.18),
             lift=(0.004, 0.008, 0.02), sat=1.05)
# dark lane: lit from behind and above, ice rim on ink; the body stays dim
DARK = dict(key=0.06, rim=1.60, sky=0.10, exposure=1.30, sky_tint=(0.78, 0.86, 1.10),
            lift=(0.0, 0.0, 0.0), sat=0.85, rim_tint=(0.86, 0.93, 1.06),
            body_alpha=0.20, rim_alpha=1.10, lum_gain=1.6, ice=(0.91, 0.95, 1.0),
            thin=0.55, thin_light=0.30)   # thickness ramp: a wisp under 55 percent coverage thins and dims


def _srgb(x):
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def _tone(x, exposure):
    # soft shoulder: linear in the shadows, rolls off highlights to white
    y = 1.0 - np.exp(-x * exposure)
    return y


def grade(passes, variant):
    cfg = LIGHT if variant == "light" else DARK
    a = np.clip(passes["alpha"].astype(np.float32), 0.0, 1.0)
    key = passes["key"].astype(np.float32)
    rim = passes["rim"].astype(np.float32)
    sky = passes["sky"].astype(np.float32)
    rt = np.array(cfg.get("rim_tint", (1, 1, 1)), np.float32)
    st = np.array(cfg["sky_tint"], np.float32)
    col = cfg["key"] * key + cfg["rim"] * rim * rt + cfg["sky"] * sky * st
    col = np.maximum(col, 0.0)
    # un-premultiply; thin wisps get a floor so noise cannot blow up
    ae = np.maximum(a, 0.02)[..., None]
    c = col / ae
    c = _tone(c, cfg["exposure"]) + np.array(cfg["lift"], np.float32)
    lum = (c * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
    c = lum + (c - lum) * cfg["sat"]
    if variant == "dark":
        # the house dark lane: ice masses that let the ink through, a lit rim.
        # alpha follows the light the volume scatters toward the camera, so a
        # dim body reads as thin ice over ink and the rim reads as silver.
        l = lum[..., 0]
        # thickness: how much volume the pixel covers (the straight alpha). A thin
        # wisp scatters little light toward the camera over ink, so its alpha and
        # its light fall with its thickness; the dense body and the silhouette rim
        # keep theirs. Without this the puff's outward wisps (frames 8 to 13) read
        # as lit smoke on ink; with it they read as thin cloud.
        th = np.clip(a / cfg["thin"], 0.0, 1.0)
        th = th * th * (3.0 - 2.0 * th)
        aa = a * np.clip(cfg["body_alpha"] + cfg["rim_alpha"] * l * th, 0.0, 1.0)
        g = np.clip(l * cfg["lum_gain"] * (cfg["thin_light"] + (1.0 - cfg["thin_light"]) * th), 0.0, 1.0)
        c = c / np.maximum(lum, 1e-3) * g[..., None]
        c = np.maximum(c, 0)
        # keep the colour of the rim icy, never neutral grey
        c = c * np.array(cfg["ice"], np.float32)
        out = np.concatenate([_srgb(c), aa[..., None]], -1)
    else:
        out = np.concatenate([_srgb(c), a[..., None]], -1)
    out = np.clip(out, 0, 1)
    out[a < 1.0 / 512] = 0.0
    return (out * 255.0 + 0.5).astype(np.uint8)


def over(rgba, bg):
    """Composite straight-alpha uint8 RGBA over an RGB background array."""
    f = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    return (f * a + bg.astype(np.float32) * (1 - a) + 0.5).astype(np.uint8)


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def gradient_bg(w, h, top="#DCE6FA", bottom="#F2F6FF"):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    a = np.array(hexrgb(top), np.float32)
    b = np.array(hexrgb(bottom), np.float32)
    return np.broadcast_to(a * (1 - t) + b * t, (h, w, 3)).astype(np.uint8)


def flat_bg(w, h, colour):
    return np.broadcast_to(np.array(hexrgb(colour), np.uint8), (h, w, 3)).copy()
