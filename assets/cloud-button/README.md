# Cloud button sprites

Photographic cloud sprites for the primary button, built by `tools/cloud-button/photo.py` from the repo's own cumulus photograph to the material in `docs/design/cloud-system.md` (sections 1, 2, 5 and 8). There is no drawn shape anywhere. The silhouette, the lobes, the bright cores, the grey creases and the cool underside all come from the photograph. The script adds only a faint ink tint to the underside and a separate contact shadow.

## Source

`obavia-co/assets/obavia-clouds.webp` (1536 x 1024 RGB). The sky in this photograph is near white (254, 254, 254), so the key is the colour distance from that sky plus the luminance deficit, blurred at 6 photo px, with a 0.05 threshold. Per column, everything below the first row where the mass holds counts as cloud: the white cores are as white as the sky, so they are found by sitting under a rim. The top edge is closed and opened with a rolling disc, so the photo's slots fill and its crests become arcs, and it carries an 11 px feather plus a translucent haze above the rim.

| Region | Photo box (x0, y0, x1, y1) | Used as |
| --- | --- | --- |
| `right-tower` | 1150, 556, 1536, 860 | the tallest lobes and the blue crease at the core; always the centre, at the back |
| `left-crown` | 0, 420, 420, 740 | the lobe row on top of the left mass, mirrored; the left end |
| `mid-swell` | 920, 696, 1232, 960 | the lower right swell, mirrored; the right end (640 also uses it unmirrored, second from the left) |

The masses are upscaled with LANCZOS and overlap by 45 percent. Each mass in front blends its colour into the one behind on its inner side, while its density still adds, so the joins show no seam and no gap. If the dip between two towers would drop into the label band, a haze tinted from the neighbouring photograph fills it. Then come a very soft end falloff (about one height, at most 10 percent of the width) and a flat base. The base line follows the photograph's shading along the foot, within 2.5 percent of the height. The shading is deepened 1.75x and the photo's blue is desaturated to 62 percent so the mass reads on a pale page; no light is added. Nothing is random.

## Regenerate

```
python3 tools/cloud-button/photo.py              # every set, plus the safe-zone check
python3 tools/cloud-button/photo.py --only 440   # one set: 320 | 440 | 640 | hero
python3 tools/cloud-button/contact.py            # contact.png, the review sheet
```

Needs Pillow and numpy only. Output is byte-identical across runs. Any sprite over 180 KB keeps RGBA truecolour with its low bits dropped, finest first (never a palette: a palette posterises the greys).

## Files

Every set has `rest`, `pressed`, `dark`, `shadow-rest`, `shadow-pressed` and `dark-shadow`, each at `@1x` and `@2x`. Shadow sprites carry a 40 CSS px margin on every side and sit at `-40px, -40px` from the button box.

| Set | Cloud 1x | Cloud 2x | Shadow 1x | Shadow 2x |
| --- | --- | --- | --- | --- |
| `320/` | 320 x 112 | 640 x 224 | 400 x 192 | 800 x 384 |
| `440/` | 440 x 112 | 880 x 224 | 520 x 192 | 1040 x 384 |
| `640/` | 640 x 112 | 1280 x 224 | 720 x 192 | 1440 x 384 |
| `hero/` | 1600 x 400 | 3200 x 800 | 1680 x 480 | 3360 x 960 |

The height is 112 CSS px at the three button widths, so the lobes rise above the label band. The hero is 1600 x 400.

Every file is under 180 KB **except** `hero/rest@2x.png` and `hero/pressed@2x.png`, which are about 270 KB even at 5 bits per channel. A 3200 x 800 photograph does not fit 180 KB as a PNG. For those two the script also writes a lossy WebP twin (`hero/rest@2x.webp`, `hero/pressed@2x.webp`, about 115 to 125 KB). Serve the WebP for 2x, or use `hero/*@1x.png` as the 2x source of an 800 CSS px hero. `contact.png` is a review sheet, not a shipping asset.

- `pressed`: the same mass squashed 3 percent vertically toward its base, the underside tint 1.5x (15 percent) and the dense core 4 percent dimmer.
- `dark`: the ink-lane variant. It uses the same alpha, desaturated, lifted toward `#E9EFFE` at the top and cooled toward `#869FD6` at the base, at 0.9 opacity overall. It has one state; on the dark lane the press is the transform and the shadow change.
- Underside tint: `rgba(28, 36, 54)` at 10 percent, feathered over the bottom 35 percent of the height.
- Shadows: a blurred ellipse under the base, ink at 13 percent peak. `shadow-pressed` is tighter and closer (16 percent peak). `dark-shadow` is a deeper ink at 30 percent.

## Placing a label

Safe zone: **x 12 to 88 percent, y 40 to 85 percent** of the cloud sprite (the lower 60 percent of the height, minus the feathered base). The script checks every sprite in every state against this zone. The minimum alpha there is 0.946 (hero rest at 2x), so every pixel is at least 0.85 dense. Centre the label on x 50 percent and y 62.5 percent. Use upright spaced capitals in ink `#1C2436`, letter-spacing about 0.24em, with no text-shadow. Use ink on `dark` too: the ice cloud is light, so ice text would not read on it. This departs from the "ice on the dark one" line in section 8.

```html
<button class="cloud-btn" style="--w:440px">
  <span class="cloud-btn__shadow"></span><span class="cloud-btn__shadow-p"></span>
  <span class="cloud-btn__rest"></span><span class="cloud-btn__pressed"></span>
  <span class="cloud-btn__label">LET A CAR GO</span>
</button>
```

```css
.cloud-btn{position:relative;width:var(--w);height:112px;border:0;background:none;padding:0}
.cloud-btn > span{position:absolute;pointer-events:none}
.cloud-btn__rest,.cloud-btn__pressed{inset:0;background:center/100% 100% no-repeat}
.cloud-btn__rest{background-image:image-set(url(440/rest@1x.png) 1x,url(440/rest@2x.png) 2x)}
.cloud-btn__pressed{background-image:image-set(url(440/pressed@1x.png) 1x,url(440/pressed@2x.png) 2x);opacity:0}
.cloud-btn__shadow,.cloud-btn__shadow-p{inset:-40px;background:center/100% 100% no-repeat}
.cloud-btn__shadow{background-image:image-set(url(440/shadow-rest@1x.png) 1x,url(440/shadow-rest@2x.png) 2x)}
.cloud-btn__shadow-p{background-image:image-set(url(440/shadow-pressed@1x.png) 1x,url(440/shadow-pressed@2x.png) 2x);opacity:0}
.cloud-btn__label{inset:40% 12% 15%;display:grid;place-items:center;letter-spacing:.24em;color:#1C2436}
```

## Press choreography (spec section 2)

1. **Touch down**: crossfade `rest` to `pressed` and `shadow-rest` to `shadow-pressed` (opacity only) over **100 ms**, ease-out. In the same frame, apply the section 2 sink to the whole button: `translateY(+2.5px) scale(0.985)` over 100 ms, ease-out. It is immediate and runs before any logic.
2. **Hold**: stay on `pressed`. No further motion.
3. **Release**: crossfade back to `rest` and rise on the section 2 spring: damping ratio 0.65, response 300 ms, overshoot under 3 percent, never rings twice.
4. **Cancel (drag off)**: the same spring at damping 1.0, with no overshoot.
5. **Landed**: the section 2 swell, scale 1 to 1.03 to 1 over 420 ms.
6. **Reduced motion**: no transform; the crossfade alone is the press. **Disabled**: no sink, no crossfade.

On the web this runs on GSAP (`gsap.to` on transform and opacity, `gsap.matchMedia()` for reduced motion). In the phone app it runs on Reanimated with the same ratios. Never animate filter or box-shadow per frame.
