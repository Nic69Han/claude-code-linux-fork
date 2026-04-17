#!/usr/bin/env bash
# LiteLLM proxy launcher for Claude Code — Linux Fork
#
# Usage:
#   ./litellm/start.sh [--backend <name>] [--port 4000] [--no-ui]
#
# Backends:
#   anthropic  Anthropic direct API   (ANTHROPIC_API_KEY)
#   openai     OpenAI API             (OPENAI_API_KEY)
#   copilot    GitHub Copilot         (GITHUB_TOKEN)
#   ollama     Ollama local           (no key needed)
#   mistral    Mistral AI             (MISTRAL_API_KEY)
#   azure      Azure OpenAI           (AZURE_API_KEY + AZURE_API_BASE)
#   groq       Groq fast inference    (GROQ_API_KEY)
#   bedrock    AWS Bedrock            (AWS credentials)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$SCRIPT_DIR/config.yaml"
PORT=4000
BACKEND="anthropic"
ENABLE_UI=true

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend) BACKEND="$2"; shift 2 ;;
    --port)    PORT="$2";    shift 2 ;;
    --ui)      ENABLE_UI=true; shift ;;
    --no-ui)   ENABLE_UI=false; shift ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# //; s/^#//'
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Check Python ≥ 3.9 ───────────────────────────────────────────────────────
PYTHON=""
for candidate in python3.12 python3.11 python3.10 python3.9 python3; do
  if command -v "$candidate" &>/dev/null; then
    ver=$("$candidate" -c 'import sys; print(sys.version_info >= (3,9))')
    if [ "$ver" = "True" ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "❌  Python 3.9+ is required but not found."
  echo "    Install it with: sudo apt install python3.11  (or 3.10, 3.12…)"
  exit 1
fi

PYTHON_VERSION=$("$PYTHON" --version)
echo "🐍  Using $PYTHON_VERSION ($PYTHON)"
PIP="$PYTHON -m pip"

# ── Install LiteLLM if needed ─────────────────────────────────────────────────
if ! $PYTHON -c "import litellm" &>/dev/null; then
  echo "📦  Installing LiteLLM (using $PYTHON)..."
  $PIP install 'litellm[proxy]' --quiet --user
  echo "✅  LiteLLM installed."
else
  echo "✅  LiteLLM module found."
fi

# ── Backend validation ────────────────────────────────────────────────────────
warn_missing() { echo "⚠️   $1 is not set — set it in .env or export it before running."; }

case "$BACKEND" in
  anthropic)
    [ -z "${ANTHROPIC_API_KEY:-}" ] && warn_missing "ANTHROPIC_API_KEY" || true
    ;;
  openai)
    [ -z "${OPENAI_API_KEY:-}" ] && warn_missing "OPENAI_API_KEY" || true
    echo "ℹ️   Uncomment the '── OpenAI' section in litellm/config.yaml"
    ;;
  copilot)
    [ -z "${GITHUB_TOKEN:-}" ] && warn_missing "GITHUB_TOKEN (needs copilot scope — https://github.com/settings/tokens)" || true
    echo "ℹ️   Uncomment the '── GitHub Copilot' section in litellm/config.yaml"
    ;;
  ollama)
    if ! command -v ollama &>/dev/null; then
      echo "⚠️   Ollama not found. Install from https://ollama.com"
    else
      echo "ℹ️   Available Ollama models: $(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}' | tr '\n' ' ' || echo 'none')"
    fi
    echo "ℹ️   Uncomment the '── Ollama' section in litellm/config.yaml"
    ;;
  mistral)
    [ -z "${MISTRAL_API_KEY:-}" ] && warn_missing "MISTRAL_API_KEY (https://console.mistral.ai/)" || true
    echo "ℹ️   Uncomment the '── Mistral AI' section in litellm/config.yaml"
    ;;
  azure)
    [ -z "${AZURE_API_KEY:-}" ]  && warn_missing "AZURE_API_KEY" || true
    [ -z "${AZURE_API_BASE:-}" ] && warn_missing "AZURE_API_BASE (e.g. https://my-resource.openai.azure.com/)" || true
    echo "ℹ️   Uncomment the '── Azure OpenAI' section in litellm/config.yaml"
    echo "ℹ️   Replace <deployment-name> with your actual Azure deployment names."
    ;;
  groq)
    [ -z "${GROQ_API_KEY:-}" ] && warn_missing "GROQ_API_KEY (https://console.groq.com/)" || true
    echo "ℹ️   Uncomment the '── Groq' section in litellm/config.yaml"
    ;;
  bedrock)
    [ -z "${AWS_ACCESS_KEY_ID:-}" ]     && warn_missing "AWS_ACCESS_KEY_ID" || true
    [ -z "${AWS_SECRET_ACCESS_KEY:-}" ] && warn_missing "AWS_SECRET_ACCESS_KEY" || true
    [ -z "${AWS_REGION_NAME:-}" ]       && warn_missing "AWS_REGION_NAME (e.g. us-east-1)" || true
    echo "ℹ️   Uncomment the '── AWS Bedrock' section in litellm/config.yaml"
    ;;
  *)
    echo "❌  Unknown backend: '$BACKEND'"
    echo "    Available: anthropic, openai, copilot, ollama, mistral, azure, groq, bedrock"
    exit 1
    ;;
esac

# ── Start proxy ───────────────────────────────────────────────────────────────
echo ""
echo "🚀  LiteLLM proxy starting on http://localhost:${PORT}"
echo "    Backend : $BACKEND"
echo "    Config  : $CONFIG"
if [ "$ENABLE_UI" = true ]; then
  echo "    UI      : http://localhost:${PORT}/ui"
fi
echo ""
echo "    Once running, launch Claude Code with:"
echo "      ./claude-code.sh --litellm --litellm-port ${PORT}"
echo "    or: ANTHROPIC_BASE_URL=http://localhost:${PORT} bun dist/claude-code.js"
echo ""

LITELLM_ARGS=(--config "$CONFIG" --port "$PORT")
[ "$ENABLE_UI" = true ] && LITELLM_ARGS+=(--ui)

exec $PYTHON -m litellm "${LITELLM_ARGS[@]}"
