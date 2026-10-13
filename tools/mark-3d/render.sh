#!/usr/bin/env bash
# Render the Obavia mark in 3D (Blender 4.2 as a Python module, Cycles CPU) and build assets/mark-3d.
# Usage: BPY=/path/to/venv/bin/python tools/mark-3d/render.sh [stage ...]
# Stages: hero ink small turn post (default: all). Marks: MARKS="a b" (default both).
# Resumable: a raw render (or turn frame) already on disk is skipped.
# Raw 16-bit renders land in tools/mark-3d/raw (ignored by git); timings append to raw/times.tsv.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PY="${BPY:-python}"
RAW="${RAW:-$HERE/raw}"
MARKS="${MARKS:-a b}"
STAGES="${*:-hero ink small turn post}"
HERO_RES="${HERO_RES:-2048}"; HERO_SPP="${HERO_SPP:-128}"
TURN_RES="${TURN_RES:-512}"; TURN_SPP="${TURN_SPP:-32}"
mkdir -p "$RAW"

run() { # name, args...
  local name="$1"; shift
  local t0=$(date +%s)
  "$PY" "$HERE/mark3d.py" "$@" 2>&1 | grep -E "RENDER|FRAME|TURN|FIELD|SETUP|Error|Traceback" || true
  echo -e "$name\t$(( $(date +%s) - t0 ))s" >> "$RAW/times.tsv"
}

for m in $MARKS; do
  mkdir -p "$RAW/$m"
  for st in $STAGES; do
    case "$st" in
      hero)  [[ -f "$RAW/$m/hero.png" ]] || run "$m hero ${HERO_RES} ${HERO_SPP}spp" --mark "$m" --look day --res "$HERO_RES" --samples "$HERO_SPP" --out "$RAW/$m/hero.png" ;;
      ink)   [[ -f "$RAW/$m/ink.png" ]] || run "$m ink ${HERO_RES} ${HERO_SPP}spp"  --mark "$m" --look ink --res "$HERO_RES" --samples "$HERO_SPP" --out "$RAW/$m/ink.png" ;;
      small) [[ -f "$RAW/$m/small.png" ]] || run "$m small 256 256spp" --mark "$m" --look flat --fit 0.97 --res 256 --samples 256 --out "$RAW/$m/small.png" ;;
      turn)  run "$m turn 60x${TURN_RES} ${TURN_SPP}spp" --mark "$m" --look day --turn --frames 0-59 --res "$TURN_RES" --samples "$TURN_SPP" --out "$RAW/$m/turn" ;;
      post)  : ;;
    esac
  done
done
if [[ " $STAGES " == *" post "* ]]; then
  "$PY" "$HERE/post.py" --raw "$RAW" --out "$ROOT/assets/mark-3d" --marks $MARKS
fi
