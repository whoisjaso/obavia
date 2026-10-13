"""Stage 2f (Blender bpy): the ray-traced contact shadows.

  python render_shadow.py WORK WIDTH SPP
Writes WORK/shadow-rest-W.npz and WORK/shadow-pressed-W.npz, each a single
"shadow" pass: the fraction of the light the page under the cloud loses, per
pixel, 0 to 1 (the alpha of a Cycles shadow catcher on a transparent film).

The cloud sits on the page (cloud-system section 1, the ambient occlusion
where it meets the page): the page is a floor plane under the base, the
cloud is visible to shadow rays only, so the render holds the shadow and
nothing else, and the light is a wide, soft sun nearly overhead (SHADOW_ELEV,
SUN_ANGLE), so the shadow is the cloud's footprint, dense under the belly and
soft at the rim. The camera is the button's orthographic camera pitched
PITCH degrees down about the frame's centre, so the floor is foreshortened
into the band under the belly the way a surface sitting on the page is seen.
Pressed: the cloud sinks to the page (GAP), so the shadow is shorter, sharper
and darker by the same optics, nothing painted. post.py colours it with the
house shade (cloud-system section 5: ink on light, a deeper ink on the dark
lane) and scales it per variant.
"""
import json
import math
import os
import sys
import time

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import field  # noqa: E402
import scene  # noqa: E402
from render_button import DENSITY, ANISO, DETAIL  # noqa: E402

SHADOW_ELEV = 80.0          # degrees above the page, from the camera side
SUN_ANGLE = 45.0            # degrees: a wide, soft sun, the penumbra grows with the height above the page
PITCH = 9.0                 # degrees the camera looks down at the page
GAP = dict(rest=0.09, pressed=0.015)  # the page under the base: at rest the cloud floats a hair; pressed, it sits


def render_shadow(dens, lo, hi, res, out_npz, width, height, ortho_scale, cam_center, page_z, samples, detail_xform):
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = False
    cy.seed = 1012
    cy.max_bounces = 4
    cy.volume_bounces = 0
    cy.diffuse_bounces = 0
    cy.glossy_bounces = 0
    cy.transmission_bounces = 0
    cy.transparent_max_bounces = 8
    cy.volume_step_rate = 2.0
    cy.volume_max_steps = 1024
    cy.use_denoising = False
    sc.render.film_transparent = True
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    sc.render.resolution_percentage = 100
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.view_settings.view_transform = "Standard"
    # no world light: the catcher measures the sun alone
    w = bpy.data.worlds.new("none")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    sc.world = w
    scene._sun("shadow", SHADOW_ELEV, 0.0, 3.0, (1.0, 1.0, 1.0), SUN_ANGLE, "key")
    mat = scene._volume_material(DENSITY, ANISO, DETAIL, detail_xform)
    cloud = scene._grid_object(dens, lo, hi, res, mat)
    # the cloud stays visible to the camera: a camera ray that cannot see the
    # volume never enters it, and a shadow ray leaving the page inside the
    # volume's bounds would then march through nothing. The shadow comes from
    # the Shadow Catcher pass, which is the page's lit ratio whatever the camera sees.
    cloud.visible_diffuse = False
    cloud.visible_glossy = False
    cloud.visible_transmission = False
    cloud.visible_volume_scatter = False
    cloud.visible_shadow = True
    # the page: a floor under the base
    me = bpy.data.meshes.new("page")
    me.from_pydata([(-20, -20, page_z), (20, -20, page_z), (20, 20, page_z), (-20, 20, page_z)], [], [(0, 1, 2, 3)])
    pm = bpy.data.materials.new("page")
    pm.use_nodes = True
    page = bpy.data.objects.new("page", me)
    page.data.materials.append(pm)
    page.is_shadow_catcher = True
    sc.collection.objects.link(page)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new("cam", cam_data)
    # pitched about the frame's centre: the axis still passes through (cx, 0, cz)
    th = math.radians(PITCH)
    cam.location = (cam_center[0], -20.0 * math.cos(th), cam_center[1] + 20.0 * math.sin(th))
    cam.rotation_euler = (math.radians(90.0 - PITCH), 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    vl = sc.view_layers[0]
    vl.cycles.use_pass_shadow_catcher = True
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
    fo.file_slots.new("catcher")
    nt.links.new(rl.outputs["Shadow Catcher"], fo.inputs["catcher"])
    fo.file_slots.new("alpha")
    nt.links.new(rl.outputs["Alpha"], fo.inputs["alpha"])
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], comp.inputs["Image"])
    sc.frame_current = 1
    sc.render.filepath = os.path.join(tmp, "combined.exr")
    sc.render.image_settings.file_format = "OPEN_EXR"
    bpy.ops.render.render(write_still=False)
    passes = {}
    for g in ("catcher", "alpha"):
        fn = [f for f in os.listdir(tmp) if f.startswith(g)][0]
        img = bpy.data.images.load(os.path.join(tmp, fn))
        iw, ih = img.size
        px = np.empty(iw * ih * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(ih, iw, 4)[::-1]
        passes[g] = px[..., :3].mean(-1) if g == "catcher" else px[..., 0]
        bpy.data.images.remove(img)
        os.remove(os.path.join(tmp, fn))
    os.rmdir(tmp)
    # the pass is the lit ratio (1 in the open, 0 in full shadow). Where the
    # camera path dies in the dense belly the page is never reached and the
    # pass stays lit, so the page's band under the cloud's coverage is filled:
    # the page right under the belly is in full shadow from a sun overhead.
    shadow = np.clip(1.0 - passes["catcher"], 0.0, 1.0)
    chh = ortho_scale * height / width
    top = cam_center[1] + chh / 2
    v_top = (page_z - cam_center[1]) * math.cos(th) + hi[1] * math.sin(th)   # the page's far edge on the glass
    rows = np.arange(height)[:, None] >= (top - v_top) / chh * height
    cov = np.clip((passes["alpha"] - 0.1) / 0.5, 0.0, 1.0)
    shadow = np.maximum(shadow, cov * rows).astype(np.float16)
    np.savez_compressed(out_npz, shadow=shadow)
    return time.time() - t0


if __name__ == "__main__":
    work, width, spp = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    B = field.BUTTON
    for name, f in (("rest", 23), ("pressed", 5)):
        out = os.path.join(work, f"shadow-{name}-{width}.npz")
        if os.path.exists(out):
            continue
        meta = json.load(open(os.path.join(work, f"button-{f:02d}.npy.json")))
        d = np.load(os.path.join(work, f"button-{f:02d}.npy")).astype(np.float32)
        p = meta["params"]
        sz = p["sy"] * (1.0 + (p["sxy"] - 1.0) * 0.6)
        # a seeded dither under a tenth of a percent breaks the constant tiles of
        # the dense belly (exactly 1.0 at rest, 1.15 pressed): shadow rays march
        # through a constant OpenVDB tile as if it were empty and leave a hole in
        # the footprint; camera rays do not, so the button renders are untouched
        d = d * (1.0 - 1e-3 * np.random.default_rng(1012).random(d.shape, dtype=np.float32))
        lo, hi, res = tuple(meta["lo"]), tuple(meta["hi"]), tuple(meta["res"])
        t = render_shadow(d, lo, hi, res, out,
                          width, int(round(width / B["aspect"])), B["ortho"], B["center"], B["base"] - GAP[name],
                          spp, (p["sxy"], sz, B["base"], 0.0, 0.0))
        print(f"render shadow {name} {width}px {spp}spp {t:.1f} s", flush=True)
