"""Geometry helpers for scene-3d (bpy 4.2): rounded outlines, curve slabs,
tubes, lathes. All pure functions of their arguments."""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def rounded(pts, radius, n=10, closed=True):
    """Fillet a polyline. pts: list of (x, y) or (x, y, r) with a per-corner
    radius; radius is the default. Returns an (N, 2) array."""
    P = [(p[0], p[1], p[2] if len(p) > 2 else radius) for p in pts]
    out = []
    m = len(P)
    for i in range(m):
        x, y, r = P[i]
        if not closed and (i == 0 or i == m - 1) or r <= 0:
            out.append((x, y))
            continue
        a = np.array(P[i - 1][:2]); b = np.array((x, y)); c = np.array(P[(i + 1) % m][:2])
        u = a - b; v = c - b
        lu, lv = np.linalg.norm(u), np.linalg.norm(v)
        u /= lu; v /= lv
        ang = math.acos(max(-1.0, min(1.0, float(u @ v))))
        if ang < 1e-3 or abs(ang - math.pi) < 1e-3:
            out.append((x, y))
            continue
        t = r / math.tan(ang / 2)
        t = min(t, lu * 0.49, lv * 0.49)
        rr = t * math.tan(ang / 2)
        p0 = b + u * t; p1 = b + v * t
        bis = (u + v) / np.linalg.norm(u + v)
        cen = b + bis * (rr / math.sin(ang / 2))
        a0 = math.atan2(*(p0 - cen)[::-1]); a1 = math.atan2(*(p1 - cen)[::-1])
        d = a1 - a0
        while d > math.pi: d -= 2 * math.pi
        while d < -math.pi: d += 2 * math.pi
        for k in range(n + 1):
            t_ = a0 + d * k / n
            out.append((cen[0] + rr * math.cos(t_), cen[1] + rr * math.sin(t_)))
    return np.array(out)


def arc(cx, cy, r, a0, a1, n=24):
    """Points on an arc from angle a0 to a1 (degrees), radius r."""
    t = np.radians(np.linspace(a0, a1, n))
    return [(cx + r * math.cos(v), cy + r * math.sin(v), 0.0) for v in t]


def _mesh_from_curve(ob, name):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    mo = bpy.data.objects.new(name, me)
    mo.matrix_world = ob.matrix_world.copy()
    link(mo)
    bpy.data.objects.remove(ob)
    return mo


def _shade(mo, flat_axis=None):
    me = mo.data
    for p in me.polygons:
        p.use_smooth = True
        if flat_axis is not None and abs(p.normal[flat_axis]) > 0.999:
            p.use_smooth = False
    return mo


def slab(name, pts, half, bevel, res=6, plane="xz", y=0.0):
    """A rounded slab: the 2D outline pts (closed, already filleted),
    extruded to +-half thickness, every edge rounded by `bevel`.
    plane xz: the outline is in x (right) and z (up), thickness along y."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, (x, z) in enumerate(pts):
        sp.points[i].co = (x, z, 0.0, 1.0)
    sp.use_cyclic_u = True
    cu.extrude = max(half - bevel, 1e-4)
    cu.bevel_depth = bevel
    cu.bevel_resolution = res
    ob = link(bpy.data.objects.new(name, cu))
    if plane == "xz":
        ob.rotation_euler = (math.radians(90), 0, 0)
        ob.location = (0, y, 0)
    bpy.context.view_layer.update()
    mo = _mesh_from_curve(ob, name)
    # bake the transform so later numpy edits work in world space
    mo.data.transform(mo.matrix_world)
    mo.matrix_world = Matrix.Identity(4)
    return _shade(mo, flat_axis=1 if plane == "xz" else 2)


def tube(name, pts3, radius, closed=False, res=6, caps=True):
    """A round tube along a 3D polyline."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts3) - 1)
    for i, p in enumerate(pts3):
        sp.points[i].co = (p[0], p[1], p[2], 1.0)
    sp.use_cyclic_u = closed
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = caps
    ob = link(bpy.data.objects.new(name, cu))
    bpy.context.view_layer.update()
    mo = _mesh_from_curve(ob, name)
    return _shade(mo)


def lathe(name, prof, n=128, axis="z", modulate=None):
    """Surface of revolution. prof: list of (r, h) from one pole to the other
    (r = 0 at a pole). modulate(r, h, theta) -> r lets an edge be reeded."""
    bm = bmesh.new()
    rings = []
    th = np.linspace(0, 2 * math.pi, n, endpoint=False)
    for r, h in prof:
        if r <= 1e-6:
            rings.append([bm.verts.new(_ax(0.0, 0.0, h, axis))])
            continue
        ring = []
        for t in th:
            rr = modulate(r, h, t) if modulate else r
            ring.append(bm.verts.new(_ax(rr * math.cos(t), rr * math.sin(t), h, axis)))
        rings.append(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(n):
                bm.faces.new((a[0], b[i], b[(i + 1) % n]))
        elif len(b) == 1:
            for i in range(n):
                bm.faces.new((a[(i + 1) % n], a[i], b[0]))
        else:
            for i in range(n):
                bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    mo = link(bpy.data.objects.new(name, me))
    return _shade(mo)


def _ax(x, y, h, axis):
    if axis == "z":
        return (x, y, h)
    if axis == "y":
        return (x, h, y)
    return (h, x, y)


def profile(pts, radius, n=8):
    """Fillet an open (r, h) profile; the poles stay put."""
    return [tuple(p) for p in rounded(pts, radius, n=n, closed=False)]


def subdivide(mo, levels=2):
    m = mo.modifiers.new("sub", "SUBSURF")
    m.levels = m.render_levels = levels
    return mo


def apply_mods(mo):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(mo.evaluated_get(dg))
    old = mo.data
    mo.modifiers.clear()
    mo.data = me
    bpy.data.meshes.remove(old)
    return mo


def parent(children, empty_name, loc=(0, 0, 0), rot=(0, 0, 0)):
    e = link(bpy.data.objects.new(empty_name, None))
    for c in children:
        c.parent = e
    e.location = loc
    e.rotation_euler = rot
    return e


def joined(name, objs):
    """Join mesh objects into one (they must share a material)."""
    bpy.context.view_layer.update()   # matrix_world is stale until the layer updates
    bm = bmesh.new()
    for o in objs:
        me = o.data.copy()
        me.transform(o.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        bpy.data.objects.remove(o)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))
