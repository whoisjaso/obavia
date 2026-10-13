# The Blender pipeline

The owner's instruction (October 13, 2026): "use Blender for a majority of the assets, making the logo, etc., especially if it produces the high level quality." Blender is the asset source for Obavia. Vector, procedural CSS and photographic composites are fallbacks, never the primary.

## 1. The setup

Blender 4.2 runs as a Python module (`bpy`) in a venv, headless, Cycles on CPU with OpenImageDenoise. Every asset is a script under `tools/<asset>-3d/` with a `render.sh`, a README with the exact commands and render times, and a seed. Running the script twice gives the same bytes. Nothing is hand-edited in a GUI; if a look needs a change, the script changes.

| Folder | Produces | Owner agent |
| --- | --- | --- |
| `tools/cloud-3d/` → `assets/cloud-3d/` | the cloud material, the button (rest, pressed, 24 press frames, shadows, sheets), the three sky layers light and dark | creative-edge |
| `tools/mark-3d/` → `assets/mark-3d/` | the mark as two interlocking ice bodies, hero renders on sky and ink, the app icon set, the splash, a 60-frame idle turn | creative-edge |
| `tools/scene-3d/` → `assets/scene-3d/` (planned) | section illustrations for the dealer and buyer pages, film backplates, the Won moment, Desk empty states | creative-edge |

## 2. The look, in every scene

- World: the house sky gradient (`#DCE6FA` to `#F2F6FF`) or ink (`#1C2436`). Key light low and warm, fill cool, one rim. No HDRI with visible features.
- Materials: ice (transmissive, slightly subsurface, roughness under 0.15), frosted blue (denser, roughness about 0.25), cloud volume (§8 of `cloud-system.md`). No chrome, no plastic, no neon.
- Film transparent; outputs as PNG (quantized for the phone) and WebP for the web; 1x and 2x; byte budgets stated in each README.
- Grain: the 3 percent `grain.png` is applied on the surface, not baked into the render.

## 3. Animation

Anything that moves after a hover, a click or an action is rendered as a frame sequence and packed into a sheet with a JSON of frame rects, so the web and the phone play the same frames: the button's press (24 frames, 400 ms), the mark's idle turn (60 frames, 2 s), the Won moment (planned). Live WebGL raymarching on the web is allowed where it measures under 4 ms a frame; the sheet is its fallback and the phone's primary.

## 4. The test for done

Read the render. Squint: a cloud reads as a photograph, the mark reads as glass with the blue refracting through the ice, the icon reads at 16 px. If a render fails that at low resolution, it does not go to final. Three low-resolution iterations minimum before a final.

## 5. What Blender does not do

Type (the house faces are rendered by the browser and the platform), the Buyers Guide and every legal document (they are HTML and PDF, measured to the statute), the car photographs (they are the dealer's), and anything a screen must lay out at runtime.
