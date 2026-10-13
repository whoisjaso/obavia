#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="$root/deploy/site/dist"
rm -rf "$out"
mkdir -p "$out"
node "$root/tools/cloud-3d/sync.mjs"   # the Blender sprites and sky into obavia-co/assets/cloud-3d and desk/public/cloud-3d (both gitignored)
cp -R "$root/obavia-co/." "$out/"
rm -rf "$out/vercel.json" "$out/frames"
