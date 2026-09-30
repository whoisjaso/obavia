#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="$root/deploy/site/dist"
rm -rf "$out"
mkdir -p "$out"
cp -R "$root/obavia-co/." "$out/"
rm -rf "$out/vercel.json" "$out/frames"
