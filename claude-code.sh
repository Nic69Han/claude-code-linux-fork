#!/usr/bin/env bash
# Claude Code — Linux Fork launcher
# Builds (if needed) and starts the Claude Code CLI.
# Optionally routes API calls through a local LiteLLM proxy.
#
# Usage:
#   ./claude-code.sh                        # Direct Anthropic API
#   ./claude-code.sh --litellm              # Via LiteLLM proxy (port 4000)
#   ./claude-code.sh --litellm-port 8080    # Via LiteLLM on custom port
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$SCRIPT_DIR/dist/claude-code.js"
BUN="${BUN_PATH:-$HOME/.bun/bin/bun}"
LITELLM_PORT=4000
USE_LITELLM=false

# ── Parse launcher-specific flags (consume before passing rest to the app) ────
PASSTHROUGH_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --litellm)        USE_LITELLM=true; shift ;;
    --litellm-port)   USE_LITELLM=true; LITELLM_PORT="$2"; shift 2 ;;
    *)                PASSTHROUGH_ARGS+=("$1"); shift ;;
  esac
done

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

# ── LiteLLM proxy ────────────────────────────────────────────────────────────
if [ "$USE_LITELLM" = true ]; then
  # Check if LiteLLM proxy is already running on the target port
  if ! curl -sf "http://localhost:${LITELLM_PORT}/health" &>/dev/null; then
    echo "⚠️  LiteLLM proxy not detected on port ${LITELLM_PORT}."
    echo "    Start it first with: ./litellm/start.sh --port ${LITELLM_PORT}"
    echo "    Or install LiteLLM: pip install 'litellm[proxy]'"
    echo ""
    echo "    Continuing without LiteLLM (falling back to direct Anthropic API)."
  else
    echo "✅  LiteLLM proxy active on port ${LITELLM_PORT}."
    export ANTHROPIC_BASE_URL="http://localhost:${LITELLM_PORT}"
  fi
fi

# ── Launch ───────────────────────────────────────────────────────────────────
# If called from a GUI shortcut, open a terminal emulator; otherwise run inline.
if [ -t 0 ]; then
  exec "$BUN" "$DIST" "${PASSTHROUGH_ARGS[@]+"${PASSTHROUGH_ARGS[@]}"}"
else
  for TERM_EMU in gnome-terminal xterm konsole xfce4-terminal lxterminal tilix; do
    if command -v "$TERM_EMU" &>/dev/null; then
      LITELLM_ENV=""
      [ "$USE_LITELLM" = true ] && LITELLM_ENV="ANTHROPIC_BASE_URL=http://localhost:${LITELLM_PORT}"
      case "$TERM_EMU" in
        gnome-terminal)
          exec gnome-terminal -- bash -c "${LITELLM_ENV:+$LITELLM_ENV }\"$BUN\" \"$DIST\"; exec bash" ;;
        *)
          exec "$TERM_EMU" -e "bash -c \"${LITELLM_ENV:+$LITELLM_ENV }'$BUN' '$DIST'; exec bash\"" ;;
      esac
    fi
  done
  echo "❌  No supported terminal emulator found (gnome-terminal, xterm, konsole…)"
  exit 1
fi
