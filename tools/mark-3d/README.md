# tools/mark-3d

The Obavia mark built in real 3D in Blender 4.2 (bpy as a Python module, Cycles CPU, OpenImageDenoise), from the SVG, and rendered to `assets/mark-3d/`. Owner's instruction: "use blender for a majority of the assets, making the logo, etc, especially if it produces the high level quality."

## Two marks, two sets

The repo carries two different marks (they differ by md5 and in form):

| Set | Source | What it is | Where it is live today |
| --- | --- | --- | --- |
| `a` | `obavia-co/assets/obavia-connected-mark.svg` (128 viewBox) | two interlocking paths, ice gradient and blue gradient, together a disc split by an S | legacy agency blog pages only |
| `b` | `desk/public/mark.svg` (64 viewBox; identical copies in `auction/assets`, `films/public`, `obavia-co/favicon.svg` and inlined in the dealer page loader) | an ice-to-blue orb with a white S ribbon | dealer page favicon and loader, Desk, app, films |

Canonical: `a`. `docs/design/blender-pipeline.md` names the mark-3d deliverable "the mark as two interlocking ice bodies", which is `a`'s geometry, and it is the older file (September 29). `b` is what ships today; it was built and test-rendered (scratchpad iterations below) but has no final set. Nothing outside `assets/mark-3d` changes until the owner approves the look.

## How each is built

**a, the connected paths.** `bpy.ops.import_curve.svg` brings in the two paths as Bezier curves (document order: blue, then ice). Each is normalised to a disc of radius 1 (width 2.0), extruded with a round bevel offset inward so the silhouette stays the SVG's, converted to mesh and voxel remeshed (0.0045) for an even surface.

Default stacking, `--stack behind` (the coordinator's review of October 13): each body 0.07 deep with a 0.03 bevel (1.5 mm at a 100 mm mark), the ice centred at +0.05 and the blue at -0.05, so the blue sits 5 percent of the width behind the ice and the whole mark is 0.17 deep (8.5 percent of the width). The ice covers the blue everywhere, as in the flat SVG, and both blue hooks are seen through the ice.

The earlier stacking, `--stack interlock` (first finals, judged "one thick coin"): bodies 0.13 deep with a 0.058 bevel and an under-over. the paths overlap at an upper crossing and a lower crossing and nowhere between SVG y 58 and 69. A depth field built from the two masks (normalised Gaussian convolution, +1 on the upper crossing, -1 on the lower, tanh shaped) lifts the ice over the blue at the top and the blue over the ice at the bottom; the swing is solved so every overlapping pixel keeps 0.03 of air between the bodies (logged as `FIELD`). The flat SVG stacks the ice over the blue everywhere; the 3D build swaps the lower crossing so the two bodies truly interlock.

**b, the orb.** A flattened sphere (z 0.26) of ice glass carrying the SVG's linear gradient and its radial blue shade; the ribbon is the stroke's two arcs computed exactly (SVG arc endpoint to centre conversion, `rotate(-35.5)`), swept as a tube of the stroke's width, round caps, lying on the orb's surface so its shadow is real.

**Materials.** Ice: Principled, transmission 0.85, IOR 1.45, roughness 0.08, subsurface 0.08 (a thin tint), the SVG ice gradient at 45 percent on the surface and the rest in a volume absorption (`#B9CBF4`), so thick paths tint like real ice. Blue: transmission 0.35, roughness 0.22, subsurface 0.12, the SVG blue gradient. Shadow rays pass the glass tinted (a light path mix) instead of stopping dead, which gives coloured glass shadows without caustic paths.

**Light.** Day: a 7 x 9 softbox key from top-left (soft, so no chrome glints), a cool rim strip from the right, a top strip, a soft fill, the world a `#F2F6FF` to `#DCE6FA` gradient (half strength for lighting, full strength in reflections). A plane under the mark carries the house sky as an emission that only refraction and reflection rays see, so the glass bends the real page while the film stays transparent; a shadow catcher gives the contact shadow. Ink: the same, with an ink plane that glows cool behind the mark (the ice lit from behind), rims left and right. Flat (16 and 32 px): a frontal, rougher, more graphic split and no ground.

**Post (`post.py`).** Reads the 16-bit renders through bpy (Pillow truncates 16-bit RGBA), re-tints the shadow catcher's black to ink at 55 percent and fades alpha over the outer 12 percent of the frame, composites in float, resizes with Lanczos on premultiplied float, and writes 8-bit with a seeded TPDF dither of one code value (no banding).

Deterministic: Cycles seed 7, no animated seed, dither seed 20261013, no other randomness.

## Commands

```sh
BPY=/path/to/blender-venv/bin/python
BPY=$BPY tools/mark-3d/render.sh                 # everything: hero ink small turn, then post
BPY=$BPY MARKS=a tools/mark-3d/render.sh hero post
# one test render
$BPY tools/mark-3d/mark3d.py --mark a --look day --res 384 --samples 64 --out /tmp/a.png
# knobs: HERO_RES HERO_SPP TURN_RES TURN_SPP RAW; debug flags on mark3d.py: --clay --hide name
```

Raw 16-bit renders go to `tools/mark-3d/raw/` (git ignored) with `raw/times.tsv`.

## Outputs, per set, in `assets/mark-3d/a/` and `assets/mark-3d/b/`

`mark-hero.png` (2048, transparent), `mark-hero@1x.webp` (1024), `mark-on-sky.png`, `mark-on-ink.png` (2048), `icon-1024.png` (opaque house sky, mark at 62 percent, unrounded), `icon-512.png`, `icon-192.png`, `favicon-32.png`, `favicon-16.png` (from the flat variant: frontal, rougher, full SVG ice gradient so the ice does not melt into a light tab; transparent), `splash-icon.png` (1024 transparent), `turn/000.png` to `059.png` (512, 2 s at 30 fps; the mark and its lights stay still while the camera orbits 6 degrees about the vertical axis toward frontal and back on sine in-out, so the side wall never faces the viewer; one 90 W light sweep, zero at both ends, carries the breath; reduced motion shows `000`), `turn-sheet.png` (512 cells) and `turn-sheet@256.png` + `turn-sheet.json` (10 x 6, row-major), `turn.webp` (animated), `contact.png`. The top-level `assets/mark-3d/contact.png` (both sets stacked) is written only when both sets are rendered; set b has no finals.

## Iterations (low resolution, each Read and judged before the next)

Paths in the session scratchpad `mark3d/`:

| File | Judgement | Change that followed |
| --- | --- | --- |
| `flat-ab.png`, `order.png` | the two SVGs differ materially; the stacking options for a | depth plan |
| `it1/pv.png` | overexposed, chalky; b ribbon not matching | lights down 3x |
| `it2/pv.png` | exposure right; a horizontal crease across a | overlap-driven depth field |
| `it3/pv.png` | crease gone; ice and blue too close in value | ice milkier, blue denser |
| `it4`, `it5`, `it6`, `it7` (`cmp6x.png`) | ink and 16 px checks; the frontal camera was rotated 180 degrees (to_track_quat ambiguity) | explicit look-at basis; flat variant for small sizes |
| `iter-01.png` | milky resin, nothing refracted, near plastic | clear ice, refraction-only backdrop, softboxes |
| `iter-02.png` | real refraction; a crease-like line on the left ice | tanh field shaping |
| `iter-03.png` | ice too blue, a dark smudge left | lighter absorption |
| `iter-04.png` | both marks read as glass (a and b) | caustics off for speed |
| `iter-05.png` | glass cast black shadows | tinted shadow rays |
| `iter-06.png` | shadows right; smudge traced to Principled tint compounding on internal bounces | colour moved into volume |
| `iter-07.png`, `iter-08-ink.png`, `iter-09-*.png` | strongest interlock version; ink back glow added | first finals (interlock) |
| `iter-10.png` | review pass: thin bodies, blue 5 percent behind, soft key; blue reads through the ice at both crossings | pass 2 finals |
| `final2-a-view.png`, `fav-pass2.png` | pass 2 hero passes; favicons melted into light tabs, fixed with the tinted flat variant | small re-render |
| `assets/mark-3d/a/contact.png` (object-rotation turn) | 12 degree object turn: a straight slice clipped by the ground plane, and the side reads as a slab | camera orbit |
| `iter-11-orbit.png`, `iter-12-orbit.png` | orbit: no slab, no clipping; sweep at 220 W washed out the peak, 90 W reads as a breath | final turn |

## Render times (Cycles CPU, 4 threads, OpenImageDenoise)

| Render | Time |
| --- | --- |
| a hero, 2048 px, 128 samples (pass 2) | 3587 s |
| a on ink, 2048 px, 128 samples | 1832 s |
| a small (favicon source), 256 px, 256 samples | 37 s |
| a turn, 60 frames at 512 px, 32 samples (object rotation, superseded) | 2867 s, 47.7 s a frame |
| a turn, camera orbit 6 degrees (final), 60 x 512 px, 32 samples | 7071 s, 118 s a frame (CPU shared with another agent's render; 47.7 s a frame when alone) |
| a hero, interlock stacking (pass 1, superseded) | 3247 s |
| a test at 384 px, 64 samples | 85 to 150 s |
| post (all of set a, animated WebP included) | about 6 min |
