#!/usr/bin/env bash
# Stage the public site for the Worker's static assets: obavia-co/ minus
# host config and working files. Email assets are added by the deploy.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="${1:-$root/deploy/site/dist}"
rm -rf "$out" && mkdir -p "$out"
cp -R "$root/obavia-co/." "$out/"
rm -rf "$out/vercel.json" "$out/_headers" "$out/_redirects" "$out/frames"
find "$out" -name '.*' -prune -exec rm -rf {} +
echo "staged $(find "$out" -type f | wc -l) files in $out"
