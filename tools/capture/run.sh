#!/usr/bin/env bash
# Records the cloud buttons' hover, press, release, after-release and landed motion on the live surfaces,
# and the sky drift on the dealer page. Outputs land in shots-review/motion/<surface>/.
#   tools/capture/run.sh                 every surface
#   tools/capture/run.sh index desk      a subset: index, waitlist, desk, sky
# obavia-co is served with python3 -m http.server from the scratchpad; the Desk runs on the Vite dev
# server so the capture can import landed() from src/motion.ts (a build hides it inside the bundle).
set -euo pipefail
REPO=/home/user/obavia
HERE="$REPO/tools/capture"
OUT="$REPO/shots-review/motion"
SCRATCH="${CAPTURE_SCRATCH:-/tmp/claude-0/-home-user-obavia/e8ab9614-fbc7-5317-bc83-13cdf5972c0b/scratchpad}"
SITE_PORT="${SITE_PORT:-8811}"; DESK_PORT="${DESK_PORT:-5191}"
export NODE_PATH="$REPO/auction/node_modules${NODE_PATH:+:$NODE_PATH}"
mkdir -p "$OUT" "$SCRATCH"
WANT="${*:-index waitlist desk sky}"
want() { [[ " $WANT " == *" $1 "* ]]; }
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT
wait_for() { for _ in $(seq 1 120); do curl -sf -o /dev/null "$1" && return 0; sleep 0.5; done; echo "no answer from $1" >&2; return 1; }

if want index || want waitlist || want sky; then
  (cd "$SCRATCH" && exec python3 -m http.server "$SITE_PORT" --bind 127.0.0.1 --directory "$REPO/obavia-co" >"$SCRATCH/capture-site.log" 2>&1) &
  PIDS+=($!); wait_for "http://127.0.0.1:$SITE_PORT/index.html"
fi
SITE="http://127.0.0.1:$SITE_PORT"

if want index; then
  node "$HERE/capture.mjs" "$SITE/index.html" '.hero .btn.cloud' "$OUT/index"
fi
if want waitlist; then
  node "$HERE/capture.mjs" "$SITE/waitlist.html" '#wlBtn' "$OUT/waitlist"
fi
if want sky; then
  node "$HERE/capture-sky.mjs" "$SITE/index.html" "$OUT/sky"
fi
if want desk; then
  # no auction Worker here: the Desk is pointed at a stub host that answers 404, and the seed keeps the Lane from calling it
  (cd "$REPO/desk" && VITE_AUCTION_API="http://127.0.0.1:8787" exec npx vite --host 127.0.0.1 --port "$DESK_PORT" --strictPort >"$SCRATCH/capture-desk.log" 2>&1) &
  PIDS+=($!); wait_for "http://127.0.0.1:$DESK_PORT/"
  node "$HERE/capture.mjs" "http://127.0.0.1:$DESK_PORT/#/auction" '.dock .btn.primary' "$OUT/desk-lane" \
    --init "$HERE/desk-seed.js" --stub 'http://127.0.0.1:8787/**' --landed-module /src/motion.ts --settle 4000
fi
echo "done: $OUT"
