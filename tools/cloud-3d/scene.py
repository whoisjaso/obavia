"""Blender (bpy 4.2) scene for rendering a numpy density grid as a cloud.

The grid is pushed into Blender through Geometry Nodes: a mesh carries one
vertex per voxel with the density as an attribute, and a Volume Cube node
samples it back by index into a real voxel grid named "density". Cycles
renders that grid with a Principled Volume (white scattering, no absorption,
anisotropy for the silver lining).

Three light groups are rendered as separate passes so both colour variants
come from one render:
  key  warm sun, low (28 degrees), from the camera side, upper left
  rim  cool sun, above and behind the cloud (forward scatter, the rim)
  sky  gradient world: blue zenith, pale horizon, dark ground
Each pass is denoised with OpenImageDenoise in the compositor, written as
float EXR, read back and saved as float16 .npy (premultiplied, linear).
"""
import math
import os
import time

import bpy
import numpy as np
from mathutils import Vector

KEY_ELEV, KEY_AZ = 30.0, -68.0     # degrees; azimuth 0 = from the camera
RIM_ELEV, RIM_AZ = 34.0, 168.0     # from behind the cloud, a touch right


def _sun(name, elev, az, strength, color, angle_deg, group):
    d = Vector((math.cos(math.radians(elev)) * math.sin(math.radians(az)),
                -math.cos(math.radians(elev)) * math.cos(math.radians(az)),
                math.sin(math.radians(elev))))  # direction toward the light
    data = bpy.data.lights.new(name, "SUN")
    data.energy = strength
    data.color = color
    data.angle = math.radians(angle_deg)
    ob = bpy.data.objects.new(name, data)
    ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(ob)
    ob.lightgroup = group
    return ob


def _world():
    w = bpy.data.worlds.new("sky")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    # map z in [-1, 1] to [0, 1]
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (0.055, 0.062, 0.075, 1)   # ground, dim and cool
    cr.elements[1].position = 0.5
    cr.elements[1].color = (0.62, 0.70, 0.84, 1)      # pale horizon
    e = cr.elements.new(0.47)
    e.color = (0.14, 0.15, 0.17, 1)
    e = cr.elements.new(1.0)
    e.color = (0.20, 0.36, 0.80, 1)                   # blue zenith
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    w.lightgroup = "sky"
    return w


def _load_noncolor(path):
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = "Non-Color"
    return img


def _etch_factor(nt, tc, etch):
    """Carve a label into the front of the volume. etch = dict(mask (h, w)
    0..1, front (h, w) y of the visible surface, x0, x1, z0, z1, depth,
    feather). Returns a socket: 1 outside the carve, 0 inside."""
    L = nt.links.new
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    L(tc.outputs["Object"], sep.inputs[0])
    u = nt.nodes.new("ShaderNodeMapRange")
    u.inputs["From Min"].default_value = etch["x0"]; u.inputs["From Max"].default_value = etch["x1"]
    v = nt.nodes.new("ShaderNodeMapRange")
    v.inputs["From Min"].default_value = etch["z0"]; v.inputs["From Max"].default_value = etch["z1"]
    L(sep.outputs["X"], u.inputs["Value"]); L(sep.outputs["Z"], v.inputs["Value"])
    uv = nt.nodes.new("ShaderNodeCombineXYZ")
    L(u.outputs[0], uv.inputs["X"]); L(v.outputs[0], uv.inputs["Y"])
    tm = nt.nodes.new("ShaderNodeTexImage"); tm.image = _load_noncolor(etch["mask_png"])
    tm.interpolation = "Cubic"; tm.extension = "CLIP"
    tf = nt.nodes.new("ShaderNodeTexImage"); tf.image = _load_noncolor(etch["front_png"])
    tf.interpolation = "Linear"; tf.extension = "EXTEND"
    L(uv.outputs[0], tm.inputs["Vector"]); L(uv.outputs[0], tf.inputs["Vector"])
    dec = nt.nodes.new("ShaderNodeMath"); dec.operation = "MULTIPLY_ADD"
    L(tf.outputs["Color"], dec.inputs[0])
    dec.inputs[1].default_value = etch["fscale"]; dec.inputs[2].default_value = etch["fmin"]
    tf = dec
    # floor = front + depth; carve where y < floor, feathered over `feather`
    a = nt.nodes.new("ShaderNodeMath"); a.operation = "ADD"; a.inputs[1].default_value = etch["depth"] - etch["feather"]
    b = nt.nodes.new("ShaderNodeMath"); b.operation = "ADD"; b.inputs[1].default_value = etch["depth"]
    L(tf.outputs[0], a.inputs[0]); L(tf.outputs[0], b.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"
    L(sep.outputs["Y"], mr.inputs["Value"]); L(a.outputs[0], mr.inputs["From Min"]); L(b.outputs[0], mr.inputs["From Max"])
    # inside = 1 - mr ; carve = mask * inside ; factor = 1 - carve
    inside = nt.nodes.new("ShaderNodeMath"); inside.operation = "SUBTRACT"; inside.inputs[0].default_value = 1.0
    L(mr.outputs[0], inside.inputs[1])
    carve = nt.nodes.new("ShaderNodeMath"); carve.operation = "MULTIPLY"
    L(tm.outputs["Color"], carve.inputs[0]); L(inside.outputs[0], carve.inputs[1])
    fac = nt.nodes.new("ShaderNodeMath"); fac.operation = "SUBTRACT"; fac.inputs[0].default_value = 1.0; fac.use_clamp = True
    L(carve.outputs[0], fac.inputs[1])
    return fac.outputs[0]


def _volume_material(density_scale, anisotropy, detail, detail_xform, etch=None):
    """Principled Volume over the grid, with sub-voxel detail: a fine noise
    erodes thin (edge) density and leaves the dense core alone, so lit edges
    break up into small billows the voxel grid is too coarse to hold.
    detail_xform = (sx, sz, base_z, dx, dz) applies the same press transform
    to the detail noise so it moves with the field."""
    m = bpy.data.materials.new("cloud")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    L = nt.links.new
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "density"
    # detail noise in object space, in the field's rest frame
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sx, sz, bz, dx, dz = detail_xform
    sub = nt.nodes.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"
    sub.inputs[1].default_value = (0.0, 0.0, bz)
    dv = nt.nodes.new("ShaderNodeVectorMath"); dv.operation = "DIVIDE"
    dv.inputs[1].default_value = (sx, sx, sz)
    ad = nt.nodes.new("ShaderNodeVectorMath"); ad.operation = "ADD"
    ad.inputs[1].default_value = (dx, 0.0, bz + dz)
    L(tc.outputs["Object"], sub.inputs[0]); L(sub.outputs[0], dv.inputs[0]); L(dv.outputs[0], ad.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.noise_dimensions = "3D"
    nz.inputs["Scale"].default_value = detail[0]
    nz.inputs["Detail"].default_value = 4.0
    nz.inputs["Roughness"].default_value = 0.58
    nz.inputs["Distortion"].default_value = 0.25
    L(ad.outputs[0], nz.inputs["Vector"])
    # eff = clamp(grid * 1.35 - amount * noise, 0, 1)
    g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"
    g.inputs[1].default_value = 1.35
    L(attr.outputs["Fac"], g.inputs[0])
    nm = nt.nodes.new("ShaderNodeMath"); nm.operation = "MULTIPLY"
    nm.inputs[1].default_value = detail[1]
    L(nz.outputs["Fac"], nm.inputs[0])
    # erosion scales with local density up to grid 0.4, so wisps survive
    kk = nt.nodes.new("ShaderNodeMath"); kk.operation = "MULTIPLY"; kk.use_clamp = True
    kk.inputs[1].default_value = 2.5
    L(attr.outputs["Fac"], kk.inputs[0])
    nm2 = nt.nodes.new("ShaderNodeMath"); nm2.operation = "MULTIPLY"
    L(nm.outputs[0], nm2.inputs[0]); L(kk.outputs[0], nm2.inputs[1])
    nm = nm2
    ef = nt.nodes.new("ShaderNodeMath"); ef.operation = "SUBTRACT"; ef.use_clamp = True
    L(g.outputs[0], ef.inputs[0]); L(nm.outputs[0], ef.inputs[1])
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = density_scale
    if etch is not None:
        ce = nt.nodes.new("ShaderNodeMath"); ce.operation = "MULTIPLY"
        L(ef.outputs[0], ce.inputs[0]); L(_etch_factor(nt, tc, etch), ce.inputs[1])
        L(ce.outputs[0], mul.inputs[0])
    else:
        L(ef.outputs[0], mul.inputs[0])
    L(mul.outputs[0], pv.inputs["Density"])
    pv.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    pv.inputs["Absorption Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    pv.inputs["Anisotropy"].default_value = anisotropy
    pv.inputs["Density Attribute"].default_value = ""
    L(pv.outputs[0], out.inputs["Volume"])
    return m


def _grid_object(dens, lo, hi, res, material):
    n = int(np.prod(res))
    me = bpy.data.meshes.new("vox")
    me.vertices.add(n)
    a = me.attributes.new("d", "FLOAT", "POINT")
    a.data.foreach_set("value", dens.astype(np.float32).ravel())
    ob = bpy.data.objects.new("cloud", me)
    bpy.context.scene.collection.objects.link(ob)
    ng = bpy.data.node_groups.new("togrid", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    gin = N.new("NodeGroupInput")
    gout = N.new("NodeGroupOutput")
    pos = N.new("GeometryNodeInputPosition")
    # index = round((p - lo) / step), step = (hi - lo) / (res - 1)
    sub = N.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"
    sub.inputs[1].default_value = lo
    div = N.new("ShaderNodeVectorMath"); div.operation = "DIVIDE"
    div.inputs[1].default_value = [(hi[i] - lo[i]) / (res[i] - 1) for i in range(3)]
    sep = N.new("ShaderNodeSeparateXYZ")
    ng.links.new(pos.outputs[0], sub.inputs[0])
    ng.links.new(sub.outputs[0], div.inputs[0])
    ng.links.new(div.outputs[0], sep.inputs[0])
    rnd = []
    for k in range(3):
        r = N.new("ShaderNodeMath"); r.operation = "ROUND"
        ng.links.new(sep.outputs[k], r.inputs[0])
        rnd.append(r)
    # ((ix * ny) + iy) * nz + iz
    m1 = N.new("ShaderNodeMath"); m1.operation = "MULTIPLY_ADD"
    ng.links.new(rnd[0].outputs[0], m1.inputs[0]); m1.inputs[1].default_value = res[1]
    ng.links.new(rnd[1].outputs[0], m1.inputs[2])
    m2 = N.new("ShaderNodeMath"); m2.operation = "MULTIPLY_ADD"
    ng.links.new(m1.outputs[0], m2.inputs[0]); m2.inputs[1].default_value = res[2]
    ng.links.new(rnd[2].outputs[0], m2.inputs[2])
    f2i = N.new("FunctionNodeFloatToInt"); f2i.rounding_mode = "ROUND"
    ng.links.new(m2.outputs[0], f2i.inputs[0])
    na = N.new("GeometryNodeInputNamedAttribute"); na.data_type = "FLOAT"
    na.inputs["Name"].default_value = "d"
    si = N.new("GeometryNodeSampleIndex"); si.data_type = "FLOAT"; si.domain = "POINT"
    ng.links.new(gin.outputs[0], si.inputs["Geometry"])
    ng.links.new(na.outputs["Attribute"], si.inputs["Value"])
    ng.links.new(f2i.outputs[0], si.inputs["Index"])
    vc = N.new("GeometryNodeVolumeCube")
    ng.links.new(si.outputs[0], vc.inputs["Density"])
    vc.inputs["Background"].default_value = 0.0
    vc.inputs["Min"].default_value = lo
    vc.inputs["Max"].default_value = hi
    vc.inputs["Resolution X"].default_value = res[0]
    vc.inputs["Resolution Y"].default_value = res[1]
    vc.inputs["Resolution Z"].default_value = res[2]
    sm = N.new("GeometryNodeSetMaterial")
    sm.inputs["Material"].default_value = material
    ng.links.new(vc.outputs[0], sm.inputs["Geometry"])
    ng.links.new(sm.outputs[0], gout.inputs[0])
    mod = ob.modifiers.new("togrid", "NODES")
    mod.node_group = ng
    return ob


def render_grid(dens, lo, hi, res, out_npz, width, height, ortho_scale, cam_center,
                samples=64, density_scale=30.0, anisotropy=0.45, bounces=12, step_rate=2.0, detail=(16.0, 0.42),
                detail_xform=(1.0, 1.0, 0.0, 0.0, 0.0), etch=None, quiet=True, border=None):
    """Render one density grid; save premultiplied linear passes to out_npz.
    border = (x0, y0, x1, y1) canvas fractions from the top left renders only
    that region, cropped (the label imprints need only the safe rect)."""
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = False
    cy.seed = 1012
    cy.max_bounces = bounces + 4
    cy.volume_bounces = bounces
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 0
    cy.transmission_bounces = 0
    cy.transparent_max_bounces = 8
    cy.volume_step_rate = step_rate
    cy.volume_max_steps = 1024
    cy.use_denoising = False
    cy.sample_clamp_indirect = 8.0
    sc.render.film_transparent = True
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    sc.render.resolution_percentage = 100
    if border is not None:
        sc.render.use_border = True
        sc.render.use_crop_to_border = True
        sc.render.border_min_x, sc.render.border_max_x = border[0], border[2]
        sc.render.border_min_y, sc.render.border_max_y = 1.0 - border[3], 1.0 - border[1]
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.view_settings.view_transform = "Standard"
    sc.world = _world()
    vl = sc.view_layers[0]
    for g in ("key", "rim", "sky"):
        vl.lightgroups.add(name=g)
    _sun("key", KEY_ELEV, KEY_AZ, 4.0, (1.0, 0.92, 0.80), 1.2, "key")
    _sun("rim", RIM_ELEV, RIM_AZ, 4.0, (0.86, 0.93, 1.0), 1.2, "rim")
    mat = _volume_material(density_scale, anisotropy, detail, detail_xform, etch)
    _grid_object(dens, lo, hi, res, mat)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (cam_center[0], -20.0, cam_center[1])
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    # compositor: denoise every light group pass, write float EXRs
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    tmp = out_npz + ".exr.d"
    os.makedirs(tmp, exist_ok=True)
    fo = nt.nodes.new("CompositorNodeOutputFile")
    fo.base_path = tmp
    fo.format.file_format = "OPEN_EXR"
    fo.format.color_depth = "32"
    fo.format.color_mode = "RGBA"
    fo.file_slots.clear()
    names = {"key": "Combined_key", "rim": "Combined_rim", "sky": "Combined_sky"}
    for g, sock in names.items():
        dn = nt.nodes.new("CompositorNodeDenoise")
        dn.prefilter = "FAST"
        dn.use_hdr = True
        nt.links.new(rl.outputs[sock], dn.inputs["Image"])
        fo.file_slots.new(g)
        nt.links.new(dn.outputs[0], fo.inputs[g])
    fo.file_slots.new("alpha")
    nt.links.new(rl.outputs["Alpha"], fo.inputs["alpha"])
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], comp.inputs["Image"])
    sc.frame_current = 1
    sc.render.filepath = os.path.join(tmp, "combined.exr")
    sc.render.image_settings.file_format = "OPEN_EXR"
    bpy.ops.render.render(write_still=False)
    passes = {}
    for g in ("key", "rim", "sky", "alpha"):
        fn = [f for f in os.listdir(tmp) if f.startswith(g)][0]
        img = bpy.data.images.load(os.path.join(tmp, fn))
        iw, ih = img.size
        px = np.empty(iw * ih * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(ih, iw, 4)[::-1]  # top row first
        passes[g] = (px[..., 0] if g == "alpha" else px[..., :3]).astype(np.float16)
        bpy.data.images.remove(img)
        os.remove(os.path.join(tmp, fn))
    os.rmdir(tmp)
    np.savez_compressed(out_npz, **passes)
    return time.time() - t0
