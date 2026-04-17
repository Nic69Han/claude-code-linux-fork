#!/usr/bin/env bash
# LiteLLM proxy launcher for Claude Code — Linux Fork
# Installs LiteLLM (if needed) and starts the Anthropic-compatible proxy.
#
# Usage:
#   ./litellm/start.sh [--backend anthropic|openai|copilot|ollama] [--port 4000]
#
# After starting, launch Claude Code with:
#   ./claude-code.sh --litellm
#   or
#   ANTHROPIC_BASE_URL=http://localhost:4000 bun dist/claude-code.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SCRIPT_DIR/config.yaml"
PORT=4000
BACKEND="anthropic"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend) BACKEND="$2"; shift 2 ;;
    --port)    PORT="$2";    shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Check Python ──────────────────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 is required. Install it with: sudo apt install python3 python3-pip"
  exit 1
fi

# ── Install LiteLLM if needed ─────────────────────────────────────────────────
if ! command -v litellm &>/dev/null; then
  echo "📦  Installing LiteLLM..."
  pip install 'litellm[proxy]' --quiet
  echo "✅  LiteLLM installed."
fi

# ── Validate backend-specific env vars ───────────────────────────────────────
case "$BACKEND" in
  anthropic)
    [ -z "${ANTHROPIC_API_KEY:-}" ] && echo "⚠️  ANTHROPIC_API_KEY is not set." || true
    ;;
  openai)
    [ -z "${OPENAI_API_KEY:-}" ] && echo "⚠️  OPENAI_API_KEY is not set." || true
    echo "ℹ️  Using OpenAI backend. Uncomment OpenAI blocks in litellm/config.yaml."
    ;;
  copilot)
    [ -z "${GITHUB_TOKEN:-}" ] && echo "⚠️  GITHUB_TOKEN is not set. Get one at: https://github.com/settings/tokens" || true
    echo "ℹ️  Using GitHub Copilot backend. Uncomment Copilot blocks in litellm/config.yaml."
    ;;
  ollama)
    command -v ollama &>/dev/null || echo "⚠️  Ollama not found. Install it from https://ollama.com"
    echo "ℹ️  Using Ollama backend. Uncomment Ollama blocks in litellm/config.yaml."
    ;;
  *)
    echo "❌  Unknown backend: $BACKEND. Choose: anthropic, openai, copilot, ollama"
    exit 1
    ;;
esac

# ── Start proxy ───────────────────────────────────────────────────────────────
echo ""
echo "🚀  Starting LiteLLM proxy on http://localhost:${PORT}"
echo "    Backend : $BACKEND"
echo "    Config  : $CONFIG"
echo ""
echo "    Launch Claude Code with:"
echo "    ANTHROPIC_BASE_URL=http://localhost:${PORT} bun dist/claude-code.js"
echo "    or: ./claude-code.sh --litellm --litellm-port ${PORT}"
echo ""

exec litellm --config "$CONFIG" --port "$PORT"
