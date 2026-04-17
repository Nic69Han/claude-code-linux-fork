#!/usr/bin/env bash
# GitHub Copilot CLI — Launcher
# Requires: gh CLI + gh extension install github/gh-copilot
#
# Usage:
#   ./copilot-cli.sh                        # interactive mode
#   ./copilot-cli.sh suggest "..."          # suggest a shell command
#   ./copilot-cli.sh explain "..."          # explain a command
#   ./copilot-cli.sh --install              # install gh copilot extension
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source <(grep -E '^[A-Z_]+=.' "$SCRIPT_DIR/.env" | grep -v '^#') 2>/dev/null || true
  set +a
fi

# ── Check gh CLI ──────────────────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo "❌  GitHub CLI (gh) is not installed."
  echo "    Install: https://cli.github.com  or  sudo apt install gh"
  exit 1
fi

# ── Install extension ─────────────────────────────────────────────────────────
if [[ "${1:-}" == "--install" ]]; then
  echo "📦  Installing GitHub Copilot CLI extension..."
  gh extension install github/gh-copilot
  echo "✅  Done. Run: ./copilot-cli.sh"
  exit 0
fi

# ── Check extension ───────────────────────────────────────────────────────────
if ! gh extension list 2>/dev/null | grep -q "gh-copilot"; then
  echo "⚠️  GitHub Copilot extension not found."
  echo "    Install it with: ./copilot-cli.sh --install"
  echo "    or: gh extension install github/gh-copilot"
  exit 1
fi

# ── Check auth ────────────────────────────────────────────────────────────────
if ! gh auth status &>/dev/null; then
  echo "⚠️  Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

# ── Run ───────────────────────────────────────────────────────────────────────
run_copilot() {
  if [ $# -eq 0 ]; then
    # Interactive mode — show menu
    echo ""
    echo "  GitHub Copilot CLI"
    echo "  ──────────────────"
    echo "  1) suggest — get a shell command from natural language"
    echo "  2) explain — explain a shell command"
    echo "  3) quit"
    echo ""
    read -rp "  Choose [1-3]: " choice
    case "$choice" in
      1) read -rp "  What do you want to do? " query; gh copilot suggest "$query" ;;
      2) read -rp "  Command to explain: " cmd;      gh copilot explain "$cmd" ;;
      3) exit 0 ;;
      *) echo "Invalid choice"; exit 1 ;;
    esac
  else
    gh copilot "$@"
  fi
}

# If launched from GUI (no TTY), open a terminal
if [ -t 0 ]; then
  run_copilot "$@"
else
  for TERM_EMU in gnome-terminal xterm konsole xfce4-terminal lxterminal tilix; do
    if command -v "$TERM_EMU" &>/dev/null; then
      case "$TERM_EMU" in
        gnome-terminal)
          exec gnome-terminal -- bash -c "\"$SCRIPT_DIR/copilot-cli.sh\"; exec bash" ;;
        *)
          exec "$TERM_EMU" -e "bash -c \"'$SCRIPT_DIR/copilot-cli.sh'; exec bash\"" ;;
      esac
    fi
  done
  echo "❌  No terminal emulator found."
  exit 1
fi
