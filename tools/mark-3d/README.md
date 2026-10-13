# tools/mark-3d

The Obavia mark built in real 3D in Blender 4.2 (bpy as a Python module, Cycles CPU, OpenImageDenoise), from the SVG, and rendered to `assets/mark-3d/`. Owner's instruction: "use blender for a majority of the assets, making the logo, etc, especially if it produces the high level quality."

## Two marks, two sets

The repo carries two different marks (they differ by md5 and in form):

| Set | Source | What it is | Where it is live today |
| --- | --- | --- | --- |
| `a` | `obavia-co/assets/obavia-connected-mark.svg` (128 viewBox) | two interlocking paths, ice gradient and blue gradient, together a disc split by an S | legacy agency blog pages only |
| `b` | `desk/public/mark.svg` (64 viewBox; identical copies in `auction/assets`, `films/public`, `obavia-co/favicon.svg` and inlined in the dealer page loader) | an ice-to-blue orb with a white S ribbon | dealer page favicon and loader, Desk, app, films |

`a` is the geometry the brief describes and the older file (September 29); `b` is what ships. Both final sets are rendered so the owner can pick; nothing outside `assets/mark-3d` changes until he does.

## How each is built

**a, the connected paths.** `bpy.ops.import_curve.svg` brings in the two paths as Bezier curves (document order: blue, then ice). Each is normalised to a disc of radius 1, extruded with a round bevel (depth 0.13, bevel 0.058, offset inward so the silhouette stays the SVG's), converted to mesh and voxel remeshed (0.0045) for an even surface. The interlock: the paths overlap at an upper crossing and a lower crossing and nowhere between SVG y 58 and 69. A depth field built from the two masks (normalised Gaussian convolution, +1 on the upper crossing, -1 on the lower, tanh shaped) lifts the ice over the blue at the top and the blue over the ice at the bottom; the swing is solved so every overlapping pixel keeps 0.03 of air between the bodies (logged as `FIELD`). The flat SVG stacks the ice over the blue everywhere; the 3D build swaps the lower crossing so the two bodies truly interlock.

**b, the orb.** A flattened sphere (z 0.26) of ice glass carrying the SVG's linear gradient and its radial blue shade; the ribbon is the stroke's two arcs computed exactly (SVG arc endpoint to centre conversion, `rotate(-35.5)`), swept as a tube of the stroke's width, round caps, lying on the orb's surface so its shadow is real.

**Materials.** Ice: Principled, transmission 0.95, IOR 1.45, roughness 0.07, a trace of subsurface, the SVG ice gradient at 45 percent on the surface and the rest in a volume absorption (`#B9CBF4`), so thick paths tint like real ice. Blue: transmission 0.35, roughness 0.22, subsurface 0.12, the SVG blue gradient. Shadow rays pass the glass tinted (a light path mix) instead of stopping dead, which gives coloured glass shadows without caustic paths.

**Light.** Day: a 3 x 7 softbox key from top-left, a thin cool rim strip from the right, a top strip, a soft fill, the world a `#F2F6FF` to `#DCE6FA` gradient (half strength for lighting, full strength in reflections). A plane under the mark carries the house sky as an emission that only refraction and reflection rays see, so the glass bends the real page while the film stays transparent; a shadow catcher gives the contact shadow. Ink: the same, with an ink plane that glows cool behind the mark (the ice lit from behind), rims left and right. Flat (16 and 32 px): a frontal, rougher, more graphic split and no ground.

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

`mark-hero.png` (2048, transparent), `mark-hero@1x.webp` (1024), `mark-on-sky.png`, `mark-on-ink.png` (2048), `icon-1024.png` (opaque house sky, mark at 62 percent, unrounded), `icon-512.png`, `icon-192.png`, `favicon-32.png`, `favicon-16.png` (from the flat variant, transparent), `splash-icon.png` (1024 transparent), `turn/000.png` to `059.png` (512, 2 s at 30 fps; 12 degrees and back on sine in-out, one light sweep that is zero at both ends; reduced motion shows `000`), `turn-sheet.png` + `turn-sheet.json` (10 x 6, row-major), `turn.webp` (animated), `contact.png`. `assets/mark-3d/contact.png` stacks both sets.
