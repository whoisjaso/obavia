# Cloud 3D

Real volumetric clouds for every Obavia surface, rendered from scratch in Blender (Cycles, Principled Volume) and published to `assets/cloud-3d/`. Spec: `docs/design/cloud-system.md` §1, §2, §4, §5 and §8. This replaces the procedural pill and the scalloped vector, both banned.

## How a cloud is made

1. **Density field (numpy, `field.py`, `noise.py`).** A cumulus is a smooth union of seeded ellipsoid lobes (5 to 7 primary lobes plus small caps, a belly slab and two rounded ends) on a flat base. It is domain-warped by low-frequency gradient noise, then eroded into cauliflower billows by three octaves of Worley noise: the large octave is everywhere above the base, the small ones only on the crowns. The edge is a density ramp whose width is noise-modulated, so parts of the rim go wispy, plus a thin, noisy halo of wisps outside the body. Seed 1012. No global randomness anywhere; the same seed gives the same bytes.
2. **Into Blender as a real voxel grid (`scene.py`).** Blender 4.2 as a Python module has no pyopenvdb, so the grid goes in through Geometry Nodes: a mesh carries one vertex per voxel with the density as an attribute, and a Volume Cube node samples it back by index into an OpenVDB grid named `density`.
3. **Light, scatter and shadow come from Cycles.** A Principled Volume (white scattering, absorption 0, anisotropy 0.55 for the silver lining, extinction 110 per unit on the button) with sub-voxel detail: a fine noise erodes the thin edge density and leaves the dense core alone, scaled by local density so wisps survive. Lights: a warm sun at 30 degrees elevation from the upper left (`key`), a cool sun above and behind the cloud (`rim`), and an HDRI-free gradient world (blue zenith, pale horizon, dim ground) (`sky`). Transparent film, 12 volume bounces. Each light is a Cycles light group, rendered as its own pass, denoised with OpenImageDenoise in the compositor and saved as linear premultiplied float.
4. **Grade (`grade.py`, plain python3).** Both variants come from the same render:
   - light: key 2.6, sky fill 0.36 (tinted cool), rim 0.1; a soft exponential shoulder; white crowns, blue-grey underside.
   - dark lane: rim 1.6, key 0.06, sky 0.1; alpha follows the scattered light, so the dim body is thin ice over ink and the rim is silver (cloud-system §5, dark lane).
   The passes are un-premultiplied once, toned, and stored with straight alpha, which is what PNG and WebP define.
5. **Publish (`post.py`).** Sizes, contact shadows, sprite sheets, palette PNGs, WebP, the safe-zone JSON and the contact sheet.

## Run it

From the repo root:

```sh
BLENDER_PY=/path/to/blender-venv/bin/python tools/cloud-3d/render.sh       # everything
STAGE=post tools/cloud-3d/render.sh                                         # regrade and repack only (seconds)
STAGE=fields tools/cloud-3d/render.sh                                       # density grids only
```

`BLENDER_PY` is any Python with `bpy` 4.2 installed (this machine: `scratchpad/blender-venv/bin/python`). `PY` defaults to `python3` with numpy and Pillow. Grids and passes go to `tools/cloud-3d/.work/` (gitignored); each step skips outputs that exist, so delete `.work` to rebuild from zero.

Individual stages:

```sh
python3 tools/cloud-3d/build_fields.py tools/cloud-3d/.work all            # button frames, sky layers, fx
$BLENDER_PY tools/cloud-3d/render_button.py tools/cloud-3d/.work 1280 20 --frames=23,5,0,1
$BLENDER_PY tools/cloud-3d/render_button.py tools/cloud-3d/.work 960 16
$BLENDER_PY tools/cloud-3d/render_fx.py tools/cloud-3d/.work
$BLENDER_PY tools/cloud-3d/render_sky.py tools/cloud-3d/.work 2048 16
python3 tools/cloud-3d/post.py tools/cloud-3d/.work assets/cloud-3d all
```

## Outputs (`assets/cloud-3d/`)

```
button/safe-zone.json                     label safe rect per size (CSS px and device px)
button/{light,dark}/{320,440,640}/        640 is the hero
  rest.png  rest@2x.png                   frame 23
  pressed.png  pressed@2x.png             frame 5: 6 percent shorter about the base, 15 percent denser
  press/000.png ... 023.png (+ @2x)       the 400 ms press, 60 fps
  shadow-rest.png  shadow-pressed.png (+ @2x)
  sheet.png sheet.json  sheet@2x.png sheet@2x.json
  every .png has a .webp beside it
button/wisp.png wisp@2x.png wisp-dark*    one soft wisp, 128 px (256 at @2x)
button/ring.png ring@2x.png ring-dark*    a soft air ring, 256 px (512 at @2x)
sky/{light,dark}/{far,mid,near}.png/.webp 2048 x 1024, tile horizontally
contact.png                               the owner's one-glance judgement sheet
```

Canvas per CSS width: 320 x 128, 440 x 176, 640 x 256 (2.5:1). The cloud body inside spans about 89 percent of the width and reads at about 3.2:1; the rest of the canvas holds the crowns, the wisps and the puff.

### The press, frame by frame

Keyframed in `field.press_params`, no randomness: the field's vertical scale about the base, its horizontal swell, its density, the edge looseness, and an outward wisp ring with its drift distance.

| Frames | Phase | What the field does |
| --- | --- | --- |
| 0 to 5 | sink | compresses to 94 percent height about the base, density up to 115 percent (ease out); frame 5 is `pressed` |
| 6 to 15 | puff | releases; lobes swell up to 3 percent (peak at frame 10), the edge ramp widens, wisps rise and drift outward |
| 16 to 23 | settle | a 0.45 percent undershoot and back; wisps fade; frame 23 is exactly `rest` |

The re-inflation is baked into frames 6 to 23: play them linearly at 60 fps. The translateY sink of §2 stays in code (the sprite compresses about its own base and never translates).

### Sprite sheets

3 columns x 8 rows with a 4 px transparent gap between frames; the rects in `sheet.json` exclude the gap. `rest` is index 23 and `pressed` index 5. The hero @2x sheet is 3848 x 4124: over 4096 tall, inside 8192 (every current iPhone and mid-range Android).

### Shadows

The contact shadows are not ray traced: a sun at 30 degrees would throw the shadow sideways, and a button needs one under its belly. `post.py` builds them from the rendered silhouette (footprint width, base line), as a blurred ellipse in ink (light) or deep ink (dark). Pressed: shorter offset, 40 percent less blur, a little darker (§2).

### Sky layers

Each layer is a field that is periodic in x (every noise frequency is quantized to a whole number of cells per period, and every cloud is evaluated with its wrapped neighbours) rendered through an orthographic camera that spans exactly one period. The left and right edges meet with no seam; `post.py` prints the edge difference. far: 22 small, flat cumulus humilis high in the frame; mid: 9 medium cumulus in the middle; near: 4 large, soft, low masses. Stack over the sky gradient at 0.72, 0.84, 0.94 with parallax 0.2, 0.5, 1.0 and reuse `assets/cloud-layers/grain.png` at 3 percent soft-light.

## Render budget (this machine: 4 CPUs, shared)

RENDER_TIMES

## Formats

PNG: 256-colour RGBA palette, Floyd-Steinberg dithered (for the phone). WebP: lossy with alpha, quality 82, method 6 (for the web). Straight alpha in both.
