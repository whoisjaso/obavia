"""Deterministic numpy noise for the cloud density fields.

Gradient (Perlin style) noise and Worley F1, both seeded through an integer
hash, both optionally periodic along x so a sky layer tiles horizontally.
Pure numpy, no global random state: the same seed gives the same field.
"""
import numpy as np

M32 = np.uint32(0xFFFFFFFF)


def _hash(ix, iy, iz, seed):
    """Integer hash of lattice coordinates to uint32 (PCG style mixing)."""
    h = (ix.astype(np.int64) * 73856093) ^ (iy.astype(np.int64) * 19349663) ^ (iz.astype(np.int64) * 83492791) ^ (seed * 2654435761)
    h = (h & 0xFFFFFFFF).astype(np.uint64)
    h = (h ^ (h >> 16)) * 0x7FEB352D & 0xFFFFFFFF
    h = (h ^ (h >> 15)) * 0x846CA68B & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return h.astype(np.uint32)


def _u01(h):
    return h.astype(np.float32) / np.float32(4294967296.0)


_GRAD = np.array([
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]], dtype=np.float32)


def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def perlin(x, y, z, seed=0, period_x=None):
    """Gradient noise in about [-1, 1]. period_x (int, lattice cells) wraps x."""
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    zi = np.floor(z).astype(np.int64)
    xf = (x - xi).astype(np.float32)
    yf = (y - yi).astype(np.float32)
    zf = (z - zi).astype(np.float32)
    u, v, w = _fade(xf), _fade(yf), _fade(zf)
    out = np.zeros_like(xf)
    acc = {}
    for dx in (0, 1):
        cx = xi + dx
        if period_x:
            cx = np.mod(cx, period_x)
        for dy in (0, 1):
            for dz in (0, 1):
                h = _hash(cx, yi + dy, zi + dz, seed) & 15
                g = _GRAD[h]
                acc[(dx, dy, dz)] = g[:, 0] * (xf - dx) + g[:, 1] * (yf - dy) + g[:, 2] * (zf - dz)
    x00 = acc[(0, 0, 0)] + u * (acc[(1, 0, 0)] - acc[(0, 0, 0)])
    x10 = acc[(0, 1, 0)] + u * (acc[(1, 1, 0)] - acc[(0, 1, 0)])
    x01 = acc[(0, 0, 1)] + u * (acc[(1, 0, 1)] - acc[(0, 0, 1)])
    x11 = acc[(0, 1, 1)] + u * (acc[(1, 1, 1)] - acc[(0, 1, 1)])
    y0 = x00 + v * (x10 - x00)
    y1 = x01 + v * (x11 - x01)
    out = y0 + w * (y1 - y0)
    return out * np.float32(1.1)


def fbm(x, y, z, octaves=4, seed=0, period_x=None, lac=2.0, gain=0.5):
    tot = np.zeros(np.shape(x), np.float32)
    amp, f, norm = 1.0, 1.0, 0.0
    for o in range(octaves):
        px = int(round(period_x * f)) if period_x else None
        tot += amp * perlin(x * f, y * f, z * f, seed + 101 * o, px)
        norm += amp
        amp *= gain
        f *= lac
    return tot / norm


def worley(x, y, z, seed=0, period_x=None):
    """Worley F1 distance (0 at a feature point, about 1 between)."""
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    zi = np.floor(z).astype(np.int64)
    best = np.full(np.shape(x), 9.0, np.float32)
    for dx in (-1, 0, 1):
        cx = xi + dx
        hx = np.mod(cx, period_x) if period_x else cx
        for dy in (-1, 0, 1):
            cy = yi + dy
            for dz in (-1, 0, 1):
                cz = zi + dz
                h = _hash(hx, cy, cz, seed)
                fx = cx + _u01(h)
                fy = cy + _u01(_hash(hx, cy, cz, seed + 7))
                fz = cz + _u01(_hash(hx, cy, cz, seed + 13))
                d = (x - fx) ** 2 + (y - fy) ** 2 + (z - fz) ** 2
                np.minimum(best, d.astype(np.float32), out=best)
    return np.sqrt(best)


def billow(x, y, z, seed=0, period_x=None):
    """Round cauliflower bumps in [0, 1]: 1 on a feature point, 0 between."""
    f = worley(x, y, z, seed, period_x)
    b = np.clip(1.0 - f * f * 1.35, 0.0, 1.0)
    return b


_FN = None


def _call(s):
    return _FN(s)


def chunked(fn, n, chunk=250_000, procs=4):
    """Evaluate fn(slice) over n points in chunks, on procs forked workers.
    Results are identical to a serial run: every chunk is a pure function."""
    global _FN
    sl = [slice(s, min(n, s + chunk)) for s in range(0, n, chunk)]
    if procs > 1 and len(sl) > 1:
        import multiprocessing as mp
        _FN = fn
        with mp.get_context("fork").Pool(procs) as pool:
            parts = pool.map(_call, sl)
        _FN = None
    else:
        parts = [fn(s) for s in sl]
    return np.concatenate(parts).astype(np.float32)
