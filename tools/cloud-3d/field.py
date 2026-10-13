"""Cloud density fields, built in numpy on a voxel grid.

A cumulus is a smooth union of seeded ellipsoid lobes on a flat base,
domain-warped by low-frequency gradient noise, eroded into cauliflower
billows by three octaves of Worley noise (strongest on the tops, weakest
on the flat belly), with a density ramp at the edge whose width is itself
modulated by noise so parts of the rim go wispy instead of hard.

Everything is a pure function of (seed, params): no global randomness.
"""
import numpy as np
from noise import perlin, fbm, billow, chunked


def rng(seed):
    return np.random.default_rng(np.random.SeedSequence(seed))


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def ellipsoid_sdf(px, py, pz, c, r):
    qx, qy, qz = (px - c[0]) / r[0], (py - c[1]) / r[1], (pz - c[2]) / r[2]
    k = np.sqrt(qx * qx + qy * qy + qz * qz)
    return (k - 1.0) * min(r)


# ----------------------------------------------------------------- button

def button_lobes(seed):
    """5 to 7 seeded lobes on a wide flat base (a tall tower, shoulders,
    small ends), plus the belly slab that keeps the label zone solid."""
    g = rng(seed)
    n = int(g.integers(5, 8))
    xs = np.linspace(-1.02, 1.02, n) + g.uniform(-0.06, 0.06, n)
    tower = int(g.integers(n // 2 - 1, n // 2 + 1))  # the tallest lobe, near the middle
    lobes = []
    for i, x in enumerate(xs):
        centre = max(0.0, 1.0 - abs(x) / 1.45)
        rx = g.uniform(0.30, 0.44) * (0.80 + 0.35 * centre)
        rz = g.uniform(0.22, 0.34) * (0.65 + 0.70 * centre)
        if i == tower:
            rz *= 1.22
            rx *= 1.10
        ry = g.uniform(0.38, 0.50)
        z = -0.24 + rz * 0.78 + g.uniform(-0.03, 0.03)
        y = g.uniform(-0.05, 0.12)
        lobes.append(((x, y, z), (rx, ry, rz)))
        # a small cap on most lobes: the cauliflower is lobes on lobes
        if g.uniform() < 0.8:
            cx = x + g.uniform(-0.5, 0.5) * rx
            cr = rx * g.uniform(0.40, 0.58)
            lobes.append(((cx, y - 0.05, z + rz * 0.62), (cr, cr * 1.1, cr * 0.85)))
    lobes.append(((0.0, 0.02, -0.21), (1.40, 0.50, 0.25)))
    # rounded ends so the belly tapers instead of pinching off
    for sx in (-1.0, 1.0):
        lobes.append(((sx * 1.20, 0.02, -0.17), (0.34, 0.40, 0.21)))
    return lobes


def button_density(P, seed, t=None):
    """Density at points P (N, 3) for the button cloud.

    t: animation parameters dict
      sy   vertical scale about the base (1 rest, 0.94 pressed)
      sxy  horizontal swell (1 rest, 1.03 puff)
      dens density multiplier
      loose edge loosening 0..1 (wider, wispier ramp)
      wisp outward wisp amount 0..1, wdrift outward drift distance
    """
    t = dict(dict(sy=1.0, sxy=1.0, dens=1.0, loose=0.0, wisp=0.0, wdrift=0.0), **(t or {}))
    lobes = button_lobes(seed)
    base = -0.44
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    # undo the press transform: compress about the base, swell about the centre
    zx = base + (z - base) / t["sy"]
    xx = x / t["sxy"]
    yy = y / t["sxy"]
    zx = base + (zx - base) / (1.0 + (t["sxy"] - 1.0) * 0.6)

    def f(s):
        px, py, pz = xx[s], yy[s], zx[s]
        # domain warp (low frequency, gives lobes irregular outlines)
        w1 = fbm(px * 1.6, py * 1.6, pz * 1.6, 3, seed + 11)
        w2 = fbm(px * 1.6 + 5.2, py * 1.6, pz * 1.6, 3, seed + 12)
        w3 = fbm(px * 1.6, py * 1.6 + 3.1, pz * 1.6, 3, seed + 13)
        qx, qy, qz = px + 0.07 * w1, py + 0.07 * w2, pz + 0.05 * w3
        d = None
        for c, r in lobes:
            e = ellipsoid_sdf(qx, qy, qz, c, r)
            d = e if d is None else smin(d, e, 0.16)
        # flat base, slightly soft
        d = np.maximum(d, (base - qz) * 1.4)
        # height above base 0..1 gates the billows (cauliflower on top)
        hgt = np.clip((qz - base) / 0.9, 0.0, 1.0)
        top = 0.35 + 0.65 * np.sqrt(hgt)
        b1 = billow(qx * 2.3, qy * 2.3, qz * 2.3, seed + 21)
        b2 = billow(qx * 5.2, qy * 5.2, qz * 5.2, seed + 22)
        b3 = billow(qx * 12.0, qy * 12.0, qz * 12.0, seed + 23)
        # big billows everywhere above the base, small ones only on the tops
        ero = 0.17 * b1 + 0.07 * b2 * top + 0.026 * b3 * hgt
        d = d - top * (ero - 0.10)
        # edge ramp width: noise decides where the rim goes wispy
        wn = fbm(px * 2.3 + 9.0, py * 2.3, pz * 2.3, 2, seed + 31) * 0.5 + 0.5
        edge = 0.055 + 0.07 * wn ** 3 + 0.05 * t["loose"]
        dens = np.clip(-d / edge, 0.0, 1.0)
        dens = dens * dens * (3.0 - 2.0 * dens)
        # fine wisps outside the hard body: thin, noisy, decaying with distance
        fw = fbm(px * 6.0, py * 6.0, pz * 6.0, 3, seed + 41) * 0.5 + 0.5
        halo = np.clip(1.0 - np.maximum(d, 0.0) / (0.07 + 0.08 * t["loose"]), 0.0, 1.0)
        dens = dens + 0.10 * halo * np.clip(fw * 1.6 - 0.75, 0.0, 1.0) * (d > 0)
        # the puff's outward wisps, drifting along the radial direction
        if t["wisp"] > 0.0:
            rr = np.sqrt(px * px / 2.4 + pz * pz + 1e-6)
            ox, oz = px / rr, pz / rr
            sx, sz = px - ox * t["wdrift"], pz - oz * t["wdrift"]
            fw2 = fbm(sx * 5.0, py * 5.0, sz * 5.0, 3, seed + 51) * 0.5 + 0.5
            ring = np.clip(1.0 - np.abs(d - 0.03 - t["wdrift"] * 0.6) / 0.07, 0.0, 1.0)
            dens = dens + t["wisp"] * 0.16 * ring * np.clip(fw2 * 1.8 - 0.8, 0.0, 1.0)
        return (dens * t["dens"]).astype(np.float32)

    return chunked(f, P.shape[0])


# ----------------------------------------------------------------- sky

SKY_LAYERS = {
    # n clouds, half-width range, base band (z), edge softness, billow
    # erosion, frequency multiplier, density, height scale
    "far": dict(n=22, rx=(0.09, 0.34), band=(0.05, 1.30), edge=0.04, ero=0.8, fq=2.0, dens=1.0, hscale=0.50),
    "mid": dict(n=9, rx=(0.32, 0.78), band=(-0.70, 0.30), edge=0.07, ero=1.0, fq=1.25, dens=1.0, hscale=0.72),
    "near": dict(n=4, rx=(0.95, 1.45), band=(-1.75, -1.15), edge=0.22, ero=1.3, fq=0.72, dens=0.8, hscale=0.90),
}


def sky_clouds(layer, seed, period):
    """Seeded cumulus placements for a layer, as lists of lobes per cloud."""
    cfg = SKY_LAYERS[layer]
    g = rng(seed)
    clouds = []
    n = cfg["n"]
    xs = (np.arange(n) + g.uniform(0.15, 0.85, n)) / n * period - period / 2
    for i in range(n):
        half = g.uniform(*cfg["rx"])
        zb = g.uniform(*cfg["band"])
        yc = g.uniform(-0.6, 0.6)
        k = int(g.integers(3, 6))
        lx = np.linspace(-half * 0.7, half * 0.7, k) + g.uniform(-0.1, 0.1, k) * half
        lobes = []
        for j in range(k):
            cen = 1.0 - abs(lx[j]) / (half + 1e-6)
            rx = half * g.uniform(0.32, 0.5)
            rz = half * cfg["hscale"] * g.uniform(0.45, 0.75) * (0.6 + 0.6 * cen)
            ry = half * g.uniform(0.35, 0.5)
            lobes.append(((xs[i] + lx[j], yc + g.uniform(-0.1, 0.1) * half, zb + rz * 0.65), (rx, ry, rz)))
        lobes.append(((xs[i], yc, zb + half * 0.10), (half * 0.95, half * 0.45, half * 0.16)))
        clouds.append(dict(base=zb, lobes=lobes, half=half))
    return clouds


def sky_density(P, layer, seed, period):
    """Density for one sky layer; periodic in x with the given period."""
    cfg = SKY_LAYERS[layer]
    clouds = sky_clouds(layer, seed, period)
    fq = cfg["fq"]

    def per(v):  # lattice period in cells for frequency v (v already quantized)
        return int(round(period * v))

    def q(v):  # quantize a frequency so the noise wraps exactly at the period
        return max(1, int(round(period * v))) / period

    def f(s):
        px, py, pz = P[s, 0], P[s, 1], P[s, 2]
        a = q(1.4 * fq)
        w1 = fbm(px * a, py * a, pz * a, 3, seed + 11, per(a))
        w2 = fbm(px * a, py * a, pz * a, 3, seed + 12, per(a))
        w3 = fbm(px * a, py * a + 3.0, pz * a, 3, seed + 13, per(a))
        sc = 0.10 / fq
        qx, qy, qz = px + sc * w1, py + sc * w2, pz + sc * 0.7 * w3
        d = np.full(qx.shape, 9.0, np.float32)
        hg = np.zeros(qx.shape, np.float32)
        for cl in clouds:
            cx = np.mean([c[0] for c, r in cl["lobes"]])
            reach = cl["half"] * 1.6 + 0.3
            for shift in (-period, 0.0, period):
                m = np.abs(qx - (cx + shift)) < reach
                if not m.any():
                    continue
                mx, my, mz = qx[m], qy[m], qz[m]
                dc = None
                for c, r in cl["lobes"]:
                    e = ellipsoid_sdf(mx, my, mz, (c[0] + shift, c[1], c[2]), r)
                    dc = e if dc is None else smin(dc, e, 0.25 * cl["half"])
                dc = np.maximum(dc, (cl["base"] - mz) * 1.4)
                dm = d[m]
                closer = dc < dm
                hgm = hg[m]
                hgm[closer] = np.clip((mz[closer] - cl["base"]) / (cl["half"] * 1.1), 0, 1)
                hg[m] = hgm
                d[m] = np.minimum(dm, dc)
        top = 0.35 + 0.65 * np.sqrt(hg)
        e = cfg["ero"] / fq
        f1, f2, f3 = q(3.2 * fq), q(7.0 * fq), q(15.0 * fq)
        b1 = billow(qx * f1, qy * f1, qz * f1, seed + 21, per(f1))
        b2 = billow(qx * f2, qy * f2, qz * f2, seed + 22, per(f2))
        b3 = billow(qx * f3, qy * f3, qz * f3, seed + 23, per(f3))
        ero = e * (0.105 * b1 + 0.05 * b2 + 0.022 * b3)
        d = d - top * (ero - 0.07 * e)
        aw = q(2.3 * fq)
        wn = fbm(px * aw, py * aw + 9.0, pz * aw, 2, seed + 31, per(aw)) * 0.5 + 0.5
        edge = cfg["edge"] * (0.6 + 1.6 * wn ** 2)
        dens = np.clip(-d / edge, 0.0, 1.0)
        dens = dens * dens * (3.0 - 2.0 * dens)
        a6 = q(6.0 * fq)
        fw = fbm(px * a6, py * a6, pz * a6, 3, seed + 41, per(a6)) * 0.5 + 0.5
        halo = np.clip(1.0 - np.maximum(d, 0.0) / (0.12 / fq), 0.0, 1.0)
        dens = dens + 0.10 * halo * np.clip(fw * 1.6 - 0.75, 0.0, 1.0) * (d > 0)
        return (dens * cfg["dens"]).astype(np.float32)

    return chunked(f, P.shape[0])


def grid_points(lo, hi, res):
    """Voxel positions matching Blender's Volume Cube sampling:
    point i sits at lo + i * (hi - lo) / (res - 1), C order (x, y, z)."""
    ax = [np.linspace(lo[i], hi[i], res[i], dtype=np.float32) for i in range(3)]
    X, Y, Z = np.meshgrid(*ax, indexing="ij")
    return np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)


# ----------------------------------------------------------------- press

def _ease_out(u):
    u = min(max(u, 0.0), 1.0)
    return 1.0 - (1.0 - u) ** 3


def press_params(f):
    """Keyframed press animation, 24 frames at 60 fps (400 ms).
    0 to 5   sink and compress (frame 5 is the pressed state)
    6 to 15  release with a puff: lobes swell 3 percent, edges loosen,
             wisps drift outward
    16 to 23 settle; frame 23 is exactly the rest state."""
    import math
    c = _ease_out((f + 1) / 6.0) if f <= 5 else 1.0 - _ease_out((f - 5) / 4.0)
    if f <= 5:
        s = 0.0
    elif f <= 15:
        s = math.sin(math.pi * (f - 5) / 10.0)
    else:
        s = -0.15 * math.sin(math.pi * (f - 15) / 8.0)
    w = math.sin(math.pi * (f - 6) / 17.0) ** 1.5 if 6 <= f <= 23 else 0.0
    wd = 0.12 * _ease_out((f - 6) / 17.0) if f >= 6 else 0.0
    if f == 23:
        c, s, w, wd = 0.0, 0.0, 0.0, 0.0
    return dict(sy=1.0 - 0.06 * c, sxy=1.0 + 0.03 * s, dens=1.0 + 0.15 * c,
                loose=max(s, 0.0), wisp=w, wdrift=wd, c=c, s=s)


BUTTON = dict(lo=(-2.0, -0.8, -0.62), hi=(2.0, 0.8, 0.95), vox=0.0125, base=-0.44,
              ortho=3.9, center=(0.0, 0.06), aspect=2.5)


def sky_domain(layer, seed, period):
    """Grid bounds for a sky layer: one period plus a pad each side (the pad
    holds the wrapped neighbours so sun shadows cross the seam), z from the
    layer's clouds."""
    clouds = sky_clouds(layer, seed, period)
    zlo = min(cl["base"] for cl in clouds) - 0.15
    zhi = max(c[2] + r[2] for cl in clouds for c, r in cl["lobes"]) + 0.35
    pad = 0.6
    return (-period / 2 - pad, -1.3, zlo), (period / 2 + pad, 1.3, zhi)


SKY = dict(period=8.0, width=2048, height=1024, zc=0.0,
           vox=dict(far=0.0125, mid=0.016, near=0.022), seed=dict(far=1012, mid=1013, near=1014))


# ----------------------------------------------------------------- after-effects

FX = dict(lo=(-1.0, -0.5, -1.0), hi=(1.0, 0.5, 1.0), vox=0.008, ortho=2.0)


def wisp_density(P, seed):
    """One soft wisp: a curved, tapering filament of cloud, frayed by noise."""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]

    def f(s):
        px, py, pz = x[s], y[s], z[s]
        w = fbm(px * 2.0, py * 2.0, pz * 2.0, 3, seed + 3)
        cz = 0.22 * np.sin(px * 2.2 + 0.4) + 0.06 * w      # the spine bends
        t = np.clip(1.0 - np.abs(px + 0.05) / 0.82, 0.0, 1.0)  # taper at both ends
        r = 0.20 * t ** 0.7 + 1e-3
        dist = np.sqrt((pz - cz) ** 2 + (py * 1.3) ** 2)
        core = np.clip(1.0 - dist / r, 0.0, 1.0) ** 1.5
        n = fbm(px * 6.0, py * 6.0, pz * 6.0, 4, seed + 5) * 0.5 + 0.5
        b = billow(px * 7.0, py * 7.0, pz * 7.0, seed + 6)
        return np.clip(core * (0.6 + 0.9 * n) * (0.7 + 0.5 * b) - 0.18, 0.0, 1.0) * 0.55

    return chunked(f, P.shape[0])


def ring_density(P, seed):
    """A soft air ring facing the camera: a torus of thin cloud, broken by noise."""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]

    def f(s):
        px, py, pz = x[s], y[s], z[s]
        w = fbm(px * 2.5, py * 2.5, pz * 2.5, 3, seed + 7)
        rr = np.sqrt(px * px + pz * pz) + 0.05 * w
        dist = np.sqrt((rr - 0.70) ** 2 + (py * 1.1) ** 2)
        core = np.clip(1.0 - dist / 0.16, 0.0, 1.0) ** 1.6
        n = fbm(px * 5.0, py * 5.0, pz * 5.0, 4, seed + 8) * 0.5 + 0.5
        b = billow(px * 6.0, py * 6.0, pz * 6.0, seed + 9)
        return np.clip(core * (0.5 + 1.0 * n) * (0.7 + 0.5 * b) - 0.2, 0.0, 1.0) * 0.45

    return chunked(f, P.shape[0])
