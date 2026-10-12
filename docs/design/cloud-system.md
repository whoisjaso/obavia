# The cloud system

The owner's brief (October 12, 2026): "make it really feel like clouds texturally in a 3D way, where even clicking the buttons has some type of 3D physics applied to it; it feels like clouds, sounds like clouds with the SFX, moves like clouds, looks like clouds. Very elegant, soft. Everywhere: the landing page, the Desk, the application, the phone."

This file is the one system every surface implements. A surface that departs from it says where and why in its own README. The house register (one action per screen, upright spaced capitals, Bodoni for money and names, no pills, no italics, icy blues) still wins over any line here.

## 1. What a cloud is, on a screen

A cloud is **soft, lit from above, translucent at the edge, dense in the middle, and never still**. Four properties, each with a test:

| Property | On the glass | Test |
| --- | --- | --- |
| **Volume** | A surface has a top light (ice, 1 px highlight), a body (cloud white to sky), a bottom shade (blue-grey, soft, 2 to 6 px below), and an ambient occlusion where it meets the page. Never a flat fill, never a hard drop shadow. | Squint: the shape reads as a mass with a near and a far side. |
| **Edge** | Edges are not lines; they are where the density falls to zero. Large radii, feathered shadows, and on hero elements a 1 to 2 px inner glow instead of a border. | No visible 1 px grey border on a primary surface. |
| **Texture** | A fine, low-contrast grain or noise field (2 to 4 percent) over large cloud surfaces so they are not vector-flat. Backgrounds carry layered volumetric clouds (two to four layers at different depths), not a single image. | Zoom to 200 percent: the surface has grain, not banding. |
| **Drift** | Large cloud elements move slowly and never stop entirely (unless reduced motion): 40 to 120 s per cycle, 4 to 16 px of travel, parallax by depth on scroll. Nothing bounces. | Watch for 10 s: something moved, nothing jumped. |

## 2. Physics: what a press feels like

A button is a cloud you push your thumb into.

| Phase | Motion | Numbers |
| --- | --- | --- |
| **Press (touch down)** | The surface **sinks** toward the page and its shadow shortens; its body compresses very slightly. Immediate, on the UI thread, before any logic. | translateY +2 to +3 px, scale 0.985, shadow blur −40 percent, 90 to 120 ms, ease-out. |
| **Hold** | It stays compressed while held. The shade under it deepens by a hair. | No further motion. |
| **Release (touch up)** | It **rises back** with a soft overshoot, like a cloud re-inflating, carrying the finger's speed. | Spring: damping ratio 0.6 to 0.7, response 260 to 340 ms; overshoot ≤ 3 percent; never a bounce that visibly rings twice. |
| **Cancel (drag off)** | It rises without the overshoot. | Same spring at damping 1.0. |
| **Landed (an action completed)** | The surface breathes once: a single soft swell and settle in the same frame as the sound and the haptic. | scale 1 → 1.03 → 1 over 420 ms, ease in-out; this is the only moment a cloud grows. |

Rules: transform and opacity only (plus shadow via a pseudo-element's opacity, never animating box-shadow blur per frame on the web); press feedback never waits for a network reply; a disabled surface does not sink.

On the web (obavia-co, desk, app): GSAP drives press and release through `gsap.to` with the house eases; `gsap.matchMedia()` reduces to an opacity change under reduced motion. In the phone app: Reanimated springs with the same ratios (see `auction/src/motion.ts`), the sink on the UI thread at touch-down.

## 3. Sound: what a cloud sounds like

Clouds are air. Every cloud sound is **filtered noise with a slow envelope**, never a tone, never a click. One room: all sounds share a short, soft reverb tail (about 180 ms) so they sound like one place. Quiet: peak −18 dBFS; the house tones in the Desk and the chime in the app stay for the moments that are theirs (the high-bidder moment, the sale completing); cloud sounds are the texture under ordinary touches.

| Name | Use | Shape |
| --- | --- | --- |
| `cloud-touch` | Press down on a cloud surface | 90 ms, band-passed noise 900 to 2400 Hz, fast attack, soft decay. The "puff". |
| `cloud-rise` | Release, the surface re-inflates | 220 ms, noise sweeping upward 700 → 1800 Hz, slow attack, the "breath in". |
| `cloud-settle` | A page or sheet settles into place | 380 ms, low-passed noise 200 → 600 Hz, long decay, the "air leaving". |
| `cloud-drift` | A sheet or page moving under the finger (looped, gain follows velocity) | 1.2 s loop, pink noise through a 400 to 1200 Hz band, no transient. |
| `cloud-landed` | An action completed (the one swell) | 520 ms, the puff plus a soft air swell, slight upward sweep, used with the house chime where one exists. |

The kit is synthesized deterministically by `tools/cloud-sfx/make.mjs` (16-bit WAV, 44.1 kHz) so every surface ships the same five files, under `assets/cloud-sfx/` at the repo root and copied into each surface. Negative paths stay silent (house asymmetry: silence is the punishment).

## 4. Motion: how clouds move

- **Eases**: arrivals on `expo.out` or the house `--out` (0.2, 0.7, 0.2, 1); departures faster than arrivals and on the iOS sheet curve; drift on `sine.inOut`. No linear motion except a progress ring between ticks.
- **Layers**: backgrounds are three cloud layers (far, mid, near) with parallax 0.2 / 0.5 / 1.0 of scroll or of a device tilt where available; they drift on their own timelines, slower when far.
- **Sheets** rise like a cloud forming from the bottom: translateY from 100 percent on a spring at damping 0.75, with the scrim fading in, and the sheet's top edge feathered (a soft highlight) so it does not read as a card.
- **Pages** arrive by settling (translateY −8 px → 0, opacity 0 → 1, 420 ms, staggered 40 ms), which the Desk already does through `motion.ts`.
- **Reduced motion**: every state change still happens; drift stops; press becomes an opacity change; sheets fade.

## 5. Look: the cloud material, in tokens

| Token | Light surfaces | Note |
| --- | --- | --- |
| `cloud-top` | `#FFFFFF` at 85 percent | the 1 px top highlight |
| `cloud-body` | `#F4F7FE` → `#E9EFFE` (top to bottom) | the mass |
| `cloud-shade` | `rgba(28, 36, 54, 0.10)` blurred 10 to 18 px, offset 4 to 8 px | the soft underside |
| `cloud-ao` | `rgba(28, 36, 54, 0.06)` blurred 2 px, offset 1 px | contact with the page |
| `cloud-grain` | 3 percent noise, `mix-blend-mode: soft-light` | texture |
| `sky-far` / `sky-near` | `#DCE6FA` / `#F2F6FF` | the atmosphere behind |

Dark lane (the phone's Lane, ink `#1C2436`): the same material in negative; clouds are ice `rgba(233, 239, 254, 0.08 to 0.16)` masses with a cool rim; the shade becomes a deeper ink.

## 6. Where it applies, by surface

| Surface | Owner agent | Backgrounds | Buttons and sheets | Sound |
| --- | --- | --- | --- | --- |
| `obavia-co/` | creative-edge, frontend | Volumetric layered clouds (replace the single `obavia-clouds.webp` with three layers plus grain; GSAP drift and parallax) | The cloud primary button sinks and rises; cards get volume | Web Audio, the kit |
| `desk/` | frontend | `public/sky` layers plus grain through `src/motion.ts` | `.btn`, `.choice`, `.dock .in`, sheets | the kit beside the existing tones |
| `app/` | frontend | Same as the Desk | Same | the kit |
| `auction/` | frontend, creative-edge | The sky sheets (Won, Car, Me) get the material; the Lane stays photographic with a cloud scrim | `Button`, `Choice`, the Sheet rising like a cloud | expo-audio, the kit beside the house sfx |

## 7. What it is not

Not glassmorphism, not neon glow, not a bounce, not a parallax that fights scroll, not sound on every scroll frame, not a blur that drops frames on a mid-range Android. If a cloud effect costs a dropped frame on the Lane, the cloud loses.
