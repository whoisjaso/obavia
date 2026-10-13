"""Build the Obavia mark in 3D and render one shot with Cycles.

Run with the bpy venv python:
  python mark3d.py --mark a --look day --res 256 --samples 32 --out /path/x.png
  python mark3d.py --mark a --look day --turn --res 512 --samples 64 --out /dir/   (60 frames)

mark a: obavia-co/assets/obavia-connected-mark.svg, the two interlocking paths (ice and blue).
mark b: desk/public/mark.svg, the orb with the white ribbon (live favicon, Desk, app, films).
look:   day (house sky light, contact shadow), ink (dark lane, ice lit from behind),
        flat (frontal soft light, no tilt, for 16 and 32 px).
Deterministic: fixed Cycles seed, no animated seed, no random calls.
"""
import argparse, math, os, sys, time
import bpy, bmesh
T_START = time.time()
import numpy as np
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SVG_A = os.path.join(ROOT, 'obavia-co/assets/obavia-connected-mark.svg')

ap = argparse.ArgumentParser()
ap.add_argument('--mark', default='a', choices=['a', 'b'])
ap.add_argument('--look', default='day', choices=['day', 'ink', 'flat'])
ap.add_argument('--res', type=int, default=256)
ap.add_argument('--samples', type=int, default=32)
ap.add_argument('--fit', type=float, default=0.74, help='mark diameter as a fraction of the frame')
ap.add_argument('--turn', action='store_true')
ap.add_argument('--frames', default='0-59')
ap.add_argument('--out', required=True)
ap.add_argument('--blend', default='')
ap.add_argument('--clay', action='store_true', help='debug: grey diffuse override')
ap.add_argument('--hide', default='', help='debug: object name to hide')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
cy = sc.cycles
cy.device = 'CPU'
cy.samples = args.samples
cy.seed = 7
cy.use_animated_seed = False
cy.use_denoising = True
cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 12
cy.transmission_bounces = 12
cy.transparent_max_bounces = 8
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.015
cy.glossy_bounces = 8
cy.diffuse_bounces = 4
cy.blur_glossy = 0.6
cy.caustics_refractive = False  # caustic paths only fed noise into the contact shadow; refraction seen by the camera is unaffected
cy.caustics_reflective = False
cy.sample_clamp_indirect = 8.0
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = args.res
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.color_depth = '16'
sc.render.threads_mode = 'AUTO'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.0
sc.render.dither_intensity = 0.0  # dither happens once, in post, on the 16-bit data

R = Vector((0, 0, 0))
rig = bpy.data.objects.new('rig', None)  # the mark hangs off this for the turn
sc.collection.objects.link(rig)


def principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.subsurface_method = 'BURLEY'
    for k, v in kw.items():
        p.inputs[k].default_value = v
    return m, nt, p


def glass_shadow(m, color, amount):
    """Shadow rays pass through the glass tinted, instead of stopping dead: the light a caustic
    would carry, without paying for caustic paths."""
    nt = m.node_tree; n = nt.nodes
    outn = n['Material Output']; p = n['Principled BSDF']
    lp = n.new('ShaderNodeLightPath')
    tr = n.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = srgb(color)
    mx = n.new('ShaderNodeMixShader')
    mm = n.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = amount
    nt.links.new(lp.outputs['Is Shadow Ray'], mm.inputs[0])
    nt.links.new(mm.outputs[0], mx.inputs['Fac'])
    nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], outn.inputs['Surface'])


def gradient_color(nt, p, a, b, stops):
    """Linear gradient in object space from point a to point b (2D), like an SVG linearGradient."""
    n = nt.nodes
    tc = n.new('ShaderNodeTexCoord')
    sub = n.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
    sub.inputs[1].default_value = (a[0], a[1], 0)
    d = Vector((b[0] - a[0], b[1] - a[1], 0))
    dot = n.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = d / d.length_squared
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'EASE'
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], srgb(stops[0][1])
    el[1].position, el[1].color = stops[-1][0], srgb(stops[-1][1])
    for pos, col in stops[1:-1]:
        e = el.new(pos); e.color = srgb(col)
    nt.links.new(tc.outputs['Object'], sub.inputs[0])
    nt.links.new(sub.outputs[0], dot.inputs[0])
    nt.links.new(dot.outputs['Value'], ramp.inputs[0])
    return ramp


def svgpt(x, y, c=64.0, r=54.0):
    """SVG user space to normalized object space: disc radius 1, +Y up."""
    return ((x - c) / r, (c - y) / r)


def shade_smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


# ---------------------------------------------------------------- mark a
from mathutils.geometry import interpolate_bezier
N = 512  # field grid over [-1.1, 1.1]^2
G = np.linspace(-1.1, 1.1, N)


def inside(poly, X, Y):
    """Even-odd point in polygon, vectorised over a grid."""
    res = np.zeros(X.shape, bool)
    x0, y0 = poly[:, 0], poly[:, 1]
    x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
    for a, b, c, d in zip(x0, y0, x1, y1):
        cond = (b > Y) != (d > Y)
        with np.errstate(divide='ignore', invalid='ignore'):
            xi = a + (Y - b) * (c - a) / (d - b)
        res ^= cond & (X < xi)
    return res


def blur(img, sigma_px):
    f = np.fft.fftfreq(img.shape[0])
    g = np.exp(-2 * (np.pi * sigma_px) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(img) * g))


def depth_field(p_ice, p_blue):
    """+1 where the ice crosses over the blue (upper crossing), -1 at the lower crossing,
    a smooth normalised-convolution blend in between, so each hook bends gently through
    its own free length instead of creasing along one line."""
    X, Y = np.meshgrid(G, G)
    ov = inside(p_ice, X, Y) & inside(p_blue, X, Y)
    sgn = np.where(Y > 0, 1.0, -1.0) * ov
    sig = 18 / 54 / (2.2 / N)  # 18 SVG units
    num, den = blur(sgn, sig), blur(ov.astype(float), sig)
    f = num / np.maximum(den, 1e-6)
    f = np.clip(f, -1, 1)
    f = np.tanh(2.4 * f) / np.tanh(2.4)  # saturate toward the crossings, smooth through zero (no crease)
    return f, float(np.abs(f[ov]).min())


def sample_field(f, x, y):
    u = (x + 1.1) / 2.2 * (N - 1); v = (y + 1.1) / 2.2 * (N - 1)
    i = np.clip(np.floor(u).astype(int), 0, N - 2); j = np.clip(np.floor(v).astype(int), 0, N - 2)
    du, dv = u - i, v - j
    return (f[j, i] * (1 - du) * (1 - dv) + f[j, i + 1] * du * (1 - dv)
            + f[j + 1, i] * (1 - du) * dv + f[j + 1, i + 1] * du * dv)


def build_a():
    import addon_utils
    addon_utils.enable('io_curve_svg', default_set=True)
    bpy.ops.import_curve.svg(filepath=SVG_A)
    curves = [o for o in bpy.data.objects if o.type == 'CURVE']
    blue_c, ice_c = curves[0], curves[1]  # document order: blue path, then ice path
    # normalise: the union of both paths is the disc x,y in [10,118]
    pts = []
    for o in curves:
        for s in o.data.splines:
            for bp in s.bezier_points:
                pts.append(o.matrix_world @ bp.co)
    # the imported anchors include (64,10),(64,118),(118,64),(10,64) exactly
    xs = [p.x for p in pts]; ys = [p.y for p in pts]
    cx, cy_ = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    k = 2.0 / (max(xs) - min(xs))
    H, BEV = 0.13, 0.058  # body depth and bevel radius, disc radius = 1
    GAP = 0.03
    polys = {}
    for o, name in ((blue_c, 'blue'), (ice_c, 'ice')):
        mw = o.matrix_world
        poly = []
        for sp in o.data.splines:
            bps = list(sp.bezier_points)
            for i in range(len(bps)):
                a, b = bps[i], bps[(i + 1) % len(bps)]
                seg = interpolate_bezier(mw @ a.co, mw @ a.handle_right, mw @ b.handle_left, mw @ b.co, 48)
                poly += [((v.x - cx) * k, (v.y - cy_) * k) for v in seg[:-1]]
        polys[name] = np.array(poly)
    field, fmin = depth_field(polys['ice'], polys['blue'])
    A = (H + GAP) / (2 * fmin)  # every overlapping pixel keeps H + GAP of daylight between the bodies
    print(f'FIELD min |f| on overlap {fmin:.3f}, swing A {A:.3f}')
    out = {}
    for o, name in ((blue_c, 'blue'), (ice_c, 'ice')):
        mw = o.matrix_world.copy()
        for s in o.data.splines:
            for bp in s.bezier_points:
                for attr in ('co', 'handle_left', 'handle_right'):
                    v = mw @ getattr(bp, attr)
                    setattr(bp, attr, Vector(((v.x - cx) * k, (v.y - cy_) * k, 0)))
            s.resolution_u = 64
        o.matrix_world = Matrix.Identity(4)
        cd = o.data
        cd.dimensions = '2D'
        cd.fill_mode = 'BOTH'
        cd.extrude = H / 2 - BEV * 0.6
        cd.bevel_depth = BEV
        cd.bevel_resolution = 8
        cd.offset = -BEV
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        o = bpy.context.view_layer.objects.active
        o.name = name
        rm = o.modifiers.new('remesh', 'REMESH')
        rm.mode = 'VOXEL'; rm.voxel_size = 0.0045; rm.adaptivity = 0.0
        bpy.ops.object.modifier_apply(modifier='remesh')
        sm = o.modifiers.new('smooth', 'CORRECTIVE_SMOOTH')
        sm.iterations = 4; sm.smooth_type = 'SIMPLE'; sm.use_only_smooth = True
        bpy.ops.object.modifier_apply(modifier='smooth')
        # the under-over: ice rides over at the top crossing, blue over at the bottom one.
        me = o.data
        co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        side = np.tanh(co[:, 2] / (H / 2) * 3)  # +1 front face, -1 back face, smooth across the wall
        f = sample_field(field, co[:, 0], co[:, 1])
        sign = 1.0 if name == 'ice' else -1.0
        co[:, 2] += sign * A * f
        # a breath of volume: each face domes a little toward the middle of the disc (cloud volume)
        r = np.sqrt(co[:, 0] ** 2 + co[:, 1] ** 2)
        co[:, 2] += side * 0.010 * np.clip(1 - r, 0, 1)
        me.vertices.foreach_set('co', co.ravel())
        me.update()
        shade_smooth(o)
        o.parent = rig
        out[name] = o
    ice_m, nt, p = principled('ice', **{
        'Roughness': 0.07, 'IOR': 1.45, 'Transmission Weight': 0.95,
        'Subsurface Weight': 0.04, 'Subsurface Scale': 0.05,
        'Coat Weight': 0.0, 'Specular IOR Level': 0.5})
    p.inputs['Subsurface Radius'].default_value = (0.6, 0.8, 1.0)
    ramp = gradient_color(nt, p, svgpt(20, 22), svgpt(84, 102), [(0, '#F4F7FF'), (0.15, '#E7EEFE'), (1, '#A9BFF0')])
    # Principled multiplies by the base colour at every interface, so a grazing ray that reflects
    # inside the slab five times went bruise-dark. The surface keeps the SVG gradient at 45 percent;
    # the rest of the colour lives in the volume, where it tints by path length like real ice.
    wmix = nt.nodes.new('ShaderNodeMix'); wmix.data_type = 'RGBA'
    wmix.inputs['Factor'].default_value = 0.55; wmix.inputs['B'].default_value = (1, 1, 1, 1)
    nt.links.new(ramp.outputs[0], wmix.inputs['A'])
    nt.links.new(wmix.outputs['Result'], p.inputs['Base Color'])
    va = nt.nodes.new('ShaderNodeVolumeAbsorption')
    va.inputs['Color'].default_value = srgb('#B9CBF4'); va.inputs['Density'].default_value = 1.8
    nt.links.new(va.outputs[0], nt.nodes['Material Output'].inputs['Volume'])
    blue_m, nt, p = principled('blue', **{
        'Roughness': 0.22, 'IOR': 1.45, 'Transmission Weight': 0.35,
        'Subsurface Weight': 0.12, 'Subsurface Scale': 0.03})
    p.inputs['Subsurface Radius'].default_value = (0.5, 0.7, 1.0)
    ramp = gradient_color(nt, p, svgpt(96, 20), svgpt(46, 114), [(0, '#A8BFF0'), (0.85, '#637FAE'), (1, '#5A75A6')])
    nt.links.new(ramp.outputs[0], p.inputs['Base Color'])
    glass_shadow(ice_m, '#E3EBFD', 0.85)
    glass_shadow(blue_m, '#8FA7DA', 0.45)
    if args.look == 'flat':
        # 16 and 32 px: a flatter, more graphic split so ice and blue still separate in two or three pixels
        ice_m.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.35
        ice_m.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = 0.6
        blue_m.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.08
        ice_m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.3
        blue_m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.4
    out['ice'].data.materials.clear(); out['ice'].data.materials.append(ice_m)
    out['blue'].data.materials.clear(); out['blue'].data.materials.append(blue_m)
    return H / 2 + A + 0.012  # half depth of the stack, for placing the ground


# ---------------------------------------------------------------- mark b
def svg_arc(p0, p1, r, large, sweep, n=96):
    """SVG elliptical arc (circle case), endpoint to centre parametrisation, y-down space."""
    x1, y1 = p0; x2, y2 = p1
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    d2 = dx * dx + dy * dy
    r = max(r, math.sqrt(d2))
    f = math.sqrt(max(r * r - d2, 0) / d2)
    if large == sweep:
        f = -f
    cxp, cyp = f * dy, -f * dx
    cx, cy = cxp + (x1 + x2) / 2, cyp + (y1 + y2) / 2
    a0 = math.atan2(y1 - cy, x1 - cx); a1 = math.atan2(y2 - cy, x2 - cx)
    da = a1 - a0
    if sweep and da < 0: da += 2 * math.pi
    if not sweep and da > 0: da -= 2 * math.pi
    return [(cx + r * math.cos(a0 + da * i / n), cy + r * math.sin(a0 + da * i / n)) for i in range(n + 1)]


def build_b():
    # orb: circle r=30 in a 64 box -> radius 1, a soft lens of glass
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1.0)
    orb = bpy.context.object; orb.name = 'orb'
    OZ = 0.26
    orb.scale = (1, 1, OZ); bpy.ops.object.transform_apply(scale=True)
    shade_smooth(orb)
    orb.parent = rig
    m, nt, p = principled('orb', **{
        'Roughness': 0.1, 'IOR': 1.45, 'Transmission Weight': 0.82,
        'Subsurface Weight': 0.05, 'Subsurface Scale': 0.1})
    p.inputs['Subsurface Radius'].default_value = (0.6, 0.8, 1.0)
    # SVG: linear (0,0)->(1,1) of the circle bbox, stops E9EFFE / .55 B8C8F1 / 869FD6
    ramp = gradient_color(nt, p, (-1, 1), (1, -1), [(0, '#E9EFFE'), (0.55, '#B8C8F1'), (1, '#869FD6')])
    # SVG: radial at (.75,.35) r .4 of bbox, #5A73B0 at 32 percent fading out
    n = nt.nodes
    tc = n.new('ShaderNodeTexCoord')
    dist = n.new('ShaderNodeVectorMath'); dist.operation = 'DISTANCE'
    dist.inputs[1].default_value = (0.5, 0.3, 0)
    mr = n.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0
    mr.inputs['From Max'].default_value = 0.8; mr.inputs['To Min'].default_value = 0.32
    mr.inputs['To Max'].default_value = 0.0
    mix = n.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['B'].default_value = srgb('#5A73B0')
    nt.links.new(tc.outputs['Object'], dist.inputs[0])
    nt.links.new(dist.outputs['Value'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], mix.inputs['Factor'])
    nt.links.new(ramp.outputs[0], mix.inputs['A'])
    nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    glass_shadow(m, '#DCE5FB', 0.7)
    orb.data.materials.append(m)
    # ribbon: the two arcs of the stroke, rotate(-35.5) about the centre, width 7 -> tube radius 3.5/30
    pts = svg_arc((8.82, -10.79), (0, 0), 9.0, 1, 0) + svg_arc((0, 0), (-7.28, 3.71), 9.0, 1, 1)[1:]
    th = math.radians(-35.5)
    TR = 3.5 / 30
    cu = bpy.data.curves.new('ribbon', 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, (x, y) in enumerate(pts):
        sx = x * math.cos(th) - y * math.sin(th)
        sy = x * math.sin(th) + y * math.cos(th)
        X, Y = sx / 30, -sy / 30
        zs = OZ * math.sqrt(max(1 - X * X - Y * Y, 0))
        sp.points[i].co = (X, Y, zs + TR * 0.55, 1)
    cu.bevel_depth = TR; cu.bevel_resolution = 10; cu.use_fill_caps = True
    rib = bpy.data.objects.new('ribbon', cu); sc.collection.objects.link(rib)
    bpy.ops.object.select_all(action='DESELECT'); rib.select_set(True)
    bpy.context.view_layer.objects.active = rib
    bpy.ops.object.convert(target='MESH')
    rib = bpy.context.view_layer.objects.active
    # round caps (stroke-linecap: round)
    ends = []
    for (x, y) in (pts[0], pts[-1]):
        sx = x * math.cos(th) - y * math.sin(th); sy = x * math.sin(th) + y * math.cos(th)
        X, Y = sx / 30, -sy / 30
        ends.append(Vector((X, Y, OZ * math.sqrt(max(1 - X * X - Y * Y, 0)) + TR * 0.55)))
    caps = []
    for e in ends:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=TR, location=e)
        caps.append(bpy.context.object)
    bpy.ops.object.select_all(action='DESELECT')
    for o in caps + [rib]: o.select_set(True)
    bpy.context.view_layer.objects.active = rib
    bpy.ops.object.join()
    rib = bpy.context.view_layer.objects.active
    rm = rib.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.004
    bpy.ops.object.modifier_apply(modifier='remesh')
    shade_smooth(rib)
    rib.parent = rig
    m, nt, p = principled('ribbon', **{
        'Base Color': srgb('#FFFFFF'), 'Roughness': 0.32, 'IOR': 1.45,
        'Transmission Weight': 0.15, 'Subsurface Weight': 0.55, 'Subsurface Scale': 0.06})
    p.inputs['Subsurface Radius'].default_value = (0.75, 0.85, 1.0)
    rib.data.materials.append(m)
    return OZ + 2 * TR


half = build_a() if args.mark == 'a' else build_b()

# ---------------------------------------------------------------- world, ground, lights, camera
look = args.look
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
wn = w.node_tree.nodes; bg = wn['Background']
tcw = wn.new('ShaderNodeTexCoord'); sep = wn.new('ShaderNodeSeparateXYZ')
mrw = wn.new('ShaderNodeMapRange'); mrw.inputs['From Min'].default_value = -0.2; mrw.inputs['From Max'].default_value = 1.0
mixw = wn.new('ShaderNodeMix'); mixw.data_type = 'RGBA'
w.node_tree.links.new(tcw.outputs['Generated'], sep.inputs[0])
# camera looks down -Z; the screen "up" is world +Y, so the sky gradient runs along Y
w.node_tree.links.new(sep.outputs['Y'], mrw.inputs['Value'])
w.node_tree.links.new(mrw.outputs['Result'], mixw.inputs['Factor'])
w.node_tree.links.new(mixw.outputs['Result'], bg.inputs['Color'])
if look == 'ink':
    mixw.inputs['A'].default_value = srgb('#1C2436'); mixw.inputs['B'].default_value = srgb('#2A3550')
    bg.inputs['Strength'].default_value = 1.0
else:
    mixw.inputs['A'].default_value = srgb('#F2F6FF'); mixw.inputs['B'].default_value = srgb('#DCE6FA')
    # the sky lights the mark at half strength, but what the glass reflects or refracts is the
    # sky at full strength (a dim world seen through a grazing edge read as a bruise)
    lpw = wn.new('ShaderNodeLightPath')
    msw = wn.new('ShaderNodeMix'); msw.data_type = 'FLOAT'
    msw.inputs['A'].default_value = 1.0; msw.inputs['B'].default_value = 0.5 if look == 'day' else 0.6
    w.node_tree.links.new(lpw.outputs['Is Diffuse Ray'], msw.inputs['Factor'])
    w.node_tree.links.new(msw.outputs['Result'], bg.inputs['Strength'])

if look == 'day':
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -half - 0.04))
    gnd = bpy.context.object; gnd.is_shadow_catcher = True
    gnd.visible_transmission = False  # refracted rays pass on to the backdrop below
    gnd.visible_glossy = False        # and the catcher never shows up dark in a reflection
if look in ('day', 'ink'):
    # the page behind the mark, visible to refraction and reflection only, so the glass bends
    # the real house sky (or the ink lane) while the film stays transparent for compositing
    fw = 2.0 / args.fit
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -half - 0.08))
    bd = bpy.context.object; bd.scale = (fw * 3, fw * 3, 1)  # three frames wide
    bd.visible_camera = False; bd.visible_shadow = False; bd.visible_diffuse = False
    bm_, bnt, _ = principled('backdrop')
    bn = bnt.nodes; bn.remove(bn['Principled BSDF'])
    em = bn.new('ShaderNodeEmission')
    if look == 'ink':
        # the lane is ink, but behind the mark sits a cool glow: the ice is lit from behind
        tco = bn.new('ShaderNodeTexCoord'); dd = bn.new('ShaderNodeVectorMath'); dd.operation = 'LENGTH'
        mr2 = bn.new('ShaderNodeMapRange')
        mr2.inputs['From Min'].default_value = 0.0; mr2.inputs['From Max'].default_value = args.fit / 6 * 2.0
        rp = bn.new('ShaderNodeValToRGB'); rp.color_ramp.interpolation = 'EASE'
        rp.color_ramp.elements[0].color = srgb('#8EA6DD'); rp.color_ramp.elements[1].color = srgb('#1C2436')
        e = rp.color_ramp.elements.new(0.5); e.color = srgb('#3A4B74')
        bnt.links.new(tco.outputs['Object'], dd.inputs[0]); bnt.links.new(dd.outputs['Value'], mr2.inputs['Value'])
        bnt.links.new(mr2.outputs['Result'], rp.inputs[0]); bnt.links.new(rp.outputs[0], em.inputs['Color'])
    else:
        tco = bn.new('ShaderNodeTexCoord'); sx = bn.new('ShaderNodeSeparateXYZ')
        mr2 = bn.new('ShaderNodeMapRange')
        # plane object Y in [-0.5, 0.5] over 3 frames; the frame is the middle third
        mr2.inputs['From Min'].default_value = 1 / 6; mr2.inputs['From Max'].default_value = 1 / 6 - 0.6 / 3
        rp = bn.new('ShaderNodeValToRGB')
        rp.color_ramp.elements[0].color = srgb('#DCE6FA'); rp.color_ramp.elements[1].color = srgb('#F2F6FF')
        bnt.links.new(tco.outputs['Object'], sx.inputs[0]); bnt.links.new(sx.outputs['Y'], mr2.inputs['Value'])
        bnt.links.new(mr2.outputs['Result'], rp.inputs[0]); bnt.links.new(rp.outputs[0], em.inputs['Color'])
    bnt.links.new(em.outputs[0], bn['Material Output'].inputs['Surface'])
    bd.data.materials.append(bm_)


def look_at(fwd, up=Vector((0, 1, 0))):
    """Camera or light basis: local -Z along fwd, local +Y as close to world +Y as possible.
    (to_track_quat is ambiguous when fwd is exactly -Z and flipped the frontal render 180 degrees.)"""
    f = Vector(fwd).normalized()
    r = f.cross(up)
    if r.length < 1e-6:
        r = f.cross(Vector((0, 0, 1)))
    r.normalize()
    u = r.cross(f)
    return Matrix((r, u, -f)).transposed().to_euler()


def area(name, loc, size, energy, color, shape='DISK', target=R, size_y=None):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = shape; ld.size = size
    if size_y: ld.size_y = size_y
    ld.energy = energy; ld.color = srgb(color)[:3]
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = look_at(Vector(target) - Vector(loc))
    o.visible_camera = False
    return o


if look == 'day':
    # softboxes, not points: glass is read by the shapes it reflects
    area('key', (-4.0, 4.6, 6.5), 3.0, 750, '#FFFFFF', shape='RECTANGLE', size_y=7.0)
    area('rim', (6.0, -0.6, 1.2), 0.5, 380, '#BFD2FF', shape='RECTANGLE', size_y=6.0)
    area('fill', (1.5, -5, 4), 6.0, 90, '#E8EEFF')
    area('top', (0.0, 6.5, 3.5), 7.0, 160, '#F2F6FF', shape='RECTANGLE', size_y=0.6)
elif look == 'flat':
    area('key', (-1.2, 1.8, 8.0), 9.0, 700, '#FFFFFF')
    area('rim', (5.0, -1.0, 2.0), 3.0, 150, '#BFD2FF')
else:  # ink: ice lit from behind
    kb = 1.0 if args.mark == 'a' else 0.0  # the orb is one thick lens: a back light floods it white; rims carry it
    area('back', (0.6, 0.9, -3.0), 4.0, 1300 * kb, '#CFE0FF')
    area('rim', (5.5, 1.0, 0.4), 2.0, 1200, '#A9C4FF')
    area('rimL', (-5.5, 2.0, 0.8), 2.0, 500, '#E7EEFE')
    area('key', (-3.0, 4.0, 6.0), 5.0, 350 if args.mark == 'a' else 520, '#E7EEFE')

# camera: long lens, a slight tilt so the depth of the interlock reads
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 135; cam_d.sensor_width = 36
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
tilt = Vector((0.0, 0.0, 1.0)) if look == 'flat' else Vector((0.10, -0.17, 1.0)).normalized()
frame_w = 2.0 / args.fit
dist = frame_w * cam_d.lens / cam_d.sensor_width
cam.location = tilt * dist
cam.rotation_euler = look_at(-tilt)

# ---------------------------------------------------------------- render
if args.clay:
    cm = bpy.data.materials.new('clay'); cm.diffuse_color = (0.6, 0.6, 0.6, 1)
    bpy.context.view_layer.material_override = cm
if args.hide:
    bpy.data.objects[args.hide].hide_render = True
print(f'SETUP {time.time() - T_START:.1f}s', flush=True)
t0 = time.time()
if args.blend:
    bpy.ops.wm.save_as_mainfile(filepath=args.blend)
if not args.turn:
    sc.render.filepath = args.out
    bpy.ops.render.render(write_still=True)
    print(f'RENDER {args.out} {time.time() - t0:.1f}s')
else:
    # 60 frames, 2 s at 30 fps: turn 12 degrees and back on sine in-out, one light sweep
    sweep = area('sweep', (-6, 3, 3), 0.6, 0.0, '#FFFFFF', shape='RECTANGLE', size_y=8.0)
    f0, f1 = (int(v) for v in args.frames.split('-'))
    os.makedirs(args.out, exist_ok=True)
    for f in range(f0, f1 + 1):
        u = f / 60.0
        ang = 6.0 * (1 - math.cos(2 * math.pi * u))       # 0 -> 12 -> 0 degrees
        rig.rotation_euler = (0, math.radians(ang), 0)
        x = -6 + 12 * u                                    # the strip crosses left to right once
        sweep.location = (x, 3.0, 3.0)
        sweep.rotation_euler = look_at(-sweep.location)
        sweep.data.energy = 220.0 * math.sin(math.pi * u) ** 2  # zero at both ends: seamless loop
        sc.render.filepath = os.path.join(args.out, f'{f:03d}.png')
        if os.path.exists(sc.render.filepath):
            continue  # resumable: a frame already on disk is never rendered twice
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f'FRAME {f:03d} {time.time() - t1:.1f}s', flush=True)
    print(f'TURN {time.time() - t0:.1f}s')
