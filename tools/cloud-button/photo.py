# Photographic cloud button sprites, composed from the repo's own cumulus photograph.
#
#   python3 tools/cloud-button/photo.py            # every set, then the label check
#   python3 tools/cloud-button/photo.py --only 440 # one set (320 | 440 | 640 | hero)
#
# Source: obavia-co/assets/obavia-clouds.webp (1536 x 1024 RGB). Three mass regions are lifted from it with a
# soft key, arranged overlapping into a button-shaped cumulus, and written to assets/cloud-button/.
# Deterministic: no randomness at all; the only noise is the photograph's own.
import os, sys, io
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'obavia-co', 'assets', 'obavia-clouds.webp')
OUT = os.path.join(ROOT, 'assets', 'cloud-button')
LIMIT = 180 * 1024

# The sky in this photograph is near white (254, 254, 254, sampled across the top third); the clouds separate
# from it by their blue-grey shading. The key is the colour distance from that sky plus the luminance deficit.
SKY = np.array([254, 254, 254], np.float32) / 255

# Mass regions in photo pixels (x0, y0, x1, y1). Each box starts in open sky above the mass so the key
# finds the photograph's own top silhouette; the bottom of the box is cut by the composition's flat base.
REGIONS = {
    'right-tower': (1150, 556, 1536, 860),   # the right mass: the tallest rounded lobes, bright cores, cool crease
    'left-crown':  (0, 420, 420, 740),       # the top of the left mass: a row of lobes against open sky
    'mid-swell':   (920, 696, 1232, 960),    # the lower right swell: medium lobes, soft grey creases
}

# Sets: name -> (width, height) at 1x. Every sprite is written at 1x and 2x.
SETS = {'320': (320, 112), '440': (440, 112), '640': (640, 112), 'hero': (1600, 400)}
SHADOW_M = 40          # contact shadow margin, CSS px, every side

INK = np.array([28, 36, 54], np.float32) / 255
ICE_TOP = np.array([0xE9, 0xEF, 0xFE], np.float32) / 255
ICE_BASE = np.array([0x86, 0x9F, 0xD6], np.float32) / 255


# ---------------------------------------------------------------- helpers
def blur(a, sigma):
    """Gaussian approximation by three box passes per axis (numpy only, edge-clamped)."""
    if sigma <= 0.3: return a
    r = max(1, int(round(np.sqrt(12 * sigma * sigma / 3 + 1) / 2)))
    out = a.astype(np.float32)
    for axis in (0, 1):
        for _ in range(3):
            pad = [(0, 0)] * out.ndim; pad[axis] = (r + 1, r)
            p = np.pad(out, pad, mode='edge')
            c = np.cumsum(p, axis=axis, dtype=np.float64)
            hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
            lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
            out = ((hi - lo) / (2 * r + 1)).astype(np.float32)
    return out

def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def resize(a, w, h):
    """LANCZOS resize of a float array (H, W) or (H, W, C) in 0..1."""
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((w, h), Image.LANCZOS), np.float32)
    return np.stack([resize(a[..., i], w, h) for i in range(a.shape[2])], -1)


# ---------------------------------------------------------------- 1. lift the masses
KEY_SIGMA = 6.0      # photo px: the scale at which the mass separates from the sky
KEY_T = 0.050        # distance from the sky at which the mass begins
FEATHER = 11.0       # photo px: the rim feather, wide so the edge stays wispy

def _ball(h, R, op):
    """Grey-scale 1D morphology of a height profile with a disk of radius R (non-flat structuring element)."""
    u = np.arange(-R, R + 1); b = np.sqrt(np.maximum(R * R - u * u, 0)) - R
    p = np.pad(h, R, mode='edge')
    st = np.stack([p[R + k:R + k + len(h)] for k in u])
    return (st + b[:, None]).max(0) if op == 'dilate' else (st - b[:, None]).min(0)

def lobes(env, h):
    """Turn the keyed top edge into the photograph's lobes: close narrow slots (a ball rolled over the top),
    then round every crest into an arc (a ball rolled under it). Heights are measured up from the box floor."""
    top = h - env
    R1, R2 = max(3, int(h * 0.07)), max(3, int(h * 0.12))
    top = _ball(_ball(top, R1, 'dilate'), R1, 'erode')     # closing: fill slots narrower than a lobe
    top = _ball(_ball(top, R2, 'erode'), R2, 'dilate')     # opening: crests become arcs
    u = np.arange(-R2, R2 + 1); p = np.pad(top, R2, mode='edge')
    top = np.max(np.stack([p[R2 + k:R2 + k + len(top)] - 1.4 * abs(k) for k in u]), 0)   # no cliff steeper than 1.4
    return h - top

def lift(photo, box):
    """Key one region. Returns (rgb, alpha) cropped to the mass, in photo pixels."""
    x0, y0, x1, y1 = box
    rgb = photo[y0:y1, x0:x1]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    dist = np.linalg.norm(rgb - SKY, axis=-1) + 0.5 * np.clip(SKY.mean() - lum, 0, 1)
    kb = blur(dist, KEY_SIGMA)
    # The top silhouette: per column, the first row where the mass holds. The photograph's white cores are as
    # white as its sky, so they are found by lying under a rim, not by their own colour.
    h, w = kb.shape
    hit = kb > KEY_T
    env = np.where(hit.any(0), hit.argmax(0), h).astype(np.float32)
    env = lobes(env, h)
    yy = np.arange(h, dtype=np.float32)[:, None]
    fill = smooth(env - FEATHER * 0.35, env + FEATHER, yy)
    haze = smooth(0.4 * KEY_T, KEY_T, kb) * smooth(env - 2.2 * FEATHER, env, yy)   # wisps above the rim
    a = np.maximum(fill, 0.5 * haze)
    a = blur(a, 1.5)
    # sides fall away on a dome, so a mass never ends in a vertical crop edge
    xx = (np.arange(w, dtype=np.float32)[None, :] + 0.5) / w
    yb = (h - yy) / h
    r = np.sqrt(((xx - 0.5) / 0.5) ** 2 + (yb / 1.25) ** 2)
    a *= smooth(1.0, 0.88, r)
    top = int(max(0, env.min() - 2.2 * FEATHER))
    return rgb[top:], a[top:]


def tone(rgb):
    """Deepen the photograph's own shading a little (same light, more of it) and cool the blue toward grey,
    so the mass reads on a pale page. No new light is added."""
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    grey = np.repeat(lum[..., None], 3, -1)
    rgb = grey + (rgb - grey) * 0.62                     # the photo's blue is stronger than the spec's blue-grey
    rgb = 1 - (1 - rgb) * 1.75                           # deeper creases, the whites stay white
    return np.clip(rgb, 0, 1)


# ---------------------------------------------------------------- 2. arrange
# Left to right: (region, mass height as a fraction of canvas height, horizontal flip, depth). Lower depth is
# drawn first (further back): the tall tower sits behind, the low shelves cross in front of its foot.
def layout(W, H):
    if W / H >= 5.0:   # 640: four masses, the tower right of centre
        return [('left-crown', 0.96, True, 1), ('mid-swell', 1.00, False, 0), ('right-tower', 1.00, False, 0),
                ('mid-swell', 1.00, True, 1)]
    return [('left-crown', 0.92, True, 1), ('right-tower', 1.00, False, 0), ('mid-swell', 0.94, True, 1)]

OVERLAP = 0.45

def compose(W, H, masses):
    items = []
    for name, hf, flip, depth in layout(W, H):
        mrgb, ma = masses[name]
        mh = int(round(hf * H * 1.10)); mw = ma.shape[1] * mh / ma.shape[0]
        items.append([name, mh, mw, flip, depth])
    ov = OVERLAP
    run = sum(i[2] for i in items) - ov * sum(min(p[2], q[2]) for p, q in zip(items, items[1:]))
    stretch = float(np.clip(W * 1.12 / run, 0.8, 1.7))          # clouds hide a gentle horizontal stretch
    x = W * 0.5 - run * stretch / 2; placed = []
    for k, (name, mh, mw, flip, depth) in enumerate(items):
        mw = int(round(mw * stretch)); placed.append((depth, k, name, x, mh, mw, flip))
        if k + 1 < len(items): x += mw - ov * min(mw, items[k + 1][2] * stretch)
    rgb = np.zeros((H, W, 3), np.float32); a = np.zeros((H, W), np.float32); cw = np.zeros((H, W), np.float32)
    for depth, k, name, x, mh, mw, flip in sorted(placed):
        mrgb, ma = masses[name]
        r = resize(mrgb, mw, mh); m = np.clip(resize(ma, mw, mh), 0, 1)
        if flip: r = r[:, ::-1]; m = m[:, ::-1]
        wgt = m
        if depth > 0:   # a mass in front melts its colour into the one behind on its inner side: no seam.
            u = (np.arange(mw, dtype=np.float32)[None, :] + 0.5) / mw   # (density still adds, so no gap)
            inner = smooth(1.0, 0.62, u) if x + mw / 2 < W / 2 else smooth(0.0, 0.38, u)
            wgt = m * inner
        x = int(round(x)); y = H - mh + int(round(0.10 * H))   # feet run below the base cut
        sx0, sy0 = max(0, -x), max(0, -y); dx0, dy0 = max(0, x), max(0, y)
        w = min(mw - sx0, W - dx0); h = min(mh - sy0, H - dy0)
        if w <= 0 or h <= 0: continue
        sl = (slice(sy0, sy0 + h), slice(sx0, sx0 + w)); dl = (slice(dy0, dy0 + h), slice(dx0, dx0 + w))
        sa, sw, sc = m[sl], wgt[sl], r[sl]
        dc, dw = rgb[dl], cw[dl]
        ow = sw + dw * (1 - sw)
        dc[:] = np.where(ow[..., None] > 1e-6, (sc * sw[..., None] + dc * (dw * (1 - sw))[..., None]) / np.maximum(ow, 1e-6)[..., None], sc)
        dw[:] = ow
        a[dl] = sa + a[dl] * (1 - sa)
    # Where two towers part, the saddle between them never drops into the label band: a haze floor, coloured
    # by the neighbouring photograph (normalised blur of the masses' own colour), fills the band's dips only.
    yy = (np.arange(H, dtype=np.float32)[:, None] + 0.5) / H
    xx = (np.arange(W, dtype=np.float32)[None, :] + 0.5) / W
    floor = smooth(0.24, 0.36, yy) * smooth(0.04, 0.10, xx) * smooth(0.96, 0.90, xx)
    need = np.clip(floor - a, 0, 1)
    if need.max() > 0.01:
        sig = H * 0.12
        haze = blur(rgb * cw[..., None], sig) / np.maximum(blur(cw, sig), 1e-4)[..., None]
        rgb = (rgb * a[..., None] + haze * need[..., None]) / np.maximum(a + need, 1e-6)[..., None]
        a = np.maximum(a, floor)
    # A very soft wide rounded-rectangle falloff, only so the ends never run off the canvas, and the flat base.
    yy = (np.arange(H, dtype=np.float32)[:, None] + 0.5) / H
    xx = (np.arange(W, dtype=np.float32)[None, :] + 0.5) / W
    ex = min(0.10, 0.9 * H / W)                   # end feather: about one height, never more than 12 percent
    ends = smooth(0.0, ex, xx) * smooth(1.0, 1 - ex, xx)
    # The base is flat, as a cumulus base is, but not ruled: its line follows the photograph's own shading
    # along the foot (darker foot, slightly lower base), within 2.5 percent of the height.
    lum = (rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32))[int(0.6 * H):int(0.9 * H)]
    wsum = a[int(0.6 * H):int(0.9 * H)]
    foot = (lum * wsum).sum(0) / np.maximum(wsum.sum(0), 1e-4)
    foot = blur(foot[None, :], max(2.0, H * 0.18))[0]
    foot = (foot - foot.min()) / max(float(foot.max() - foot.min()), 1e-4)
    shift = 0.025 * (1 - foot)[None, :]
    base = smooth(1.0 + shift, 0.82 + shift, yy)
    return rgb, a * ends * base


# ---------------------------------------------------------------- 3, 4, 5. finish
def underside(H, W, strength):
    yy = (np.arange(H, dtype=np.float32)[:, None] + 0.5) / H
    return (strength * smooth(0.65, 1.0, yy)) * np.ones((1, W), np.float32)

def light(rgb, a, pressed):
    H, W = a.shape
    rgb = tone(rgb)
    t = underside(H, W, 0.10 * (1.5 if pressed else 1.0))
    rgb = rgb * (1 - t[..., None]) + INK * t[..., None]
    if pressed:
        core = smooth(0.6, 0.98, blur(a, H * 0.12))          # the dense middle
        rgb = rgb * (1 - 0.04 * core[..., None])
    return rgb

def squash(rgb, a, f=0.97):
    H, W = a.shape; h = int(round(H * f))
    a2 = np.clip(resize(a, W, h), 0, 1)                           # premultiplied, so no dark fringe
    r2 = resize(rgb * a[..., None], W, h) / np.maximum(a2, 1e-4)[..., None]
    R = np.zeros_like(rgb); A = np.zeros_like(a); R[H - h:] = r2; A[H - h:] = a2
    return R, A

def ice(rgb, a):
    H, W = a.shape
    lum = tone(rgb) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    s = smooth(0.62, 0.98, lum)                                  # the photo's shading, desaturated
    yy = (np.arange(H, dtype=np.float32)[:, None] + 0.5) / H * np.ones((1, W), np.float32)
    t = np.clip(0.55 * s + 0.45 * (1 - yy), 0, 1)                # lift toward ice at the top, cool at the base
    t = t * smooth(1.0, 0.55, yy) + s * 0.35 * (1 - smooth(1.0, 0.55, yy))
    col = ICE_BASE + (ICE_TOP - ICE_BASE) * t[..., None]
    return col, a * 0.9

def shadow(W, H, s, pressed, dark):
    m = SHADOW_M * s; W, H = W * s, H * s; w, h = W + 2 * m, H + 2 * m
    yy = np.arange(h, dtype=np.float32)[:, None] + 0.5; xx = np.arange(w, dtype=np.float32)[None, :] + 0.5
    cx, cy = w / 2, m + H * (0.93 if not pressed else 0.95)
    rx, ry = W * (0.40 if not pressed else 0.38), H * (0.10 if not pressed else 0.075)
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    e = (d <= 1).astype(np.float32)
    e = blur(e, (14 if not pressed else 8.5) * (H / 112) ** 0.5 * s ** 0.5)
    peak = 0.30 if dark else (0.13 if not pressed else 0.16)
    col = np.array([10, 14, 24], np.float32) / 255 if dark else INK
    a = e / max(e.max(), 1e-6) * peak
    return np.broadcast_to(col, (h, w, 3)).copy(), a


# ---------------------------------------------------------------- write
def save(path, rgb, a):
    px = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    px = (px * 255 + 0.5).astype(np.uint8)
    px[px[..., 3] == 0, :3] = 0
    im = Image.fromarray(px, 'RGBA')
    data = png(im)
    note = 'truecolour'
    if len(data) > LIMIT:
        # Reduce colours only when needed, and never to a palette (a palette posterises the soft greys): keep
        # RGBA truecolour and drop low bits, finest first. The photograph's own grain dithers the steps.
        src = px.astype(np.int16)
        for rgb_bits, a_bits in ((7, 7), (6, 7), (6, 6), (5, 6), (5, 5)):
            q = src.copy()
            for ch, bits in ((0, rgb_bits), (1, rgb_bits), (2, rgb_bits), (3, a_bits)):
                step = 1 << (8 - bits)
                q[..., ch] = np.clip(np.round(q[..., ch] / step) * step, 0, 255)
            q[q[..., 3] == 0, :3] = 0
            data = png(Image.fromarray(q.astype(np.uint8), 'RGBA')); note = f'rgb {rgb_bits} bit, alpha {a_bits} bit'
            if len(data) <= LIMIT: break
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)
    if len(data) > LIMIT:
        # No PNG of this photograph fits the limit at this size (the hero at 2x). A lossy WebP twin carries it.
        Image.fromarray(px, 'RGBA').save(path[:-4] + '.webp', 'WEBP', quality=90, method=6, alpha_quality=90)
        note += f', OVER LIMIT; webp twin {os.path.getsize(path[:-4] + ".webp") // 1024} KB'
    return len(data), note

def png(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return b.getvalue()


def main():
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    photo = np.asarray(Image.open(SRC).convert('RGB'), np.float32) / 255
    masses = {k: lift(photo, b) for k, b in REGIONS.items()}
    report = []
    for name, (W1, H1) in SETS.items():
        if only and name != only: continue
        for s in (1, 2):
            W, H = W1 * s, H1 * s
            base_rgb, a = compose(W, H, masses)
            rest = light(base_rgb, a, False)
            prgb, pa = squash(base_rgb, a)
            pressed = light(prgb, pa, True)
            dark_rgb, dark_a = ice(base_rgb, a)
            d = os.path.join(OUT, name)
            for fn, (c, al) in {'rest': (rest, a), 'pressed': (pressed, pa), 'dark': (dark_rgb, dark_a),
                                'shadow-rest': shadow(W1, H1, s, False, False),
                                'shadow-pressed': shadow(W1, H1, s, True, False),
                                'dark-shadow': shadow(W1, H1, s, False, True)}.items():
                n, note = save(os.path.join(d, f'{fn}@{s}x.png'), c, al)
                report.append((f'{name}/{fn}@{s}x.png', al.shape[1], al.shape[0], n, note))
            # label safe zone: lower 60 percent of the height, x 12 to 88 percent, the feathered base excluded
            for lab, al in (('rest', a), ('pressed', pa), ('dark', dark_a / 0.9)):
                z = al[int(0.40 * H):int(0.85 * H), int(0.12 * W):int(0.88 * W)]
                report.append((f'{name}/{lab}@{s}x safe zone y40-85 x12-88', 'min alpha', round(float(z.min()), 3),
                               'p1', round(float(np.percentile(z, 1)), 3)))
    for r in report: print(*r)


if __name__ == '__main__':
    main()
