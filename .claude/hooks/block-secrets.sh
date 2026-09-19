#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks commands that would print or stage secret files.
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)
if printf '%s' "$CMD" | grep -Eiq '(cat|less|more|head|tail|echo|printenv|env)\b.*(\.env|\.pem|\.key|SERVICE_ROLE|SECRET_KEY|AUTH_TOKEN)|git add (-A|\.|--all)|git add .*\.env'; then
  echo "BLOCKED by obavia hook: secret exposure or mass-stage. Stage files explicitly; never print secrets." >&2
  exit 2
fi
exit 0
