"""The scene-3d rig (bpy 4.2): world, lights, page, ground, camera, materials,
and the render that writes one light group per pass.

It reuses the cloud rig (`tools/cloud-3d/scene.py`) as is: the same gradient
world as the `sky` light group, the warm low key sun from the upper left
(30 degrees) and the cool rim sun from above and behind, the volume material
and the voxel grid object for any cloud in the shot. Two things are added for
glass, and nothing in tools/cloud-3d is changed:

  page   a sphere around the shot, visible only to refraction and reflection,
         emitting plain white in its own light group. Glass needs something to
         bend; the grade tints this pass with the page colour (the house sky
         or the ink lane), so one render gives both variants, exactly as the
         cloud rig gets light and dark from one render.
  ground a shadow catcher at z = 0; its pass becomes the soft ink shadow.

Passes (each denoised with OpenImageDenoise using albedo and normal, linear,
premultiplied): key, rim, sky, page, plus alpha, the shadow catcher and a
surface mask (object index > 0) that tells glass from cloud.
Deterministic: fixed Cycles seed, no animated seed, no random calls.
"""
import math
import os
import sys
import time

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = os.path.join(HERE, "..", "cloud-3d")
sys.path.insert(0, CLOUD)
import scene as cloud_scene  # noqa: E402  (the cloud rig, read only)

GROUPS = ("key", "rim", "sky", "page")


def srgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (a,)


def look_at(fwd, up=Vector((0, 0, 1))):
    f = Vector(fwd).normalized()
    r = f.cross(up)
    if r.length < 1e-6:
        r = f.cross(Vector((0, 1, 0)))
    r.normalize()
    u = r.cross(f)
    return Matrix((r, u, -f)).transposed().to_euler()


# ------------------------------------------------------------------ scene

def setup(width, height, samples, motion_blur=False, ground=True, page_radius=40.0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.seed = 1013
    cy.use_animated_seed = False
    cy.use_denoising = False          # denoised per pass in the compositor
    cy.max_bounces = 12
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 6
    cy.transmission_bounces = 12
    cy.volume_bounces = 8
    cy.transparent_max_bounces = 8
    cy.volume_step_rate = 1.5
    cy.volume_max_steps = 1024
    cy.caustics_refractive = False
    cy.caustics_reflective = False
    cy.blur_glossy = 0.6
    cy.sample_clamp_indirect = 6.0
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = width, height
    sc.render.resolution_percentage = 100
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.render.use_motion_blur = motion_blur
    sc.render.motion_blur_shutter = 0.5
    sc.render.fps = 60
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.dither_intensity = 0.0
    vl = sc.view_layers[0]
    for g in GROUPS:
        vl.lightgroups.add(name=g)
    vl.cycles.denoising_store_passes = True
    vl.cycles.use_pass_shadow_catcher = True
    vl.use_pass_object_index = True
    # the cloud rig's world, key and rim, untouched; the suns are widened from
    # 1.2 degrees so glass catches a soft highlight, not a chrome glint
    sc.world = cloud_scene._world()
    key = cloud_scene._sun("key", cloud_scene.KEY_ELEV, cloud_scene.KEY_AZ, 4.0, (1.0, 0.92, 0.80), 9.0, "key")
    rim = cloud_scene._sun("rim", cloud_scene.RIM_ELEV, cloud_scene.RIM_AZ, 4.0, (0.86, 0.93, 1.0), 6.0, "rim")
    _page(page_radius)
    if ground:
        bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
        g = bpy.context.object
        g.name = "ground"
        g.is_shadow_catcher = True
        g.visible_transmission = False
        g.visible_glossy = False
        g.pass_index = 0
    return sc


def _page(radius):
    """White emitter around the shot, seen only by refraction and reflection.
    Brighter overhead so reflections carry a horizon."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=48, ring_count=24, location=(0, 0, 0))
    o = bpy.context.object
    o.name = "page"
    m = bpy.data.materials.new("page")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -1.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = 0.72
    mr.inputs["To Max"].default_value = 1.0
    em = nt.nodes.new("ShaderNodeEmission")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tc.outputs["Normal"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], em.inputs["Strength"])
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    o.data.materials.append(m)
    o.visible_camera = False
    o.visible_diffuse = False
    o.visible_shadow = False
    o.visible_volume_scatter = False
    o.lightgroup = "page"
    o.pass_index = 0
    return o


def camera(target, az, elev, dist, lens=70.0, shift=(0.0, 0.0)):
    """az 0 = in front (from -Y), positive to the right; elev above the horizon."""
    t = Vector(target)
    d = Vector((math.cos(math.radians(elev)) * math.sin(math.radians(az)),
                -math.cos(math.radians(elev)) * math.cos(math.radians(az)),
                math.sin(math.radians(elev))))
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_width = 36
    cd.sensor_fit = "HORIZONTAL"
    cd.shift_x, cd.shift_y = shift
    cd.clip_end = 200
    c = bpy.data.objects.new("cam", cd)
    bpy.context.scene.collection.objects.link(c)
    c.location = t + d * dist
    c.rotation_euler = look_at(-d)
    bpy.context.scene.camera = c
    return c


# ------------------------------------------------------------------ materials

def _principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.subsurface_method = "BURLEY"
    for k, v in kw.items():
        p.inputs[k].default_value = v
    return m, nt, p


def _glass_shadow(m, color, amount):
    """Shadow rays pass through the glass tinted (the mark's trick): the light
    a caustic would carry, without paying for caustic paths."""
    nt = m.node_tree
    n = nt.nodes
    outn = n["Material Output"]
    p = n["Principled BSDF"]
    lp = n.new("ShaderNodeLightPath")
    tr = n.new("ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = srgb(color)
    mx = n.new("ShaderNodeMixShader")
    mm = n.new("ShaderNodeMath")
    mm.operation = "MULTIPLY"
    mm.inputs[1].default_value = amount
    nt.links.new(lp.outputs["Is Shadow Ray"], mm.inputs[0])
    nt.links.new(mm.outputs[0], mx.inputs["Fac"])
    nt.links.new(p.outputs[0], mx.inputs[1])
    nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], outn.inputs["Surface"])


def _zramp(nt, p, z0, z1, stops):
    """Colour ramp along world z (top lighter), like the mark's SVG gradient."""
    n = nt.nodes
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    mr = n.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = z0
    mr.inputs["From Max"].default_value = z1
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "EASE"
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], srgb(stops[0][1])
    el[1].position, el[1].color = stops[-1][0], srgb(stops[-1][1])
    for pos, col in stops[1:-1]:
        e = el.new(pos)
        e.color = srgb(col)
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], ramp.inputs[0])
    return ramp


def ice(name="ice", z0=-1.0, z1=1.0, absorb=1.8):
    """The mark's ice: transmissive, a breath of subsurface, roughness 0.08;
    the colour lives in the volume and tints by path length."""
    m, nt, p = _principled(name, **{
        "Roughness": 0.08, "IOR": 1.45, "Transmission Weight": 0.85,
        "Subsurface Weight": 0.08, "Subsurface Scale": 0.04, "Specular IOR Level": 0.5})
    p.inputs["Subsurface Radius"].default_value = (0.6, 0.8, 1.0)
    ramp = _zramp(nt, p, z0, z1, [(0, "#A9BFF0"), (0.85, "#E7EEFE"), (1, "#F4F7FF")])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = 0.55
    mix.inputs["B"].default_value = (1, 1, 1, 1)
    nt.links.new(ramp.outputs[0], mix.inputs["A"])
    nt.links.new(mix.outputs["Result"], p.inputs["Base Color"])
    va = nt.nodes.new("ShaderNodeVolumeAbsorption")
    va.inputs["Color"].default_value = srgb("#B9CBF4")
    va.inputs["Density"].default_value = absorb
    nt.links.new(va.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    _glass_shadow(m, "#E3EBFD", 0.85)
    return m


def frosted(name="blue", z0=-1.0, z1=1.0, deep=False, rough=0.25):
    """The mark's frosted blue: denser, roughness about 0.25, light gradient
    from the top."""
    m, nt, p = _principled(name, **{
        "Roughness": rough, "IOR": 1.45, "Transmission Weight": 0.30 if deep else 0.50,
        "Subsurface Weight": 0.12, "Subsurface Scale": 0.03,
        "Coat Weight": 0.55, "Coat Roughness": 0.05, "Coat IOR": 1.45})
    p.inputs["Subsurface Radius"].default_value = (0.5, 0.7, 1.0)
    stops = ([(0, "#4A6497"), (1, "#7F98CC")] if deep else
             [(0, "#6A86BC"), (0.45, "#8EA6DD"), (1, "#B9CBF4")])
    ramp = _zramp(nt, p, z0, z1, stops)
    nt.links.new(ramp.outputs[0], p.inputs["Base Color"])
    _glass_shadow(m, "#8FA7DA", 0.30 if deep else 0.45)
    return m


def milk(name="milk"):
    """Frosted ice turned milky: the paper of the title, the face of a coin.
    Mostly subsurface, a little transmission, so it glows instead of going
    grey like paper or plastic would."""
    m, nt, p = _principled(name, **{
        "Base Color": srgb("#EEF3FF"), "Roughness": 0.30, "IOR": 1.45,
        "Transmission Weight": 0.22, "Subsurface Weight": 0.65, "Subsurface Scale": 0.08,
        "Specular IOR Level": 0.45, "Coat Weight": 0.35, "Coat Roughness": 0.08})
    p.inputs["Subsurface Radius"].default_value = (0.75, 0.85, 1.0)
    _glass_shadow(m, "#E3EBFD", 0.5)
    return m


def red(name="red"):
    """The only red in the house: one drip of red glass."""
    m, nt, p = _principled(name, **{
        "Base Color": srgb("#E0485A"), "Roughness": 0.06, "IOR": 1.45,
        "Transmission Weight": 0.75, "Subsurface Weight": 0.15, "Subsurface Scale": 0.03})
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.3, 0.3)
    va = nt.nodes.new("ShaderNodeVolumeAbsorption")
    va.inputs["Color"].default_value = srgb("#C81E3A")
    va.inputs["Density"].default_value = 6.0
    nt.links.new(va.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    _glass_shadow(m, "#E7A0A8", 0.5)
    return m


def assign(ob, mat, index=1):
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    ob.pass_index = index
    return ob


def smooth(ob, angle=None):
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


# ------------------------------------------------------------------ clouds

def cloud(dens, lo, hi, res, density_scale=34.0, detail=(14.0, 0.38)):
    """A cloud in the shot: the cloud rig's grid object and volume material."""
    mat = cloud_scene._volume_material(density_scale, 0.55, detail, (1.0, 1.0, 0.0, 0.0, 0.0))
    ob = cloud_scene._grid_object(dens, lo, hi, res, mat)
    ob.pass_index = 0
    return ob


# ------------------------------------------------------------------ render

def render(out_npz):
    """Render the current scene; save float16 passes to out_npz."""
    t0 = time.time()
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    tmp = out_npz + ".exr.d"
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    fo = nt.nodes.new("CompositorNodeOutputFile")
    fo.base_path = tmp
    fo.format.file_format = "OPEN_EXR"
    fo.format.color_depth = "32"
    fo.format.color_mode = "RGBA"
    fo.file_slots.clear()
    for g in GROUPS:
        dn = nt.nodes.new("CompositorNodeDenoise")
        dn.prefilter = "ACCURATE"
        dn.use_hdr = True
        nt.links.new(rl.outputs["Combined_" + g], dn.inputs["Image"])
        nt.links.new(rl.outputs["Denoising Normal"], dn.inputs["Normal"])
        nt.links.new(rl.outputs["Denoising Albedo"], dn.inputs["Albedo"])
        fo.file_slots.new(g)
        nt.links.new(dn.outputs[0], fo.inputs[g])
    # the cloud's own denoise, image only, as the cloud rig does: albedo and
    # normal belong to surfaces and turn a volume lumpy
    for g in ("key", "rim", "sky"):
        dn = nt.nodes.new("CompositorNodeDenoise")
        dn.prefilter = "FAST"
        dn.use_hdr = True
        nt.links.new(rl.outputs["Combined_" + g], dn.inputs["Image"])
        fo.file_slots.new("v" + g)
        nt.links.new(dn.outputs[0], fo.inputs["v" + g])
    for name, sock in (("alpha", "Alpha"), ("catcher", "Shadow Catcher"), ("index", "IndexOB")):
        fo.file_slots.new(name)
        nt.links.new(rl.outputs[sock], fo.inputs[name])
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], comp.inputs["Image"])
    bpy.ops.render.render(write_still=False)
    passes = {}
    for g in GROUPS + ("vkey", "vrim", "vsky", "alpha", "catcher", "index"):
        fn = [f for f in os.listdir(tmp) if f.startswith(g)][0]
        img = bpy.data.images.load(os.path.join(tmp, fn))
        iw, ih = img.size
        px = np.empty(iw * ih * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(ih, iw, 4)[::-1]
        if g in ("alpha", "index"):
            passes[g] = px[..., 0].astype(np.float16)
        else:
            passes[g] = px[..., :3].astype(np.float16)
        bpy.data.images.remove(img)
        os.remove(os.path.join(tmp, fn))
    os.rmdir(tmp)
    np.savez_compressed(out_npz, **passes)
    return time.time() - t0
