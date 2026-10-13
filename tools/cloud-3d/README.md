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
STAGE=labels tools/cloud-3d/render.sh                                       # the label imprints only
STAGE=sync tools/cloud-3d/render.sh                                         # copy the web's share only
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
python3 tools/cloud-3d/render_labels.py tools/cloud-3d/.work masks
$BLENDER_PY tools/cloud-3d/render_labels.py tools/cloud-3d/.work render 1280 20
python3 tools/cloud-3d/render_labels.py tools/cloud-3d/.work post assets/cloud-3d
node tools/cloud-3d/sync.mjs                                               # the web's share, see Where it ships
```

## Outputs (`assets/cloud-3d/`)

```
button/safe-zone.json                     label safe rect per size (CSS px and device px)
button/{light,dark}/{320,440,640}/        640 is the hero
  rest.png  rest@2x.png                   frame 23
  pressed.png  pressed@2x.png             frame 5: 6 percent shorter about the base, 15 percent denser
  press/000.png ... 023.png (+ @2x)       the 400 ms press, 60 fps
  shadow-rest.png  shadow-pressed.png (+ @2x)
  sheet.png sheet.json  sheet@2x.png sheet@2x.json   (phone only, no webp)
  every other .png has a .webp beside it
button/wisp.png wisp@2x.png wisp-dark*    one soft wisp, 128 px (256 at @2x)
button/ring.png ring@2x.png ring-dark*    a soft air ring, 256 px (512 at @2x)
sky/{light,dark}/{far,mid,near}.png/.webp 2048 x 1024, tile horizontally
button/{light,dark}/640/etched-reference.png  GET ON THE LANE carved into the volume (reference only)
contact.png                               the owner's one-glance judgement sheet
labels/labels.json                        every label: text, cap size, the rect per size and scale, the contrast
labels/{light,dark}/{320,440,640}/<slug>@1x.png <slug>@2x.png       the imprint, cut to the safe rect
labels/{light,dark}/{320,440,640}/<slug>-lip@1x.png <slug>-lip@2x.png   its lit wall alone (landed)
labels/{320,440,640}/<slug>-floor@1x.png <slug>-floor@2x.png       the floor's solid core (contrast test only)
labels/contact.png                        every imprint on the 640 rest sprite, light and dark
```

Canvas per CSS width: 320 x 128, 440 x 176, 640 x 256 (2.5:1). The cloud body inside spans about 89 percent of the width and reads at about 3.2:1; the rest of the canvas holds the crowns, the wisps and the puff.

### The press, frame by frame

Keyframed in `field.press_params`, no randomness: the field's vertical scale about the base, its horizontal swell, its density, the edge looseness, and an outward wisp ring with its drift distance.

| Frames | Phase | What the field does |
| --- | --- | --- |
| 0 to 5 | sink | compresses to 94 percent height about the base, density up to 115 percent (ease out); frame 5 is `pressed` |
| 6 to 15 | puff | releases; lobes swell up to 3 percent (peak at frame 10), the edge ramp widens, wisps rise and drift outward |
| 16 to 23 | settle | a 0.45 percent undershoot and back; wisps fade; frame 23 is exactly `rest` |

At the puff peak the outward wisps reach the canvas edge; `post.py` fades alpha over the outer 3.5 percent of every frame so they thin out instead of clipping (nothing at rest reaches that band).

The re-inflation is baked into frames 6 to 23: play them linearly at 60 fps. The translateY sink of §2 stays in code (the sprite compresses about its own base and never translates).

### Sprite sheets

3 columns x 8 rows with a 4 px transparent gap between frames; the rects in `sheet.json` exclude the gap. `rest` is index 23 and `pressed` index 5. The hero @2x sheet is 3848 x 4124: over 4096 tall, inside 8192 (every current iPhone and mid-range Android).

### Shadows

The contact shadows are not ray traced: a sun at 30 degrees would throw the shadow sideways, and a button needs one under its belly. `post.py` builds them from the rendered silhouette (footprint width, base line), as a blurred ellipse in ink (light) or deep ink (dark). Pressed: shorter offset, 40 percent less blur, a little darker (§2).

### Sky layers

Each layer is a field that is periodic in x (every noise frequency is quantized to a whole number of cells per period, and every cloud is evaluated with its wrapped neighbours) rendered through an orthographic camera that spans exactly one period. The left and right edges meet with no seam; `post.py` prints the edge difference. far: 22 small, flat cumulus humilis high in the frame; mid: 9 medium cumulus in the middle; near: 4 large, soft, low masses. Stack over the sky gradient at 0.72, 0.84, 0.94 with parallax 0.2, 0.5, 1.0 and reuse `assets/cloud-layers/grain.png` at 3 percent soft-light.

## Where it ships

`render.sh` ends with `sync.mjs` (node, no dependencies), which empties and refills the two web copies from the contract, deterministically: `obavia-co/assets/cloud-3d/` and `desk/public/cloud-3d/`. It copies WebP only: rest, pressed and the two shadows at 1x and @2x, the 24 press frames at 1x and @2x for 320, 440 and 640 in light and dark, wisp and ring, the six sky layers, `safe-zone.json` and each size's `sheet.json` and `sheet@2x.json` (geometry and phases; the sheet images stay phone only). 363 files, about 17.5 MB per copy. The web's sprite tier loads one size at the device's scale and its 24 frames after the first paint (`cloud3d-engine.js`; force it with `?cloud3d=sprites`).

The phone takes its own share with `node auction/scripts/cloud3d.mjs`: the 320 and 440 sheets at @2x, converted to WebP, the shadows and the sky, with a generated manifest of literal requires.

## Render budget (this machine: 4 CPUs, shared)

Measured on October 13, 2026 while another agent rendered on the same 4 CPUs (load 10 to 17), so a quiet machine is faster.

| Stage | Size, samples | Time |
| --- | --- | --- |
| Button grid, one frame (321 x 129 x 127 voxels, 4 workers) | | 28 to 110 s |
| Button rest (23), pressed (5), frames 0 and 1 | 1280 x 512, 20 spp + OIDN | 404 to 486 s each |
| Button in-between frames 2 to 4, 6 to 22 | 960 x 384, 16 spp + OIDN | 106 to 406 s each |
| Etched reference | 1280 x 512, 20 spp, step rate 1.0 | 1130 s |
| wisp, ring | 256, 512 square, 48 spp | 10 s, 89 s |
| Sky far, mid, near grids | 737 x 209 x 142, 576 x 163 x 89, 419 x 119 x 92 | 468 s, 130 s, 64 s |
| Sky far, mid, near | 2048 x 1024, 16 spp + OIDN | 58 s, 325 s, 807 s |
| post.py (grade, sizes, palette PNG, WebP, sheets) | | about 3 min |
| Whole pipeline from an empty `.work` | | about 2.5 h |

The in-between frames render at 960 wide to keep the press inside the budget. Every published size except the hero @2x is a downsample. The hero @2x in-betweens are upscaled 1.33x; rest, pressed and frames 0 and 1 are native 1280. Set `INBETWEEN_W=1280` for a native hero (about 2x the time).

## Formats

PNG: 256-colour RGBA palette made by libimagequant with dithering (for the phone); `pip install imagequant` (or point `IMAGEQUANT_PATH` at a `pip install --target` dir). Without it `post.py` writes full-colour PNGs; it never uses Pillow's octree quantizer, which posterizes the volume into cel-shading. WebP: lossy with alpha, quality 82, method 6 (for the web). Straight alpha in both.

## The etched reference

`render_etched.py` carves the label into the rest volume inside Cycles. `build_fields.py etch` writes a glyph mask (DejaVu Sans Bold, upright spaced capitals, centred in the safe rect) and a front-surface depth map (the first voxel above density 0.06 along the view axis) as 16-bit PNGs. The volume shader projects both along the view axis and removes density from the visible surface to 0.14 units deep (about a third of the belly's front depth), feathered 0.03 units at the floor and by a blurred mask at the glyph edges. The same sun shades the groove: the walls fall into blue-grey shade and the floor reads as ink. Labels are never baked into the shipped sprites.

## The label imprints

The phone's label is the real cut, not three stacked copies of the text. `render_labels.py` carves each label in `labels.json` (Bid, Pay, That's me, Continue, Done, Sign, Back to the lane, Not now, Get on the lane, Let a car go) into the rest volume in Cycles exactly as the etched reference is carved (glyph mask plus front-surface depth, 0.14 units deep, feathered), and ships only what the carve changes.

1. **Masks (python3).** The label in upright spaced capitals, set as the app sets it: the platform face at weight 600 (Inter SemiBold, `fonts/Inter.ttf`, OFL, stands in for SF Pro and Roboto), 17 pt (the glass's floor, DOCTRINE §4.3; raised from 13 pt on October 13, 2026) with 3.1 pt tracking (0.18 em) on a 345 pt cloud, so the em is 0.04928 of the canvas width at every size and the cap height 12.4 pt (11.5 px on the 320 canvas, 15.8 on the 440, 22.9 on the 640, under `safe-zone.json`'s 12, 16 and 24); a label wider than 92 percent of the safe rect is set smaller (Back to the lane at 12.8 pt, Get on the lane at 13.8 pt: neither holds 16 pt in the rect at any tracking), as `adjustsFontSizeToFit` does. The cap line is centred at 0.58 of the canvas height, so the taller cap stays inside the top of the safe rect, on the sunlit face of the belly: lower than about 0.63, the belly turns to its blue-grey underside (luminance 0.1 to 0.2), where no floor can hold 4.5:1.
2. **Renders (bpy).** Only the safe rect and a margin (canvas 0.219 to 0.781 by 0.469 to 0.813, a Cycles border crop, 720 x 176 at 1280) are rendered: once plain and once per label, same grid (frame 23), seed, samples and step rate 1.0, so the difference is the carve and nothing else.
3. **Post (python3).** Both variants are graded from each render (`grade.py`) and composited on their page. The floor then takes a fill so the label reads, shaded by the same sun: on the light cloud a deep ink a step under the house ink (`#0F1626` at 97 percent; lighter fills measured 3.8 to 4.4:1 on the widest labels), on the dark lane a thin ice (`#E9EFFE` at 90 percent). The walls come from the same sun (upper left, 30 degrees): the stroke's lower-right edge is the wall facing the sun and is lit; its upper-left edge faces away and is in shade (visible on the ice floor). The carved composite is then unblended against the plain one into the transparent layer with the least alpha that reproduces it (the imprint), never thinner than the fills where they cover the cut, so the floor stays the floor over every frame, limited to the carve's reach, resized from the 1280 master to every size and scale, cut to that size's safe rect and quantized with libimagequant. The lip layer is the part of the imprint brighter than the cloud.

The phone lays the imprint over whatever frame the sheet shows (the cut moves with the cloud as it sinks); under the press a second copy deepens it 10 percent; on landed the lip layer brightens with the swell (`auction/src/components/CloudButton.tsx`, `IMPRINT`). No imprint is rendered from the pressed frame: the deepening stands in for it.

Contrast (`labels.json` `contrast`, re-measured on the shipped sprites in `auction/src/components/etch.test.ts`): each floor pixel against the cloud around it (the frame's luminance blurred at half a cap height) holds 4.5:1 or better on the rest frame and on the pressed frame with the deepening, at every size measured at 2x, and at 1x where the stroke has a solid core. 320 at 1x has no solid floor pixel (the strokes are under 2 px).

| Stage | Size, samples | Time |
| --- | --- | --- |
| Masks, 10 labels | 2048 x 512 texture each | about 3 s |
| Plain crop | 720 x 176 of 1280 x 512, 20 spp + OIDN, step rate 1.0 | about 300 s |
| One label | same | 276 to 591 s (median 300 s) |
| All ten labels and the plain | | about 66 min of render (October 13, 2026, load 8 to 13 from another agent on the same 4 CPUs) |
| Post (grade, fill, unblend, 3 sizes x 2 scales x 2 variants, quantize, contact) | | 29 s |
