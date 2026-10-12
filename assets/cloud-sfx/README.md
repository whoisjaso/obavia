# Cloud sound kit

The texture under ordinary touches on every Obavia surface. Clouds are air, so every sound here is filtered noise with a slow envelope: no tones, no clicks. All five go through one shared soft room (a 180 ms decaying-noise convolution) so they sound like one place, and every file peaks at -18 dBFS. Spec: `docs/design/cloud-system.md`, section 3.

The house tones in the Desk and the chime in the app keep the moments that are theirs (the high-bidder moment, the sale completing). This kit does not replace them.

| File | Role | Length | Shape |
| --- | --- | --- | --- |
| `cloud-touch.wav` | Press down on a cloud surface | 90 ms | Noise band-passed 900 to 2400 Hz, 4 ms attack, soft decay. The puff. |
| `cloud-rise.wav` | Release, the surface re-inflates | 220 ms | Band-passed noise sweeping 700 to 1800 Hz, slow attack. The breath in. |
| `cloud-settle.wav` | A page or sheet settles into place | 380 ms | Low-passed noise, cutoff 200 to 600 Hz, long decay. The air leaving. |
| `cloud-drift.wav` | A sheet or page moving under the finger | 1200 ms loop | Pink noise through 400 to 1200 Hz, no transient. Loop gain follows finger velocity. |
| `cloud-landed.wav` | An action completed (the one swell) | 520 ms | The puff plus a soft air swell sweeping 650 to 1100 Hz. Pairs with the house chime where one exists. |

All files: 16-bit PCM, mono, 44.1 kHz. Each file is exactly its stated length; the room tail decays inside it. One-shots carry 2 ms fades at both ends. The drift loop does not: its loop point is crossfaded (120 ms, equal power) so the wrap is continuous, and a fade there would put a hole in every cycle. Start it at zero gain and let velocity bring it up.

## Rule

Negative paths stay silent. A failed action, a rejected input, a lost bid: no sound. Silence is the punishment (house asymmetry). Do not add an error sound to this kit.

## Regenerate

```
node tools/cloud-sfx/make.mjs      # writes the five WAVs and waveforms.svg, prints duration and peak
node tools/cloud-sfx/contact.cjs   # rasterizes waveforms.svg to waveforms.png (Playwright Chromium from auction/)
```

`make.mjs` has no dependencies and uses a seeded PRNG: the WAVs are byte-identical on every run. Change a sound only in the generator, never by editing a WAV. Surfaces copy these files; this folder is the source.
