#!/usr/bin/env bash
# The Phase 0 exit test: build the app's web export, walk Lane to Won to Plates to Me at 393 by 852 @2x,
# count the reads, write the evidence. Exits non-zero on any failure.
#   tools/walkthrough/run.sh                     walk and compare with baseline.json
#   tools/walkthrough/run.sh --rebuild           export again even if dist is newer than the source
#   tools/walkthrough/run.sh --write-baseline    accept this run's reads as the baseline (commit the file)
#   tools/walkthrough/run.sh --strict            also fail any screen over the four-word ceiling
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
APP="$REPO/auction"
DIST="$HERE/dist"                      # a symlink to the last export, the cache between runs
STAMP="$(date -u +%Y%m%d-%H%M%S)-$$"
RUN="$HERE/.runs/$STAMP"               # this run's own export: two walks at once never share a dist
export NODE_PATH="${NODE_PATH:-$APP/node_modules}"
export CHROME="${CHROME:-/opt/pw-browsers/chromium}"

REBUILD=0; READS_FLAGS=()
for a in "$@"; do
  case "$a" in
    --rebuild) REBUILD=1 ;;
    --write-baseline|--strict) READS_FLAGS+=("$a") ;;
    *) echo "unknown flag: $a" >&2; exit 2 ;;
  esac
done

# 1. the export, skipped when dist is newer than everything the app is built from
stale=1
if [ "$REBUILD" = 0 ] && [ -f "$DIST/index.html" ]; then
  newer="$(find "$APP/src" "$APP/assets" "$APP/App.tsx" "$APP/index.ts" "$APP/app.json" "$APP/app.config.ts" "$APP/package.json" \
    -newer "$DIST/index.html" -type f 2>/dev/null | head -1)"
  [ -z "$newer" ] && stale=0
fi
mkdir -p "$RUN"
if [ "$stale" = 1 ]; then
  echo "export: building $RUN/dist"
  # no Worker: the EXPO_PUBLIC_ values are unset, and --clear drops Metro's shared cache, which can hold a
  # bundle another shoot inlined with a Worker URL (seen: http://lane.test, an empty lane, "Failed to fetch")
  ( cd "$APP" && env -u EXPO_PUBLIC_AUCTION_URL -u EXPO_PUBLIC_SUPPORT_PHONE npx expo export -p web --clear --output-dir "$RUN/dist" ) > "$RUN/export.log" 2>&1 \
    || { echo "export failed; see $RUN/export.log" >&2; tail -20 "$RUN/export.log" >&2; exit 1; }
  ln -sfn "$RUN/dist" "$DIST"
else
  echo "export: $DIST is newer than the source, copied into $RUN/dist"
  cp -a "$(readlink -f "$DIST")" "$RUN/dist"
fi
# keep the last three runs' exports
ls -1dt "$HERE"/.runs/*/ 2>/dev/null | tail -n +4 | while read -r d; do [ "$d" != "$RUN/" ] && rm -rf "$d"; done

# 2. the walk, on this run's own export
OUT="$REPO/shots-review/walkthrough/${STAMP%-*}"
mkdir -p "$OUT"
PORT="${PORT:-$(( 41000 + RANDOM % 9000 ))}"
echo "walk: $OUT (port $PORT)"
node "$HERE/walk.mjs" "$RUN/dist" "$OUT" "$PORT"
walk=$?

# 3. the reads, the table and report.md (runs even when the walk failed, on the screens it reached)
if [ -f "$OUT/walk.json" ]; then
  node "$HERE/reads.mjs" "$OUT" "$HERE/baseline.json" "${READS_FLAGS[@]+"${READS_FLAGS[@]}"}"
  reads=$?
else
  echo "walk wrote no walk.json" >&2; reads=1
fi

ln -sfn "$OUT" "$REPO/shots-review/walkthrough/latest"
if [ "$walk" != 0 ] || [ "$reads" != 0 ]; then
  echo "PHASE 0 WALK: FAIL (walk exit $walk, reads exit $reads). Evidence: $OUT/report.md"
  exit 1
fi
echo "PHASE 0 WALK: PASS. Evidence: $OUT/report.md"
