#!/usr/bin/env bash
echo "=== OBAVIA SESSION ==="
echo "Read docs/delivery/STATE.md first. One active slice. Never-list applies. See CLAUDE.md."
if [ -f docs/delivery/STATE.md ]; then sed -n '1,25p' docs/delivery/STATE.md; fi
exit 0
