# Cloud sound kit, v2

The texture under ordinary touches on every Obavia surface. Clouds are air: every sound here is noise shaped by filters and envelopes, with one exception (the landed bloom, a soft triad under the air). All six go through one shared room so they sound like one place. Spec: `docs/design/cloud-system.md`, sections 2, 3 and 8.

The house tones in the Desk and the chime in the app keep the moments that are theirs (the high-bidder moment, the sale completing). This kit does not replace them.

| File | Role | Length | Shape |
| --- | --- | --- | --- |
| `cloud-hover.wav` | Pointer enters a cloud surface. Once on enter, never on leave | 260 ms | The gentlest of the kit, a breath in: pink noise rising through a 500 to 1400 Hz band, 120 ms raised-cosine attack, soft release. Mastered to -26 dBFS, 8 dB under the others. |
| `cloud-touch.wav` | Press down | 110 ms | The puff. 64 overlapping grains of band-passed noise (5 to 16 ms each, centre pitch spread across a fifth, 1250 to 1870 Hz, onsets clustered at the front, each panned a little) over a broad 650 to 3600 Hz air bed; 4 ms attack, soft exponential decay. Under it, a sine gliding 90 to 70 Hz for 30 ms at -24 dB so the finger feels mass (phone speakers barely reproduce it; the haptic carries it there). |
| `cloud-rise.wav` | Release, the surface re-inflates | 240 ms | Noise swept 600 to 2200 Hz through a two-stage band-pass, with two peaking resonances climbing with it (750 to 1500 Hz, 1700 to 2900 Hz), formant-like. Slow attack to 60 percent, soft release, a faint high breath of air (above 5.2 kHz, -18 dB) in the last 75 ms. |
| `cloud-settle.wav` | A page or sheet lands | 420 ms | Air leaving: noise through a low-pass falling 500 to 220 Hz, 60 ms attack, long decay. Above it, a very soft wide shimmer: two narrow noise bands at 2950 and 3110 Hz, panned hard apart, -22 dB. |
| `cloud-drift.wav` | A sheet or page moving under the finger | 1600 ms loop | Pink noise, stereo, through two slowly moving band-passes (480 to 760 Hz and 1150 to 1700 Hz, left and right out of phase), no transient. Loop gain follows finger velocity. |
| `cloud-landed.wav` | An action completed (the one swell) | 560 ms | The touch puff, an upward air swell (500 to 1600 Hz, peaking at 235 ms), and one soft harmonic bloom: C major triad (1047, 1319, 1568 Hz, the Desk chime's key), 200 ms from 130 ms, at -12 dB under the file peak. Positive without being a chime: the air carries it. |
| `cloud-press-full.wav` | Films and the contact sheet only, never the UI | 400 ms | The shipped touch at 0 ms and the shipped rise at 100 ms, at the gain the UI plays them, timed to the 3D button: sink 0 to 100 ms, release puff 100 to 260 ms, settle to 400 ms. |

All files: 16-bit PCM, stereo, 44.1 kHz, each exactly its stated length with the room tail decaying inside it. Mastering: the room, then 2 ms raised-cosine fades at both ends, then a gain that puts the true peak (4x oversampled) at the target with two LSB to spare, then seeded TPDF dither. The first and last sample of every one-shot is zero.

The drift loop has no edge fades: a fade at both ends of a loop puts a hole in every cycle. Its loop point is a 200 ms equal-power crossfade of the tail into the head instead, and the measurement below shows the wrap is an ordinary sample step. Surfaces start it at zero gain and let velocity bring it up.

## The room

One room for all six: two Schroeder all-pass diffusers (1.7 and 3.1 ms) smear the onset, then an 8-line feedback delay network (7 to 21 ms lines, orthogonal Hadamard feedback, per-line gains set from the RT60, a 3.8 kHz one-pole low-pass in every loop so the highs die first). Pre-delay 8 ms. Stereo in and stereo out. The wet signal is normalized by the impulse response's energy and mixed at one send level (0.3) on every file.

## Measurements

Read back from the shipped WAVs by `tools/cloud-sfx/measure.mjs`. "Peak at" and "Peak to -20 dB" use an 8 ms RMS envelope of the mono sum. The centroid shows the direction of a sweep.

<!-- measurements -->
| File | Ch | Length | Sample peak | True peak | RMS | Peak at | Peak to -20 dB | Centroid, first third to last third | L/R correlation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cloud-hover.wav` | 2 | 260.0 ms | -26.0 dBFS | -26.0 dBFS | -40.9 dBFS | 84 ms | 108 ms | 741 Hz to 931 Hz | 0.59 |
| `cloud-touch.wav` | 2 | 110.0 ms | -18.1 dBFS | -18.0 dBFS | -33.3 dBFS | 11 ms | 61 ms | 1890 Hz to 1538 Hz | 0.72 |
| `cloud-rise.wav` | 2 | 240.0 ms | -18.0 dBFS | -18.0 dBFS | -33.3 dBFS | 131 ms | 83 ms | 1005 Hz to 1957 Hz | 0.69 |
| `cloud-settle.wav` | 2 | 420.0 ms | -18.0 dBFS | -18.0 dBFS | -31.5 dBFS | 99 ms | 165 ms | 282 Hz to 200 Hz | 0.59 |
| `cloud-drift.wav` | 2 | 1600.0 ms | -18.0 dBFS | -18.0 dBFS | -31.4 dBFS | 393 ms | n/a | 864 Hz to 777 Hz | 0.34 |
| `cloud-landed.wav` | 2 | 560.0 ms | -18.0 dBFS | -18.0 dBFS | -36.0 dBFS | 8 ms | 66 ms | 1305 Hz to 1697 Hz | 0.62 |
| `cloud-press-full.wav` | 2 | 400.0 ms | -18.0 dBFS | -18.0 dBFS | -33.9 dBFS | 232 ms | 82 ms | 1857 Hz to 2149 Hz | 0.70 |

Drift loop point: the wrap step (last sample to first) is 102 LSB against a median sample step of 78 LSB and a 99th percentile of 299 LSB; it ranks at percentile 62 of all steps in the file, so the wrap is an ordinary sample step, not a click. RMS of the first 50 ms against the last 50 ms: -0.1 dB.

Landed bloom: the three partials stand 12.5, 11.3, 15.5 dB above the median of the air within 150 Hz of each (1047, 1319 and 1568 Hz, 130 to 330 ms).

Room: measured RT60 193 ms (T20, Schroeder backward integration of the impulse response), pre-delay 8 ms, damping low-pass 3800 Hz inside every loop, the same send on every file.

One-shot end samples (L first/last, R first/last): hover 0/0, 0/0; touch 0/0, 0/0; rise 0/0, 0/0; settle 0/0, 0/0; landed 0/0, 0/0; press-full 0/0, 0/0.
<!-- /measurements -->

## Contact sheet

`contact.png`: for every file, the waveform (left and right, RMS in white, full scale -18 dBFS) and a log-frequency spectrogram (40 Hz to 16 kHz, 54 dB range, analysis window scaled to the file so a 110 ms puff is not smeared). Read it for the puff shape on touch and landed (bright at the left edge, fading right), the upward sweep on rise and hover, the falling low air and the thin shimmer line on settle, and the two pieces of the press with nothing joining them.

The short windows that show the puff cannot resolve the triad in landed (an 86 Hz bin holds as much air as tone). Its presence is measured instead: the bloom line above.

## Deviations from the brief, with the reason

- Drift modulation runs at 0.625 Hz (one cycle per 1.6 s loop), not 0.2 Hz: a 0.2 Hz LFO cannot close inside 1.6 s and would jump at every wrap. Depth is shallow (about two thirds of an octave peak to peak) so the motion still reads slow.
- Landed bloom at -12 dB, not -20 dB: at -20 dB each partial stood only 6 to 9 dB over the air per 5 Hz bin, about 7 dB under the air in its own critical band, masked. At -12 dB it is audible as harmony and still under the air.
- Drift carries no 2 ms edge fades (see above).

## Rule

Negative paths stay silent. A failed action, a rejected input, a lost bid: no sound. Silence is the punishment (house asymmetry). Do not add an error sound to this kit. Hover plays on enter only; leaving makes no sound.

## Regenerate

```
node tools/cloud-sfx/make.mjs
```

That one command writes the six UI files and `cloud-press-full.wav`, copies the six UI files into `obavia-co/audio/cloud/`, `desk/public/sfx/cloud/` and `auction/assets/sfx/cloud/`, rewrites the measurements above (`measure.mjs`) and redraws `contact.png` (`contact.mjs`, a zero-dependency PNG writer). Shared DSP lives in `tools/cloud-sfx/dsp.mjs`. No dependencies; every random value, the dither included, comes from a seeded PRNG, so every output is byte-identical on every run. Change a sound only in the generator, never by editing a WAV. This folder is the source; surfaces copy it.
