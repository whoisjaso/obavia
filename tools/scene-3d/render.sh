#!/bin/sh
# Renders the car objects (DOCTRINE section 5) from scratch, deterministically.
#   tools/scene-3d/render.sh                 everything
#   STAGE=clouds tools/scene-3d/render.sh    the hammer's cloud grids only
#   STAGE=stills tools/scene-3d/render.sh    the nine stills (1024 master)
#   STAGE=moments tools/scene-3d/render.sh   the four 24-frame moments (512 master)
#   STAGE=post tools/scene-3d/render.sh      regrade and republish only (minutes)
# BLENDER_PY: a python with bpy 4.2. PY: python3 with numpy and Pillow.
# IMAGEQUANT_PATH: a pip --target dir holding imagequant, if not installed.
# WORK keeps grids and linear passes; each step skips outputs that exist.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
BLENDER_PY=${BLENDER_PY:-blender-python}
PY=${PY:-python3}
WORK=${WORK:-$HERE/.work}
OUT=${OUT:-$ROOT/assets/scene-3d}
STILL_W=${STILL_W:-1024}
STILL_SPP=${STILL_SPP:-64}
SEQ_W=${SEQ_W:-512}
SEQ_SPP=${SEQ_SPP:-32}
STAGE=${STAGE:-all}
NAMES="car key title plate pass clock coin bleed hammer licence insurance"
mkdir -p "$WORK" "$OUT"
cd "$HERE"
if [ "$STAGE" = all ] || [ "$STAGE" = clouds ]; then
  "$PY" build_clouds.py "$WORK" 0-23
fi
if [ "$STAGE" = all ] || [ "$STAGE" = stills ]; then
  for n in $NAMES; do
    "$BLENDER_PY" render_objects.py "$WORK" "$n" "$STILL_W" "$STILL_SPP" --frames=23 --tag=final 2>&1 | grep -E '^render|Error' | grep -v 'Not freed' || true
  done
fi
if [ "$STAGE" = all ] || [ "$STAGE" = moments ]; then
  mkdir -p "$WORK/seq"
  ln -sfn "$WORK/clouds" "$WORK/seq/clouds"
  for n in clock bleed coin hammer; do
    "$BLENDER_PY" render_objects.py "$WORK/seq" "$n" "$SEQ_W" "$SEQ_SPP" --frames=0-23 --tag=final 2>&1 | grep -E '^render|Error' | grep -v 'Not freed' || true
  done
fi
if [ "$STAGE" = all ] || [ "$STAGE" = post ]; then
  IMAGEQUANT_PATH=${IMAGEQUANT_PATH:-} "$PY" post.py "$WORK" "$OUT"
fi
