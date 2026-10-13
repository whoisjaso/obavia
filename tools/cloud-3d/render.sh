#!/bin/sh
# Renders every cloud asset from scratch, deterministically (seed 1012).
#   tools/cloud-3d/render.sh                 everything
#   STAGE=post tools/cloud-3d/render.sh      regrade and repack only
#   STAGE=labels tools/cloud-3d/render.sh    the label imprints only (masks, renders, post)
# BLENDER_PY: a python with bpy 4.2 (Blender as a module). PY: python3 with
# numpy and Pillow. WORK keeps the grids and linear passes; delete it to
# force a full rebuild (each step skips outputs that already exist).
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
BLENDER_PY=${BLENDER_PY:-blender-python}
PY=${PY:-python3}
WORK=${WORK:-$HERE/.work}
OUT=${OUT:-$ROOT/assets/cloud-3d}
BUTTON_W=${BUTTON_W:-1280}     # master width: the 640 hero at @2x
BUTTON_SPP=${BUTTON_SPP:-20}
INBETWEEN_W=${INBETWEEN_W:-1280}   # native since October 13, 2026 (was 960, upscaled)
INBETWEEN_SPP=${INBETWEEN_SPP:-20}
SKY_W=${SKY_W:-2048}
SKY_SPP=${SKY_SPP:-16}
SHADOW_SPP=${SHADOW_SPP:-32}    # the ray-traced contact shadows, at the master width
LABEL_SPP=${LABEL_SPP:-20}     # the label imprints: the safe rect only, at the hero @2x master
STAGE=${STAGE:-all}
mkdir -p "$WORK" "$OUT"
cd "$HERE"
if [ "$STAGE" = all ] || [ "$STAGE" = fields ]; then
  "$PY" build_fields.py "$WORK" all
fi
if [ "$STAGE" = all ] || [ "$STAGE" = fields ] || [ "$STAGE" = labels ]; then
  "$PY" render_labels.py "$WORK" masks
fi
if [ "$STAGE" = all ] || [ "$STAGE" = render ]; then
  # rest (23), pressed (5) and the first two sink frames at the hero @2x
  # master; the in-between frames at INBETWEEN_W (see README, render budget)
  "$BLENDER_PY" render_button.py "$WORK" "$BUTTON_W" "$BUTTON_SPP" --frames=23,5,0,1 2>&1 | grep -E '^render|Error' || true
  "$BLENDER_PY" render_button.py "$WORK" "$INBETWEEN_W" "$INBETWEEN_SPP" 2>&1 | grep -E '^render|Error' || true
  "$BLENDER_PY" render_shadow.py "$WORK" "$BUTTON_W" "$SHADOW_SPP" 2>&1 | grep -E '^render|Error' || true
  "$BLENDER_PY" render_fx.py "$WORK" 2>&1 | grep -E '^render|Error' || true
  "$BLENDER_PY" render_sky.py "$WORK" "$SKY_W" "$SKY_SPP" 2>&1 | grep -E '^render|Error' || true
  "$BLENDER_PY" render_etched.py "$WORK" "$BUTTON_W" "$BUTTON_SPP" 2>&1 | grep -E '^render|Error' || true
fi
if [ "$STAGE" = all ] || [ "$STAGE" = render ] || [ "$STAGE" = labels ]; then
  "$BLENDER_PY" render_labels.py "$WORK" render "$BUTTON_W" "$LABEL_SPP" 2>&1 | grep -E '^render|Error' || true
fi
if [ "$STAGE" = all ] || [ "$STAGE" = post ]; then
  IMAGEQUANT_PATH=${IMAGEQUANT_PATH:-} "$PY" post.py "$WORK" "$OUT" all
fi
if [ "$STAGE" = all ] || [ "$STAGE" = post ] || [ "$STAGE" = labels ]; then
  IMAGEQUANT_PATH=${IMAGEQUANT_PATH:-} "$PY" render_labels.py "$WORK" post "$OUT" --width="$BUTTON_W"
fi
if [ "$STAGE" = all ] || [ "$STAGE" = post ] || [ "$STAGE" = sync ]; then
  # the web's share (WebP, JSON) into obavia-co/assets/cloud-3d and desk/public/cloud-3d
  node sync.mjs
fi
