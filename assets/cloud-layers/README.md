# Cloud layers

The shared volumetric sky for every Obavia surface (obavia.co, the Desk, the app, the phone's Lane scrim). Spec: `docs/design/cloud-system.md`, sections 1, 4 and 5.

## Files

| File | Size (px) | Use |
| --- | --- | --- |
| `light/far@2x.png`, `light/far@1x.png` | 2400×1400, 1200×700 | far layer: small, scattered cumulus in the upper middle band |
| `light/mid@2x.png`, `light/mid@1x.png` | 2400×1400, 1200×700 | mid layer: medium cumulus, lower middle |
| `light/near@2x.png`, `light/near@1x.png` | 2400×1400, 1200×700 | near layer: the cumulus bank low in the frame |
| `dark/{far,mid,near}@2x.png`, `@1x.png` | 1920×1080, 960×540 | the dark lane set: ice masses at 0.08 to 0.16 alpha with a cool rim, for the phone's ink (`#1C2436`) Lane scrim |
| `grain.png` | 512×512, tileable | neutral mid-grey grain, one channel |

All layers are transparent PNGs. Light layers: lit tops in white, body `#F4F7FE` to `#E9EFFE`, undersides in the `cloud-shade` ink (`#1C2436` at 20 percent over the body), light from above left. Every PNG is under 400 KB; files over the limit are reduced to a dithered 256-colour palette (pngquant when installed, otherwise `quantize.py`).

## How to place them

- **Anchor every layer larger than the viewport.** Each layer's alpha feathers to zero over 10 percent on all four edges, so its bounds never show; overscan it (obavia.co uses 14 percent past each side) and let the feather fall outside or into the sky.
- Stack far, mid, near over the sky gradient (`sky-far #DCE6FA` to `sky-near #F2F6FF`). Suggested opacity: far 0.72, mid 0.84, near 0.94.
- **Parallax by depth: 0.2 (far), 0.5 (mid), 1.0 (near)** of the scroll travel, or of a device tilt where available. Transform only.
- **Drift**: each layer on its own sine.inOut cycle, slower when far (obavia.co: 120 / 80 / 48 s, travel 6 / 10 / 16 px). Reduced motion: drift stops, parallax off.
- **Grain: `grain.png` is meant for 3 percent opacity under `mix-blend-mode: soft-light`** (`opacity: .03`). Do not use it stronger; it is a texture you should only find at 200 percent zoom.
- On the web, ship WebP derivatives for weight (obavia.co: `obavia-co/sky/clouds/`, made with `ffmpeg -c:v libwebp -pix_fmt yuva420p -quality 80`).

## Seed and regeneration

Seed **1012**. Shapes come from a seeded PRNG (mulberry32), texture from `feTurbulence` (`fractalNoise`, 4 or 5 octaves, seeded per layer, tiled to the layer width), shaped by `feComponentTransfer`, lit by `feDiffuseLighting` and a weak, broad `feSpecularLighting` (azimuth 225) so the mass reads matte, like water vapour, and feathered with `feGaussianBlur`.

From the repo root:

```sh
NODE_PATH=auction/node_modules node tools/cloud-layers/render.mjs            # everything
NODE_PATH=auction/node_modules node tools/cloud-layers/render.mjs --seed 7   # another sky
NODE_PATH=auction/node_modules node tools/cloud-layers/render.mjs --only light/near
```

It uses Playwright with Chromium at `/opt/pw-browsers/chromium` (override with `CHROMIUM=`). Preview a layer by opening `tools/cloud-layers/render.html#light/near` in a browser.
