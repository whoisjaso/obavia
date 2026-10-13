"""The car objects of DOCTRINE section 5, modelled from primitives and curves.

Each entry in OBJECTS: build(frame) puts the object in the scene (rig.setup has
already run), cam = (az, elev, lens), box = the world box the camera frames,
size = master canvas (w, h) of the still at 2x, frames = 24 for the four
moments (frame 23 is the still), blur = Cycles motion blur on.
No brand, no text, no numbers, no state name: shapes only.
"""
import math
import os

import bpy
import numpy as np
from mathutils import Vector

import geo
import rig
from timing import puff_params

HERE = os.path.dirname(os.path.abspath(__file__))


def ease_out(u, p=3):
    u = min(max(u, 0.0), 1.0)
    return 1.0 - (1.0 - u) ** p


def ease_in(u, p=2):
    u = min(max(u, 0.0), 1.0)
    return u ** p


# ------------------------------------------------------------------ 1 the car

def car(frame=23):
    """A generic modern sedan: a frosted blue lower body with the wheel
    arches cut into its side outline, an ice greenhouse on top split by a
    frosted B pillar, deep blue tyres with ice hubs, ice lamps."""
    ice = rig.ice("ice", 0.9, 1.5, absorb=1.2)
    body_m = rig.frosted("blue", 0.2, 1.0)
    deep = rig.frosted("deep", 0.0, 0.7, deep=True, rough=0.32)
    milk = rig.milk("lamp")
    R, cz = 0.47, 0.36            # arch radius, wheel centre height
    xr, xf = -1.42, 1.48          # rear and front axle
    sill = 0.27
    body = [(2.36, sill, 0.10), (2.44, 0.62, 0.16), (2.18, 0.86, 0.20), (0.92, 0.99, 0.10),
            (-1.86, 1.01, 0.10), (-2.34, 0.97, 0.12), (-2.42, 0.62, 0.16), (-2.30, sill, 0.10),
            (xr - R - 0.02, sill, 0.04)]
    body += geo.arc(xr, cz, R, 180, 0, 28)[1:-1]
    body += [(xr + R + 0.02, sill, 0.04), (xf - R - 0.02, sill, 0.04)]
    body += geo.arc(xf, cz, R, 180, 0, 28)[1:-1]
    body += [(xf + R + 0.02, sill, 0.04)]
    body = list(reversed(body))   # counter clockwise
    b = geo.slab("body", geo.rounded(body, 0.1, n=10), 0.88, 0.17, res=7)
    rig.assign(b, body_m)
    cab = [(1.00, 0.90, 0.0), (0.08, 1.46, 0.32), (-0.92, 1.46, 0.36), (-1.92, 0.94, 0.06), (-1.80, 0.90, 0.0)]
    c = geo.slab("cabin", geo.rounded(list(reversed(cab)), 0.1, n=10), 0.74, 0.20, res=7)
    rig.assign(c, ice)
    # the B pillar, a frosted band through the glass, a hair proud of it
    pil = [(-0.30, 0.94, 0.0), (-0.16, 1.50, 0.04), (-0.38, 1.50, 0.04), (-0.52, 0.94, 0.0)]
    p = geo.slab("pillar", geo.rounded(list(reversed(pil)), 0.04, n=4), 0.755, 0.05, res=3)
    rig.assign(p, body_m)
    parts = [b, c, p]
    for x in (xr, xf):
        for s in (-1, 1):
            tyre = geo.lathe("tyre", geo.profile([(0.0, -0.13), (0.24, -0.13), (0.36, -0.13), (0.36, 0.13),
                                                  (0.24, 0.13), (0.0, 0.13)], 0.08), n=96, axis="y")
            rig.assign(tyre, deep)
            tyre.location = (x, s * 0.70, cz)
            hub = geo.lathe("hub", geo.profile([(0.0, -0.02), (0.21, -0.02), (0.25, 0.0), (0.21, 0.02), (0.0, 0.02)], 0.02),
                            n=64, axis="y")
            rig.assign(hub, ice)
            hub.location = (x, s * 0.835, cz)
            parts += [tyre, hub]
    # lamps: a thin ice strip at each front corner, a milk strip at the tail
    for s in (-1, 1):
        lamp = geo.tube("lamp", [(2.30, s * 0.42, 0.80), (2.16, s * 0.70, 0.83)], 0.045)
        rig.assign(lamp, ice)
        tail = geo.tube("tail", [(-2.36, s * 0.45, 0.86), (-2.24, s * 0.72, 0.87)], 0.04)
        rig.assign(tail, milk)
        parts += [lamp, tail]
    geo.parent(parts, "car", rot=(0, 0, math.radians(208)))


# ------------------------------------------------------------------ 2 the key

def key(frame=23):
    """A modern fob: a frosted body, three ice buttons on its face, an ice
    ring through an eyelet at the top."""
    blue = rig.frosted("blue", -0.9, 1.0)
    ice = rig.ice("ice", -0.9, 1.4, absorb=1.4)
    pale = rig.milk("pale")
    W, H = 0.50, 0.98
    body = [(-W, -H), (W, -H), (W, H * 0.62), (0.0, H), (-W, H * 0.62)]
    fob = geo.slab("fob", geo.rounded(body, 0.42, n=14), 0.22, 0.13, res=7)
    rig.assign(fob, blue)
    parts = [fob]
    for z, r in ((0.32, 0.17), (-0.12, 0.15), (-0.52, 0.15)):
        bt = geo.lathe("btn", geo.profile([(0.0, -0.02), (r, -0.02), (r, 0.03), (0.0, 0.05)], 0.03), n=64, axis="y")
        rig.assign(bt, pale)
        bt.location = (0, -0.23, z)
        bt.rotation_euler = (0, 0, 0)
        parts.append(bt)
    eye = geo.lathe("eye", geo.profile([(0.0, -0.08), (0.11, -0.08), (0.11, 0.08), (0.0, 0.08)], 0.04), n=48, axis="y")
    rig.assign(eye, blue)
    eye.location = (0, 0, H + 0.02)
    ring = geo.tube("ring", [(0.36 * math.cos(t), 0.0, 0.36 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 96, endpoint=False)],
                    0.045, closed=True)
    rig.assign(ring, ice)
    ring.location = (0.0, 0.0, H + 0.36)
    ring.rotation_euler = (0, 0, math.radians(70))
    parts += [eye, ring]
    geo.parent(parts, "key", loc=(0, 0, 1.10), rot=(math.radians(-16), math.radians(-14), math.radians(-18)))


# ------------------------------------------------------------------ 3 the title

def _fold(co, yf, ang, rad):
    """Bend everything past y = yf up about the x axis by ang, over a soft
    crease of radius rad (the paper does not crack, it rolls)."""
    y, z = co[:, 1].copy(), co[:, 2].copy()
    L = ang * rad
    s = y - yf
    inb = (s > 0) & (s <= L)
    out = s > L
    th = np.where(inb, s / rad, ang)
    # inside the bend: on a circle of radius rad centred above the crease
    ny = np.where(inb, yf + (rad - z) * np.sin(th), y)
    nz = np.where(inb, rad - (rad - z) * np.cos(th), z)
    # past the bend: straight, rotated by ang
    d = s - L
    ey = yf + (rad - z) * math.sin(ang)
    ez = rad - (rad - z) * math.cos(ang)
    ny = np.where(out, ey + d * math.cos(ang), ny)
    nz = np.where(out, ez + d * math.sin(ang), nz)
    co[:, 1], co[:, 2] = ny, nz
    return co


def _apply_fold(mo, yf, ang, rad, sag):
    me = mo.data
    co = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    # a breath of curl along the sheet so it is paper, not a board
    co[:, 2] += sag * (co[:, 0] / 1.1) ** 2
    co = _fold(co, yf, ang, rad)
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def title(frame=23):
    """A sheet lying on the page, its top third folded up on a soft crease.
    Blank: a milk sheet, an ice inset border, a frosted seal. No text."""
    milk = rig.milk("paper")
    ice = rig.ice("ice", 0.0, 0.6, absorb=1.0)
    blue = rig.frosted("blue", 0.0, 0.3)
    Wd, Ln = 1.10, 1.42                       # half width, half length (8.5 x 11)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=60, y_subdivisions=90, size=1)
    sh = bpy.context.object
    sh.name = "sheet"
    sh.scale = (2 * Wd, 2 * Ln, 1)
    bpy.ops.object.transform_apply(scale=True)
    so = sh.modifiers.new("t", "SOLIDIFY")
    so.thickness = 0.022
    so.offset = 1.0
    geo.apply_mods(sh)
    rig.assign(sh, milk)
    geo._shade(sh)
    inset = 0.11
    bd = geo.rounded([(-Wd + inset, -Ln + inset), (Wd - inset, -Ln + inset), (Wd - inset, Ln - inset), (-Wd + inset, Ln - inset)],
                     0.05, n=6)
    pts = []
    for i in range(len(bd)):
        a, b = bd[i], bd[(i + 1) % len(bd)]
        k = max(2, int(np.hypot(*(b - a)) / 0.03))
        for t in range(k):
            q = a + (b - a) * t / k
            pts.append((q[0], q[1], 0.026))
    border = geo.tube("border", pts, 0.010, closed=True, res=3)
    rig.assign(border, blue)
    seal = geo.lathe("seal", geo.profile([(0.0, 0.02), (0.20, 0.02), (0.20, 0.05), (0.15, 0.065), (0.0, 0.065)], 0.02),
                     n=72, axis="z", modulate=lambda r, h, t: r + (0.012 * math.cos(24 * t) if r > 0.17 else 0.0))
    rig.assign(seal, blue)
    seal.location = (Wd - 0.42, -Ln + 0.46, 0.0)
    bpy.context.view_layer.update()
    seal.data.transform(seal.matrix_world)
    seal.matrix_world = seal.matrix_world.Identity(4)
    yf = Ln - 2 * Ln / 3 + 0.25
    for o in (sh, border, seal):
        _apply_fold(o, yf, math.radians(42), 0.10, 0.035)
    geo.parent([sh, border, seal], "title", loc=(0, 0, 0.18), rot=(0, 0, math.radians(-12)))


# ------------------------------------------------------------------ 4 the plate

TEXAS = [(-103.04, 36.50), (-100.00, 36.50), (-100.00, 34.56), (-99.2, 34.40), (-98.5, 34.10), (-97.9, 33.85),
         (-97.2, 33.84), (-96.6, 33.86), (-95.8, 33.87), (-95.3, 33.88), (-94.48, 33.64), (-94.04, 33.55),
         (-94.04, 33.02), (-94.04, 31.99), (-93.80, 31.50), (-93.55, 31.00), (-93.70, 30.40), (-93.84, 29.70),
         (-94.70, 29.35), (-95.10, 29.00), (-95.90, 28.60), (-96.60, 28.30), (-97.00, 27.90), (-97.30, 27.40),
         (-97.40, 26.80), (-97.15, 25.95), (-97.60, 26.05), (-98.20, 26.10), (-98.80, 26.40), (-99.20, 26.90),
         (-99.50, 27.50), (-100.10, 28.10), (-100.40, 28.60), (-100.65, 29.10), (-101.00, 29.40), (-101.60, 29.75),
         (-102.10, 29.80), (-102.40, 29.75), (-102.70, 29.50), (-102.85, 29.20), (-103.15, 28.98), (-103.50, 29.15),
         (-104.00, 29.35), (-104.50, 29.70), (-104.70, 30.10), (-104.95, 30.60), (-105.40, 30.90), (-106.00, 31.40),
         (-106.53, 31.78), (-106.62, 32.00), (-103.06, 32.00)]


def texas_outline(height, cx=0.0, cz=0.0):
    """The Texas border (public-domain coordinates, simplified), equirectangular
    with cos(31 degrees) on longitude, scaled to `height`, centred."""
    a = np.array(TEXAS, np.float64)
    x = a[:, 0] * math.cos(math.radians(31.0))
    z = a[:, 1]
    x -= (x.min() + x.max()) / 2
    z -= (z.min() + z.max()) / 2
    s = height / (z.max() - z.min())
    return [(cx + x[i] * s, cz + z[i] * s) for i in range(len(x))]


def plate(frame=23):
    """A blank plate: a frosted slab with a raised ice rim, four bolt slots
    and the Texas outline raised in ice. No state name, no number."""
    blue = rig.frosted("blue", -0.8, 0.8)
    ice = rig.ice("ice", -0.8, 0.8, absorb=1.2)
    W, H = 1.50, 0.75
    pl = geo.slab("plate", geo.rounded([(-W, -H), (W, -H), (W, H), (-W, H)], 0.14, n=10), 0.045, 0.03, res=5)
    rig.assign(pl, blue)
    # bolt slots: cut through with an exact boolean
    cut = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            s = geo.slab("slot", geo.rounded([(-0.10, -0.035), (0.10, -0.035), (0.10, 0.035), (-0.10, 0.035)], 0.034, n=6),
                         0.2, 0.0005, res=1)
            s.location = (sx * (W - 0.42), 0, sz * (H - 0.16))
            cut.append(s)
    cutter = geo.joined("cut", cut)
    bo = pl.modifiers.new("b", "BOOLEAN")
    bo.operation = "DIFFERENCE"
    bo.solver = "EXACT"
    bo.object = cutter
    geo.apply_mods(pl)
    bpy.data.objects.remove(cutter)
    geo._shade(pl, flat_axis=1)
    i = 0.075
    rimpts = geo.rounded([(-W + i, -H + i), (W - i, -H + i), (W - i, H - i), (-W + i, H - i)], 0.09, n=8)
    pts = []
    for k in range(len(rimpts)):
        a, b = rimpts[k], rimpts[(k + 1) % len(rimpts)]
        n = max(2, int(np.hypot(*(b - a)) / 0.04))
        pts += [(a[0] + (b[0] - a[0]) * t / n, -0.05, a[1] + (b[1] - a[1]) * t / n) for t in range(n)]
    rim = geo.tube("rim", pts, 0.022, closed=True, res=4)
    rig.assign(rim, ice)
    tx = texas_outline(1.0, 0.0, 0.0)
    tpts = []
    for k in range(len(tx)):
        a, b = np.array(tx[k]), np.array(tx[(k + 1) % len(tx)])
        n = max(1, int(np.hypot(*(b - a)) / 0.02))
        tpts += [(a[0] + (b[0] - a[0]) * t / n, -0.05, a[1] + (b[1] - a[1]) * t / n) for t in range(n)]
    tex = geo.tube("texas", tpts, 0.024, closed=True, res=4)
    rig.assign(tex, ice)
    geo.parent([pl, rim, tex], "plate", loc=(0, 0, 1.0), rot=(math.radians(-8), 0, math.radians(-16)))


# ------------------------------------------------------------------ 5 the pass tile

def pass_tile(frame=23):
    """A milk tile with a soft code grid in frosted blue: three finder
    squares and a seeded field of modules. It encodes nothing."""
    milk = rig.milk("tile")
    blue = rig.frosted("deep", -0.1, 0.2, deep=True, rough=0.3)
    S = 1.0
    t = geo.slab("tile", geo.rounded([(-S, -S), (S, -S), (S, S), (-S, S)], 0.30, n=12), 0.09, 0.06, res=6)
    rig.assign(t, milk)
    N, cell = 13, 0.118
    off = -cell * (N - 1) / 2
    g = np.random.default_rng(np.random.SeedSequence(20261013))
    on = g.uniform(size=(N, N)) < 0.48
    finder = np.zeros((N, N), bool)
    for (r0, c0) in ((0, 0), (0, N - 7), (N - 7, 0)):
        for r in range(7):
            for c in range(7):
                rr, cc = r0 + r, c0 + c
                ring = r in (0, 6) or c in (0, 6)
                core = 2 <= r <= 4 and 2 <= c <= 4
                on[rr, cc] = ring or core
                finder[rr, cc] = True
        # the quiet ring around each finder
        for r in range(-1, 8):
            for c in range(-1, 8):
                rr, cc = r0 + r, c0 + c
                if 0 <= rr < N and 0 <= cc < N and not (0 <= r < 7 and 0 <= c < 7):
                    on[rr, cc] = False
                    finder[rr, cc] = True
    mods = []
    for r in range(N):
        for c in range(N):
            if not on[r, c]:
                continue
            x, z = off + c * cell, -(off + r * cell)
            h = cell * 0.46
            m = geo.slab("m", geo.rounded([(-h, -h), (h, -h), (h, h), (-h, h)], h * 0.55, n=4), 0.018, 0.012, res=2)
            m.data.transform(__import__("mathutils").Matrix.Translation((x, -0.092, z)))
            mods.append(m)
    code = geo.joined("code", mods)
    rig.assign(code, blue)
    geo._shade(code, flat_axis=1)
    geo.parent([t, code], "pass", loc=(0, 0, 1.12), rot=(math.radians(-24), math.radians(6), math.radians(-14)))


# ------------------------------------------------------------------ 6 the clock ring (+ 9 bleeding)

def _arc_pts(R, a_deg, n_per_deg=0.6):
    """Clockwise from twelve o'clock through a_deg, in the xz plane."""
    n = max(2, int(a_deg * n_per_deg))
    t = np.radians(np.linspace(0, a_deg, n))
    return [(R * math.sin(v), -0.0, R * math.cos(v)) for v in t]


RING_R = 1.0
SWEEP = 250.0     # the still: the arc stops at 250 degrees (about 8:20 on a dial)


def ring_sweep(frame):
    """6: the arc sweeps from zero to SWEEP on expo out; frame 23 is the still."""
    return SWEEP * ease_out((frame + 1) / 24.0, 4)


def _ring(sweep, parts_extra=()):
    ice = rig.ice("ice", -1.1, 1.1, absorb=1.2)
    blue = rig.frosted("blue", -1.1, 1.1)
    track = geo.tube("track", [(RING_R * math.cos(t), 0.0, RING_R * math.sin(t)) for t in
                               np.linspace(0, 2 * math.pi, 180, endpoint=False)], 0.075, closed=True, res=6)
    rig.assign(track, ice)
    parts = [track]
    # twelve ticks inside the track, the dial
    for k in range(12):
        a = math.radians(30 * k)
        r0, r1 = RING_R - 0.17, RING_R - (0.27 if k % 3 == 0 else 0.22)
        tk = geo.tube("tick", [(r0 * math.sin(a), -0.02, r0 * math.cos(a)), (r1 * math.sin(a), -0.02, r1 * math.cos(a))],
                      0.022, res=3)
        rig.assign(tk, ice)
        parts.append(tk)
    if sweep > 0.5:
        pts = _arc_pts(RING_R, sweep)
        arc = geo.tube("arc", pts, 0.115, res=7, caps=True)
        rig.assign(arc, blue)
        parts.append(arc)
        for p in (pts[0], pts[-1]):
            cap = geo.lathe("cap", geo.profile([(0.0, -0.115), (0.115, 0.0), (0.0, 0.115)], 0.0), n=48, axis="y")
            rig.assign(cap, blue)
            cap.location = p
            parts.append(cap)
    # the crown: a short stem and button at twelve, so it reads as a timer
    stem = geo.lathe("stem", geo.profile([(0.0, 0.0), (0.06, 0.0), (0.06, 0.16), (0.0, 0.16)], 0.02), n=32, axis="z")
    rig.assign(stem, ice)
    stem.location = (0, 0, RING_R + 0.06)
    btn = geo.lathe("crown", geo.profile([(0.0, 0.0), (0.15, 0.0), (0.15, 0.09), (0.0, 0.12)], 0.035), n=48, axis="z")
    rig.assign(btn, blue)
    btn.location = (0, 0, RING_R + 0.21)
    parts += [stem, btn] + list(parts_extra)
    return parts


def clock(frame=23):
    parts = _ring(ring_sweep(frame))
    geo.parent(parts, "clock", loc=(0, 0, 1.30), rot=(math.radians(-10), 0, math.radians(-14)))


def drip_profile(length, bulb):
    """A drip as a lathe profile hanging down from 0: a neck that thins, then
    a teardrop of radius `bulb`."""
    pts = [(0.0, 0.02)]
    n = 18
    for i in range(n + 1):
        u = i / n
        z = -u * length
        r = 0.062 - 0.036 * math.sqrt(u)
        pts.append((r, z))
    # the drop
    for i in range(1, 13):
        a = math.pi * i / 12
        cz = -length - bulb * 0.9
        r = max(bulb * math.sin(a) * (1.0 - 0.25 * math.cos(a)), 1e-4)
        z = cz + bulb * 1.1 * math.cos(a)
        pts.append((r, z))
    pts.append((0.0, -length - bulb * 0.9 - bulb * 1.15))
    return pts


def drip_params(frame):
    """9: the drop gathers under the arc, lengthens and hangs (frame 23)."""
    u = (frame + 1) / 24.0
    return 0.03 + 0.30 * ease_out(u, 2), 0.04 + 0.10 * ease_out(min(1, u * 1.6), 2)


def bleed(frame=23):
    red = rig.red("red")
    length, bulb = drip_params(frame)
    # it hangs from the lowest point of the arc (six o'clock), on the front face
    d = geo.lathe("drip", drip_profile(length, bulb), n=48, axis="z")
    rig.assign(d, red)
    d.location = (0, -0.03, -RING_R + 0.02)
    # a thin red skin along the bottom of the arc where it bleeds from
    skin = geo.tube("skin", [(RING_R * math.sin(v), -0.012, RING_R * math.cos(v)) for v in np.radians(np.linspace(166, 194, 24))],
                    0.122, res=6)
    rig.assign(skin, red)
    parts = _ring(SWEEP, [d, skin])
    geo.parent(parts, "bleed", loc=(0, 0, 1.55), rot=(math.radians(-10), 0, math.radians(-14)))


# ------------------------------------------------------------------ 7 the hammer moment

WRIST = 2.0   # the wrist: the end of the handle, to the right of the head


def hammer_pose(frame):
    """Swing down on frames 0 to 6 (accelerating), contact at 6, a small
    rebound that holds. Returns the swing angle in degrees about the wrist."""
    if frame <= 6:
        return 26.0 * (1.0 - ease_in(frame / 6.0, 2.2))
    return 4.0 * ease_out((frame - 6) / 10.0, 3)


CLOUD_LIFT = 0.62     # the cloud floats: its base sits this high above the page


def hammer(frame=23, cloud_grid=None):
    """A gavel meeting a cloud: frosted head with ice bands, an ice handle;
    the cloud is the cloud rig's own volume, pressed and puffing."""
    blue = rig.frosted("blue", -0.4, 1.6)
    ice = rig.ice("ice", -0.4, 1.6, absorb=1.0)
    head = geo.lathe("head", geo.profile([(0.0, -0.55), (0.24, -0.55), (0.27, -0.50), (0.27, 0.50), (0.24, 0.55), (0.0, 0.55)], 0.05),
                     n=96, axis="z")
    rig.assign(head, blue)
    parts = [head]
    for z in (-0.33, 0.33):
        band = geo.lathe("band", geo.profile([(0.0, -0.045), (0.29, -0.045), (0.29, 0.045), (0.0, 0.045)], 0.03), n=96, axis="z")
        rig.assign(band, ice)
        band.location = (0, 0, z)
        parts.append(band)
    handle = geo.lathe("handle", geo.profile([(0.0, 0.0), (0.075, 0.0), (0.065, 1.2), (0.085, 1.65), (0.11, 1.75),
                                              (0.11, 1.88), (0.0, 1.95)], 0.04), n=48, axis="x")
    rig.assign(handle, ice)
    handle.location = (0.25, 0, 0)
    parts.append(handle)
    g = geo.parent(parts, "gavel")
    # world placement: the head stands on its strike face over the cloud's crown
    top = cloud_grid["top"] if cloud_grid else 1.10
    strike = CLOUD_LIFT + top * puff_params(max(frame, 0))["sy"] + 0.0 + 0.55
    piv = bpy.data.objects.new("wrist", None)
    geo.link(piv)
    piv.location = (WRIST, 0.0, strike)
    g.parent = piv
    g.location = (-WRIST, 0.0, 0.0)
    a = hammer_pose(frame)
    piv.rotation_euler = (0, math.radians(a), 0)   # positive lifts the head
    # the scene yaw so the head's round face and the handle both read
    yaw = bpy.data.objects.new("yaw", None)
    geo.link(yaw)
    piv.parent = yaw
    yaw.rotation_euler = (0, 0, math.radians(-18))
    if cloud_grid is not None:
        # the head sits at x = 0, the axis of the yaw, so it stays on the crown
        lo = tuple(cloud_grid["lo"][i] + (0, 0, CLOUD_LIFT + 0.44)[i] for i in range(3))
        hi = tuple(cloud_grid["hi"][i] + (0, 0, CLOUD_LIFT + 0.44)[i] for i in range(3))
        rig.cloud(cloud_grid["dens"], lo, hi, tuple(cloud_grid["res"]), density_scale=110.0)


# ------------------------------------------------------------------ 8 the deposit coin

STAR = [(math.cos(math.radians(90 + 36 * k)) * (0.36 if k % 2 == 0 else 0.15),
         math.sin(math.radians(90 + 36 * k)) * (0.36 if k % 2 == 0 else 0.15)) for k in range(10)]


def coin_pose(frame):
    """Coming back toward the viewer: from far up and right, it spins down
    and settles facing the camera. Ends still moving a little (the blur)."""
    u = (frame + 1) / 24.0
    e = 0.88 * ease_out(u, 3) + 0.12 * u
    p0, p1 = Vector((1.9, 7.5, 3.2)), Vector((0.0, 0.0, 1.05))
    loc = p0.lerp(p1, e)
    spin = 300.0 * (1.0 - e)
    return loc, (math.radians(-12 - 25 * (1 - e)), 0.0, math.radians(-34 + spin))


def coin(frame=23):
    blue = rig.frosted("blue", -0.4, 1.9)
    ice = rig.ice("ice", -0.4, 1.9, absorb=1.2)
    T = 0.075
    prof = geo.profile([(0.0, -T + 0.012), (0.70, -T + 0.012), (0.75, -T - 0.012), (0.85, -T - 0.012), (0.90, -T + 0.01),
                        (0.90, T - 0.01), (0.85, T + 0.012), (0.75, T + 0.012), (0.70, T - 0.012), (0.0, T - 0.012)], 0.02)
    c = geo.lathe("coin", prof, n=240, axis="y",
                  modulate=lambda r, h, t: r - (0.006 * (0.5 + 0.5 * math.cos(110 * t)) if r > 0.895 else 0.0))
    rig.assign(c, blue)
    st = geo.slab("star", geo.rounded(STAR, 0.03, n=4), 0.018, 0.012, res=2, y=-T)
    rig.assign(st, ice)
    st.data.transform(__import__("mathutils").Matrix.Translation((0, -0.004, 0)))
    g = geo.parent([c, st], "deposit")
    # keyframe the neighbours so Cycles motion blur has a path
    for f in (frame - 1, frame, frame + 1):
        loc, rot = coin_pose(f)
        g.location, g.rotation_euler = loc, rot
        g.keyframe_insert("location", frame=f)
        g.keyframe_insert("rotation_euler", frame=f)
    bpy.context.scene.frame_set(frame)


# ------------------------------------------------------------------ 10 the licence

def licence(frame=23):
    """A blank driver's licence: a frosted card (ID-1, 85.6 x 54), a milk photo
    well on the left, the Texas outline as a small raised ice mark at the top
    right. No text, no real design."""
    blue = rig.frosted("blue", 0.0, 1.8)
    ice = rig.ice("ice", 0.0, 1.8, absorb=1.2)
    milk = rig.milk("well")
    W, H = 1.30, 0.82
    card = geo.slab("card", geo.rounded([(-W, -H), (W, -H), (W, H), (-W, H)], 0.14, n=10), 0.04, 0.025, res=5)
    rig.assign(card, blue)
    geo._shade(card, flat_axis=1)
    well = geo.slab("well", geo.rounded([(-1.12, -0.58), (-0.42, -0.58), (-0.42, 0.40), (-1.12, 0.40)], 0.08, n=6),
                    0.012, 0.008, res=2, y=-0.045)
    rig.assign(well, milk)
    geo._shade(well, flat_axis=1)
    tx = texas_outline(0.62, 0.78, 0.30)
    tpts = []
    for k in range(len(tx)):
        a, b = np.array(tx[k]), np.array(tx[(k + 1) % len(tx)])
        n = max(1, int(np.hypot(*(b - a)) / 0.015))
        tpts += [(a[0] + (b[0] - a[0]) * t / n, -0.046, a[1] + (b[1] - a[1]) * t / n) for t in range(n)]
    mark = geo.tube("texas", tpts, 0.022, closed=True, res=3)
    rig.assign(mark, milk)
    geo.parent([card, well, mark], "licence", loc=(0, 0, 1.0), rot=(math.radians(-14), math.radians(4), math.radians(-14)))


# ------------------------------------------------------------------ 11 the insurance card

def _fold_x(co, xf, ang, rad):
    """The title's soft crease, turned: everything past x = xf lifts about the
    y axis."""
    sw = co[:, [1, 0, 2]].copy()
    sw = _fold(sw, xf, ang, rad)
    return sw[:, [1, 0, 2]]


def insurance(frame=23):
    """A blank insurance card folded once down the middle and lying half open:
    a thin frosted card with an ice inset border. No text."""
    blue = rig.frosted("blue", 0.0, 0.5)
    ice = rig.ice("ice", 0.0, 0.5, absorb=1.0)
    W, H = 1.30, 0.82
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=120, y_subdivisions=60, size=1)
    sh = bpy.context.object
    sh.name = "card"
    sh.scale = (2 * W, 2 * H, 1)
    bpy.ops.object.transform_apply(scale=True)
    so = sh.modifiers.new("t", "SOLIDIFY")
    so.thickness = 0.03
    so.offset = 1.0
    geo.apply_mods(sh)
    rig.assign(sh, blue)
    geo._shade(sh)
    inset = 0.09
    parts = [sh]
    for x0, x1 in ((-W + inset, -inset), (inset, W - inset)):
        bd = geo.rounded([(x0, -H + inset), (x1, -H + inset), (x1, H - inset), (x0, H - inset)], 0.05, n=6)
        pts = []
        for i in range(len(bd)):
            a, b = bd[i], bd[(i + 1) % len(bd)]
            k = max(2, int(np.hypot(*(b - a)) / 0.03))
            pts += [(a[0] + (b[0] - a[0]) * t / k, a[1] + (b[1] - a[1]) * t / k, 0.034) for t in range(k)]
        border = geo.tube("border", pts, 0.010, closed=True, res=3)
        rig.assign(border, ice)
        parts.append(border)
    for o in parts:
        me = o.data
        co = np.empty(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        co = _fold_x(co, 0.0, math.radians(30), 0.06)
        me.vertices.foreach_set("co", co.ravel())
        me.update()
    geo.parent(parts, "insurance", loc=(0.1, 0, 0.12), rot=(0, 0, math.radians(-10)))


# ------------------------------------------------------------------ the table

OBJECTS = {
    "car": dict(build=car, cam=(0.0, 16.0, 70.0), box=((-2.5, -1.4, 0.0), (2.5, 1.4, 1.55)), size=(1024, 640)),
    "key": dict(build=key, cam=(0.0, 20.0, 70.0), box=((-0.62, -0.5, 0.05), (0.62, 0.5, 2.55)), size=(1024, 1024)),
    "title": dict(build=title, cam=(0.0, 52.0, 70.0), box=((-1.25, -1.5, 0.1), (1.25, 1.35, 0.9)), size=(1024, 1024)),
    "plate": dict(build=plate, cam=(0.0, 12.0, 70.0), box=((-1.55, -0.35, 0.22), (1.55, 0.35, 1.78)), size=(1024, 640)),
    "pass": dict(build=pass_tile, cam=(0.0, 22.0, 70.0), box=((-1.05, -0.5, 0.15), (1.05, 0.5, 2.1)), size=(1024, 1024)),
    "clock": dict(build=clock, cam=(0.0, 12.0, 70.0), box=((-1.15, -0.3, 0.15), (1.15, 0.3, 2.75)), size=(1024, 1024),
                  frames=24),
    "hammer": dict(build=hammer, cam=(0.0, 14.0, 60.0), box=((-1.9, -0.8, 0.45), (1.9, 0.8, 3.5)), size=(1024, 1024),
                   frames=24, cloud=True),
    "coin": dict(build=coin, cam=(0.0, 14.0, 70.0), box=((-0.95, -0.4, 0.1), (0.95, 0.4, 2.0)), size=(1024, 1024),
                 frames=24, blur=True),
    "licence": dict(build=licence, cam=(0.0, 18.0, 70.0), box=((-1.32, -0.4, 0.1), (1.32, 0.4, 1.95)), size=(1024, 640)),
    "insurance": dict(build=insurance, cam=(0.0, 40.0, 70.0), box=((-1.3, -0.95, 0.05), (1.3, 0.95, 0.95)), size=(1024, 640)),
    "bleed": dict(build=bleed, cam=(0.0, 12.0, 70.0), box=((-1.15, -0.3, 0.15), (1.15, 0.3, 2.95)), size=(1024, 1024),
                  frames=24),
}
