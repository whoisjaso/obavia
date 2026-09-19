#!/usr/bin/env bash
# PreToolUse hook for Bash. Reads tool input JSON on stdin; exit 2 blocks the call.
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)
PATTERNS='rm -rf /|rm -rf \*|git push --force|git push -f |git reset --hard|git clean -fd|DROP TABLE|DROP SCHEMA|TRUNCATE |supabase db reset|vercel --prod|vercel deploy --prod|stripe .* --live|npm publish'
if printf '%s' "$CMD" | grep -Eiq "$PATTERNS"; then
  echo "BLOCKED by obavia hook: destructive or production action requires founder approval. Command: $CMD" >&2
  exit 2
fi
exit 0
