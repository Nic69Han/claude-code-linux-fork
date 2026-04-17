#!/usr/bin/env bash
# Claude Code — Linux Fork launcher
# Builds (if needed) and starts the Claude Code CLI in a new terminal window.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$SCRIPT_DIR/dist/claude-code.js"
BUN="${BUN_PATH:-$HOME/.bun/bin/bun}"

# ── Check bun ────────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null && [ ! -x "$BUN" ]; then
  echo "❌  Bun is not installed. Install it with:"
  echo "    curl -fsSL https://bun.sh/install | bash"
  echo "    source ~/.bashrc"
  exit 1
fi

# Use the system bun if available, otherwise fall back to ~/.bun/bin/bun
command -v bun &>/dev/null && BUN=bun

# ── Build if dist is missing ─────────────────────────────────────────────────
if [ ! -f "$DIST" ]; then
  echo "🔨  Building Claude Code..."
  "$BUN" build "$SCRIPT_DIR/src/entrypoints/cli.tsx" \
    --outfile="$DIST" \
    --target=bun \
    --define 'MACRO.VERSION="99.0.0+linux-fork"'
  echo "✅  Build complete."
fi

# ── Launch ───────────────────────────────────────────────────────────────────
# If called from a GUI shortcut, open a terminal emulator; otherwise run inline.
if [ -t 0 ]; then
  exec "$BUN" "$DIST" "$@"
else
  for TERM_EMU in gnome-terminal xterm konsole xfce4-terminal lxterminal tilix; do
    if command -v "$TERM_EMU" &>/dev/null; then
      case "$TERM_EMU" in
        gnome-terminal)
          exec gnome-terminal -- bash -c "\"$BUN\" \"$DIST\" \"$@\"; exec bash" ;;
        *)
          exec "$TERM_EMU" -e "bash -c \"'$BUN' '$DIST' $*; exec bash\"" ;;
      esac
    fi
  done
  echo "❌  No supported terminal emulator found (gnome-terminal, xterm, konsole…)"
  exit 1
fi
