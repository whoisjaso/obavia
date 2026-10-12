# Cloud button sprites

Volumetric cloud sprites for the primary button, rendered from `tools/cloud-button/` to the material in `docs/design/cloud-system.md` (sections 1, 2 and 5). No outline anywhere: the density falls to zero through blurred copies, the light comes from above-left, the underside is a soft blue-grey, and 2.4 percent grain is baked in.

## Regenerate

```
NODE_PATH=auction/node_modules node tools/cloud-button/render.mjs --seed 1012 --contact
```

Seed: **1012**. Output is byte-identical across runs for the same seed. `--only 320|440|640|hero` renders one set. Chromium: `/opt/pw-browsers/chromium` (override with `CHROMIUM=`). Any sprite over 180 KB is reduced by `tools/cloud-button/quantize.py` (truecolour RGBA with low bits dropped, never a palette, so the gradients do not band).

How it is built (`render.html`): a rounded rectangle signed distance field, displaced by low-frequency fractal noise (larger on the top, almost none on the base, a very slow lobe so one end stands taller), torn at the rim by finer turbulence, softened through three anisotropic blurred copies at 0.60, 0.34 and 0.12 opacity (the wisps), lit as a height field with a distant light from above-left (diffuse N.L, low Blinn specular), painted white at the top to `#C8D2E7` at the underside, with a brighter core and per-pixel grain.

## Files

Button height is 96 CSS px at every width. Shadow sprites carry a 40 CSS px margin on every side (so they are W + 80 by 176 CSS px) and sit at `-40px, -40px` relative to the button box.

| Set | Sprites | 1x px | 2x px |
| --- | --- | --- | --- |
| `320/` | `rest`, `pressed`, `dark` | 320 x 96 | 640 x 192 |
| `320/` | `shadow-rest`, `shadow-pressed`, `dark-shadow` | 400 x 176 | 800 x 352 |
| `440/` | `rest`, `pressed`, `dark` | 440 x 96 | 880 x 192 |
| `440/` | `shadow-rest`, `shadow-pressed`, `dark-shadow` | 520 x 176 | 1040 x 352 |
| `640/` | `rest`, `pressed`, `dark` | 640 x 96 | 1280 x 192 |
| `640/` | `shadow-rest`, `shadow-pressed`, `dark-shadow` | 720 x 176 | 1440 x 352 |
| `hero/` | `rest.png`, `pressed.png` | 1600 x 400 (one file: 800 x 200 CSS at 2x, or 1600 x 400 at 1x) | |
| `hero/` | `shadow-rest.png`, `shadow-pressed.png` | 1933 x 733 (margin 167 px per side, i.e. 40 design units) | |

Largest file: `440/pressed@2x.png` at 164 KB. All sprites are under 180 KB. `contact.png` (1.2 MB) is a review sheet, not a shipping asset.

`dark` is the ink-lane variant (ice `rgba(233,239,254)` at 0.06 to 0.16 over the lit top, deeper ink under the base, cool rim); it has one state. On the dark lane the press is the transform and the shadow change only.

`pressed` is the same cloud 3 percent shorter, compressed toward its base, with a deeper underside and a dimmer core; `shadow-pressed` is tighter (blur 8.4 versus 14, offset 3.5 versus 6) and slightly darker at its centre.

## Placing a label

Safe text zone, as a percentage of the cloud sprite (every pixel at least 98 percent dense):

| Width | x | y |
| --- | --- | --- |
| 320 | 14.4 to 85.6 | 31.3 to 71.9 |
| 440 | 12.0 to 88.0 | 31.3 to 72.9 |
| 640 | 7.2 to 92.8 | 34.4 to 71.9 |
| hero | 13.8 to 86.2 | 31.3 to 72.9 |

Use one rule for all: centre the label on 50 percent x and **50 percent y**, keep it inside x 15 to 85 percent and y 35 to 70 percent. Upright spaced capitals in ink `#1C2436` on the light sprites (letter-spacing about 0.24em) and `#F2F6FF` on `dark`. No text-shadow is needed: the core is the brightest part of the cloud.

```html
<button class="cloud-btn" style="--w:440px">
  <span class="cloud-btn__shadow"></span>
  <span class="cloud-btn__rest"></span><span class="cloud-btn__pressed"></span>
  <span class="cloud-btn__label">LET A CAR GO</span>
</button>
```

```css
.cloud-btn{position:relative;width:var(--w);height:96px;border:0;background:none;padding:0}
.cloud-btn > span{position:absolute;pointer-events:none}
.cloud-btn__rest,.cloud-btn__pressed{inset:0;background:center/100% 100% no-repeat}
.cloud-btn__rest{background-image:image-set(url(440/rest@1x.png) 1x,url(440/rest@2x.png) 2x)}
.cloud-btn__pressed{background-image:image-set(url(440/pressed@1x.png) 1x,url(440/pressed@2x.png) 2x);opacity:0}
.cloud-btn__shadow{inset:-40px;background:center/100% 100% no-repeat image-set(url(440/shadow-rest@1x.png) 1x,url(440/shadow-rest@2x.png) 2x)}
.cloud-btn__label{inset:35% 15%;display:grid;place-items:center;letter-spacing:.24em;color:#1C2436}
```

For the pressed shadow, stack a second shadow span with `shadow-pressed` at opacity 0 and crossfade it with the cloud.

## Press choreography (spec section 2)

1. **Touch down**: crossfade `rest` to `pressed` and `shadow-rest` to `shadow-pressed` (opacity only) over **100 ms** ease-out, and in the same frame sink the whole button: `translateY(+2.5px) scale(0.985)` over 100 ms, ease-out. Immediate, before any logic.
2. **Hold**: stay on `pressed`. No further motion.
3. **Release**: crossfade back to `rest` over 160 ms, and rise on the spec spring: damping ratio 0.65, response 300 ms (overshoot under 3 percent, never rings twice).
4. **Cancel (drag off)**: the same spring at damping 1.0, no overshoot.
5. **Reduced motion**: no transform; the crossfade alone is the press.
6. **Disabled**: does not sink, no crossfade.

On the web this runs through GSAP (`gsap.to` on transform and opacity, `gsap.matchMedia()` for reduced motion); in the phone app through Reanimated with the same ratios. Never animate filter or box-shadow per frame.
