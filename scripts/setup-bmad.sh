#!/usr/bin/env bash
# One-time, founder-approved: vendor the Claude Code port of BMAD into this repo for DISCOVERY ONLY.
# Run from repo root inside an approved session, inspect the diff, then commit.
# BMAD skills are used for product-brief / UX / architecture interviews in M0. They do NOT own the roadmap.
# docs/delivery/ROADMAP.md remains the only roadmap authority; docs/INDEX.md points at any BMAD output.
set -euo pipefail
SRC=https://github.com/aj-geddes/claude-code-bmad-skills.git
TMP=$(mktemp -d)
git clone --depth 1 "$SRC" "$TMP/bmad"
mkdir -p .claude/skills
# Copy only skill folders; never copy installer scripts, hooks, or settings from the port.
found=0
for d in "$TMP"/bmad/.claude/skills/* "$TMP"/bmad/skills/*; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  case "$name" in bmad*|*bmad*) cp -R "$d" ".claude/skills/$name"; found=$((found+1));; esac
done
rm -rf "$TMP"
echo "Vendored $found BMAD skill folder(s) into .claude/skills/. Review with: git status && git diff --stat"
echo "Rule: use for discovery (product brief, UX, architecture) in M0 only. Do not let BMAD create a second PRD/roadmap."
