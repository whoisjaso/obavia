#!/bin/sh
# Renders every cloud asset from scratch, deterministically (seed 1012).
#   tools/cloud-3d/render.sh                 everything
#   STAGE=post tools/cloud-3d/render.sh      regrade and repack only
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
INBETWEEN_W=${INBETWEEN_W:-960}
INBETWEEN_SPP=${INBETWEEN_SPP:-16}
SKY_W=${SKY_W:-2048}
SKY_SPP=${SKY_SPP:-16}
STAGE=${STAGE:-all}
mkdir -p "$WORK" "$OUT"
cd "$HERE"
if [ "$STAGE" = all ] || [ "$STAGE" = fields ]; then
  "$PY" build_fields.py "$WORK" all
fi
if [ "$STAGE" = all ] || [ "$STAGE" = render ]; then
  # rest (23), pressed (5) and the first two sink frames at the hero @2x
  # master; the in-between frames at 960 wide (see README, render budget)
  "$BLENDER_PY" render_button.py "$WORK" "$BUTTON_W" "$BUTTON_SPP" --frames=23,5,0,1 2>&1 | grep -E '^render|Error'
  "$BLENDER_PY" render_button.py "$WORK" "$INBETWEEN_W" "$INBETWEEN_SPP" 2>&1 | grep -E '^render|Error'
  "$BLENDER_PY" render_fx.py "$WORK" 2>&1 | grep -E '^render|Error'
  "$BLENDER_PY" render_sky.py "$WORK" "$SKY_W" "$SKY_SPP" 2>&1 | grep -E '^render|Error'
  "$BLENDER_PY" render_etched.py "$WORK" "$BUTTON_W" "$BUTTON_SPP" 2>&1 | grep -E '^render|Error'
fi
if [ "$STAGE" = all ] || [ "$STAGE" = post ]; then
  IMAGEQUANT_PATH=${IMAGEQUANT_PATH:-} "$PY" post.py "$WORK" "$OUT" all
fi
