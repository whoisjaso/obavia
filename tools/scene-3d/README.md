# Scene 3D: the car objects

The objects the lane is about, rendered in the house material so a dealer and a buyer see the real thing next to the number it means (DOCTRINE §4 rule 5, §5; `docs/design/lego.md` §4). Rendered from scratch in Blender (Cycles), deterministic, published to `assets/scene-3d/`. Not wired into any screen yet; that is a separate task.

| # | Object | Lands on | Still | Moment (24 frames) |
| --- | --- | --- | --- | --- |
| 1 | `car`: a generic sedan (no brand) | the Lane's empty state, the Let It Go opener | yes | |
| 2 | `key`: a modern fob on a ring | the pass, pickup | yes | |
| 3 | `title`: a blank sheet with a soft fold, an inset border and a seal | the title gate, the 21-day clock | yes | |
| 4 | `plate`: a blank plate with the Texas outline raised | the $10 line, Plates | yes | |
| 5 | `pass`: a tile with a soft code grid (encodes nothing) | the pass | yes | |
| 6 | `clock`: a ring with a sweeping arc and a crown | the close, the pay deadline | yes | the arc sweeps from twelve to its mark |
| 7 | `hammer`: a gavel meeting a cloud, the puff frozen | Sold, Won | yes | the fall, the press, the puff that freezes |
| 8 | `coin`: the deposit coming back toward the viewer | the worst case | yes | flies in, spinning down, motion blurred |
| 9 | `bleed`: the clock ring with one red drip | the Floor screen's holding cost | yes | the drop gathers and hangs |
| 10 | `licence`: a blank ID card, a photo well, the Texas outline as a small raised mark | the ID scan frame | yes | |
| 11 | `insurance`: a blank card folded once, lying half open | the insurance scan frame | yes | |

No object carries text, a number, a state name or a brand. The plate's Texas outline is simplified from public-domain border coordinates (`objects.TEXAS`). The pass's grid is seeded noise around three finder squares; it scans as nothing. The drip is the only red in the house.

## The material

Every object is built from the mark's materials and lit by the cloud rig, so it sits in the same family as `assets/mark-3d/` and `assets/cloud-3d/`:

- **ice** (`rig.ice`): the mark's ice. Transmission 0.85, roughness 0.08, a breath of subsurface, the colour in a volume absorption (`#B9CBF4`) so it tints by thickness. Cabin glass, buttons' rings, the plate's rim and outline, the ring's track, the gavel's handle and bands.
- **frosted blue** (`rig.frosted`): the mark's blue, lightened to the mark's on-screen value, transmission 0.5, roughness 0.25 under a clear coat (polished outside, frosted inside), a ramp from `#6A86BC` low to `#B9CBF4` high. A deep variant for tyres and the code grid.
- **milk** (`rig.milk`): frosted ice turned milky (subsurface 0.65): the title's paper, the pass tile, the fob's buttons.
- **red** (`rig.red`): red glass, one drip, `bleed` only.
- **cloud**: the hammer's cloud is the cloud rig's own volume (`tools/cloud-3d/field.py` `button_density`, its own seed 2611), pressed and puffing per frame, extinction 110 per unit like the button.
- Shadow rays pass through every glass tinted (the mark's `glass_shadow`), so shades are soft and blue, not black.

**The rig** (`rig.py`) imports `tools/cloud-3d/scene.py` and uses it unchanged: the gradient world as the `sky` light group, the warm low key sun (30 degrees, upper left) and the cool rim sun (above and behind), widened from 1.2 to 9 and 6 degrees so glass catches a soft highlight instead of a chrome glint. Two things are added for glass: a **page** sphere around the shot, visible only to refraction and reflection, emitting white in its own light group; and a **shadow catcher** ground.

**The grade** (`grade.py`, plain python3) makes both variants from one render, as the cloud rig does:

- light: key 1.3, rim 0.35, sky 0.55; the page pass tinted with the house sky (`#E6EDFC`), so the glass bends the page it will sit on; a soft shoulder above 0.78.
- dark lane: key 0.3, rim 1.25, sky 0.22; the page pass tinted ink with a cool lift, so the glass bends the ink lane and the rim carries the shape.
- cloud pixels (no surface hit) go through `tools/cloud-3d/grade.py` itself, from passes denoised image-only as the cloud rig does (albedo and normal turn a volume lumpy); glass passes are denoised with albedo and normal.
- the shade: what the catcher lost, blurred (the catcher is not denoised), as ink at 30 percent on sky and deep ink at 40 percent on the lane (cloud-system §5, `cloud-shade`).
- every published frame's alpha fades over its outer 4 percent so a long shade never ends at a hard wall.

Determinism: Cycles seed 1013, no animated seed, adaptive sampling on a fixed threshold, the pass grid seeded with `SeedSequence(20261013)`, the cloud fields seeded; no `random` anywhere. Measured: two renders of the same object give identical Cycles samples, identical alpha, catcher and index, and identical image-only denoised passes; the glass passes denoised with the ACCURATE prefilter differ by at most 0.0005 linear in under 1 percent of pixels (OpenImageDenoise threading). `post.py` is byte-identical on the same passes. Open item: switch the glass denoise to the FAST prefilter (deterministic here) and re-measure before calling the bytes reproducible.

## Run it

From the repo root:

```sh
BLENDER_PY=/path/to/blender-venv/bin/python IMAGEQUANT_PATH=/path/to/iq tools/scene-3d/render.sh   # everything
STAGE=clouds  tools/scene-3d/render.sh      # the hammer's 24 cloud grids (python3)
STAGE=stills  tools/scene-3d/render.sh      # nine stills, 1024 master, 64 spp + OIDN
STAGE=moments tools/scene-3d/render.sh      # clock, bleed, coin, hammer: 24 frames, 512 master, 32 spp + OIDN
STAGE=post    tools/scene-3d/render.sh      # regrade, size, quantize, sheets, contact, placements
```

One object, one frame, for a look (low resolution first, always):

```sh
$BLENDER_PY tools/scene-3d/render_objects.py tools/scene-3d/.work car 256 32 --tag=test --frames=23
$BLENDER_PY tools/scene-3d/render_objects.py tools/scene-3d/.work car 256 16 --tag=clay --clay   # grey clay, geometry only
```

`STILL_W`, `STILL_SPP`, `SEQ_W`, `SEQ_SPP` override sizes and samples. Linear passes go to `tools/scene-3d/.work/` (gitignored): `final/<name>/23.npz` for stills, `seq/final/<name>/<frame>.npz` for moments, `clouds/hammer-<frame>.npy` for the grids. Each step skips what exists; delete a file to redo it.

## Files

| File | Runs in | Does |
| --- | --- | --- |
| `geo.py` | bpy | rounded outlines, curve slabs (outline extruded with every edge rounded; the outline grows by the bevel), tubes, lathes, joins |
| `objects.py` | bpy | the eleven objects and the `OBJECTS` table (camera azimuth, elevation, lens; the box the camera frames; canvas size; frames; motion blur) |
| `timing.py` | python3 | the moments' timing: the puff, shared by the cloud builder and the scene |
| `rig.py` | bpy | setup, materials, page, ground, camera, the light-group render |
| `render_objects.py` | bpy | the camera fit (the box fills 86 percent of the frame, centred by lens shift) and the render loop |
| `build_clouds.py` | python3 | the hammer's cloud grids |
| `grade.py` | python3 | passes to light and dark RGBA |
| `post.py` | python3 | publish: sizes, PNG (libimagequant) and WebP, frames, sheets, JSON, contact, placements |

## Outputs (`assets/scene-3d/`)

```
<name>/{light,dark}/still.png still@2x.png (+ .webp)      every object; @2x is the master
<name>/{light,dark}/frames/000.webp ... 023.webp (+ @2x)  clock, hammer, coin, bleed (web)
<name>/{light,dark}/sheet.png sheet.json (+ @2x)          clock, hammer, coin, bleed (phone, no webp)
contact.png                                               every object on sky and on ink, the 48 px row, the moments as strips,
                                                          the licence and insurance cards beside the Scan frame they stand for
placements/car-price-seeded.png                           the car beside a price (seeded figure, ink lane)
placements/title-before-day-21.png                        the title beside BEFORE DAY 21
placements/plate-10.png                                   the plate beside $10
placements/coin-250-back.png                              the coin beside $250 BACK
```

Canvas: `car`, `plate`, `licence` and `insurance` 1024 x 640 at @2x (512 x 320 at @1x); the rest 1024 square (512). Moments: 512 square (256) per frame.

### Sheets

Same contract as the cloud sheets: 3 columns x 8 rows, a 4 px transparent gap between frames, rects in the JSON exclude the gap, `fps` 60, `duration_ms` 400, `rest` 23 (the still's pose). Play 0 to 23 once and hold 23. The @2x sheet is 1544 x 4124.

| Moment | Frames |
| --- | --- |
| clock | the arc grows from 0 to 250 degrees on an expo out; 23 is the still |
| hammer | 0 to 6 the gavel falls (accelerating), 6 contact, 6 to 9 the cloud compresses 10 percent, 9 to 23 it swells 6 percent, loosens and throws its wisps out on an ease out, so the last frames are the puff frozen; the gavel rebounds 4 degrees and holds |
| coin | flies in from far up and right, spinning 300 degrees down to rest facing the viewer, Cycles motion blur (shutter 0.5); it is still moving a little at 23, so the still keeps a trace of blur |
| bleed | the drip lengthens and its drop swells under the arc's lowest point |

## Render budget (this machine: 4 CPUs shared with two other Blender renders, load 8 to 12)

Measured October 13, 2026 at load 8 to 24 on 4 CPUs (two other Blender renders running), so a quiet machine is several times faster.

| Stage | Size, samples | Time |
| --- | --- | --- |
| Low-resolution look, one object | 256 wide, 32 spp + OIDN | 16 to 32 s (hammer with its cloud 68 to 85 s) |
| Clay look, one object | 256 wide, 16 spp | 5 to 10 s |
| Hammer cloud grid, one frame (241 x 111 x 97 voxels, 4 workers) | | 12 to 34 s |
| car still | 1024 x 640, 64 spp + OIDN | 347 s |
| key still | 1024 x 1024, 64 spp | 351 s |
| title still | 1024 x 1024, 64 spp | 732 s |
| plate still | 1024 x 640, 64 spp | 617 s, 624 s after the slot fix |
| pass still | 1024 x 1024, 64 spp | 861 s |
| clock still | 1024 x 1024, 64 spp | 724 s |
| coin still | 1024 x 1024, 64 spp | 1242 s |
| licence still | 1024 x 640, 64 spp | 568 s |
| insurance still | 1024 x 640, 64 spp | 564 s |
| bleed, hammer stills; the four moments (96 frames at 512, 32 spp) | | rendering; filled in when their sheets land |
| post for nine stills (grade, two sizes, two variants, PNG and WebP, contact, placements) | | 125 s |

## Byte totals

Published so far (nine stills, light and dark, @1x and @2x), measured on disk:

| Object | PNG (4 files) | WebP (4 files) |
| --- | --- | --- |
| car | 213,425 | 86,032 |
| key | 235,337 | 94,666 |
| title | 356,303 | 119,162 |
| plate | 233,875 | 70,276 |
| pass | 519,209 | 121,998 |
| clock | 207,071 | 116,674 |
| coin | 291,376 | 93,582 |
| licence | 242,230 | 65,798 |
| insurance | 217,379 | 80,448 |
| all stills | 2,516,205 | 848,636 |

contact.png 465,308; placements 243,653; `assets/scene-3d/` total 4,073,802 bytes. Budget: one still on the phone is at most 140 KB (@2x PNG, the pass tile); on the web at most 70 KB (@2x WebP).

## Formats

PNG: 256-colour RGBA palette by libimagequant with dithering (`pip install imagequant`, or `IMAGEQUANT_PATH` at a `pip install --target` dir); without it `post.py` writes full-colour PNGs and never falls back to Pillow's quantizer. WebP: lossy with alpha, quality 82, method 6. Straight alpha in both.

## What is not done here

Wiring into screens (a separate task). The grain (`assets/cloud-layers/grain.png`) is applied on the surface, not baked. Type in the placements is the house faces set by Pillow for the test only; on the glass the platform and the browser set it.
