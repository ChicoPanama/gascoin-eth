#!/usr/bin/env bash
set -euo pipefail

if ! command -v bd >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Beads (`bd`) is not installed.
Install it using the official Beads installation method, then rerun:
  ./scripts/bootstrap-ux-beads.sh
EOF
  exit 2
fi

if [ ! -d .beads ]; then
  echo "Initializing Beads in repository..."
  bd init
fi

# Install/refresh the Codex-oriented agent guidance/hooks supported by Beads.
# This may create/update AGENTS.md as managed by `bd setup`.
echo "Configuring Beads for Codex..."
bd setup codex

echo "Seeding canonical GAS UX Phase 0-11 task graph..."
python3 scripts/seed-ux-beads.py

echo
echo "Ready GAS UX work:"
bd ready --json
