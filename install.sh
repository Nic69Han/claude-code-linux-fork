#!/usr/bin/env bash
# Claude Code — Linux Fork — One-line installer
#
# Usage (from anywhere):
#   curl -fsSL https://raw.githubusercontent.com/Nic69Han/claude-code-linux-fork/master/install.sh | bash
#
# Or after cloning:
#   ./install.sh [--dir /custom/path] [--no-desktop] [--no-build]
set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/Nic69Han/claude-code-linux-fork.git"
INSTALL_DIR="${CLAUDE_CODE_DIR:-$HOME/.local/share/claude-code}"
CREATE_DESKTOP=true
DO_BUILD=true
DO_CLONE=true

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✅${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠️${NC}  $*"; }
error()   { echo -e "${RED}❌${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}── $* ${NC}"; }

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)        INSTALL_DIR="$2"; shift 2 ;;
    --no-desktop) CREATE_DESKTOP=false; shift ;;
    --no-build)   DO_BUILD=false; shift ;;
    --no-clone)   DO_CLONE=false; shift ;;    # useful if already cloned
    -h|--help)
      echo "Usage: $0 [--dir PATH] [--no-desktop] [--no-build]"
      exit 0 ;;
    *) warn "Unknown option: $1"; shift ;;
  esac
done

echo -e "\n${BOLD}Claude Code — Linux Fork Installer${NC}"
echo "──────────────────────────────────────"
info "Install directory: $INSTALL_DIR"

# ── 1. Dependencies check ─────────────────────────────────────────────────────
step "Checking dependencies"

MISSING_DEPS=()
command -v git &>/dev/null  || MISSING_DEPS+=("git")
command -v curl &>/dev/null || MISSING_DEPS+=("curl")

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  error "Missing required packages: ${MISSING_DEPS[*]}\nInstall with: sudo apt install ${MISSING_DEPS[*]}"
fi
success "git, curl found"

# ripgrep (optional but recommended)
if ! command -v rg &>/dev/null; then
  warn "ripgrep (rg) not found — GrepTool will be limited."
  info  "Install with: sudo apt install ripgrep"
fi

# ── 2. Clone ──────────────────────────────────────────────────────────────────
step "Cloning repository"

if [ "$DO_CLONE" = true ]; then
  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repository already cloned at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only
  else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
  success "Repository ready at $INSTALL_DIR"
else
  # Running from inside an already-cloned repo
  INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  info "Using existing directory: $INSTALL_DIR"
fi

# ── 3. Install Bun ───────────────────────────────────────────────────────────
step "Installing Bun"

if command -v bun &>/dev/null; then
  BUN_VERSION=$(bun --version)
  success "Bun already installed (v$BUN_VERSION)"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  success "Bun found at ~/.bun/bin/bun"
  export PATH="$HOME/.bun/bin:$PATH"
else
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  # Persist in shell rc files
  for RC in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$RC" ] && ! grep -q '.bun/bin' "$RC"; then
      echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$RC"
    fi
  done
  success "Bun installed"
fi

BUN=$(command -v bun || echo "$HOME/.bun/bin/bun")

# ── 4. Install Node dependencies ─────────────────────────────────────────────
step "Installing dependencies"

cd "$INSTALL_DIR"
"$BUN" install --frozen-lockfile 2>&1 | tail -3
success "Dependencies installed"

# ── 5. Copy .env if not present ──────────────────────────────────────────────
step "Setting up environment"

if [ ! -f "$INSTALL_DIR/.env" ] && [ -f "$INSTALL_DIR/.env.example" ]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  warn ".env created from .env.example — edit it to set your API key:"
  info  "  $INSTALL_DIR/.env"
elif [ -f "$INSTALL_DIR/.env" ]; then
  success ".env already exists"
else
  success "No .env needed (use environment variables or edit later)"
fi

# ── 6. Build ─────────────────────────────────────────────────────────────────
if [ "$DO_BUILD" = true ]; then
  step "Building Claude Code"
  "$BUN" build "$INSTALL_DIR/src/entrypoints/cli.tsx" \
    --outfile="$INSTALL_DIR/dist/claude-code.js" \
    --target=bun \
    --define 'MACRO.VERSION="99.0.0+linux-fork"'
  success "Build complete → dist/claude-code.js"
fi

# ── 7. Desktop shortcut ───────────────────────────────────────────────────────
if [ "$CREATE_DESKTOP" = true ]; then
  step "Creating desktop shortcut"

  DESKTOP_DIR="$HOME/.local/share/applications"
  mkdir -p "$DESKTOP_DIR"

  cat > "$DESKTOP_DIR/claude-code.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Claude Code
Comment=Claude Code CLI — Linux Fork
Exec=$INSTALL_DIR/claude-code.sh
Icon=$INSTALL_DIR/dist/claude-code-icon.svg
Terminal=false
Categories=Development;Utility;
StartupNotify=true
EOF

  chmod +x "$DESKTOP_DIR/claude-code.desktop"
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  success "Desktop shortcut created"
fi

# ── 8. Symlink in PATH ────────────────────────────────────────────────────────
step "Adding to PATH"

SYMLINK_DIR="$HOME/.local/bin"
mkdir -p "$SYMLINK_DIR"

if [ -L "$SYMLINK_DIR/claude-code" ] || [ -f "$SYMLINK_DIR/claude-code" ]; then
  rm -f "$SYMLINK_DIR/claude-code"
fi
ln -s "$INSTALL_DIR/claude-code.sh" "$SYMLINK_DIR/claude-code"

# Ensure ~/.local/bin is in PATH
for RC in "$HOME/.bashrc" "$HOME/.zshrc"; do
  if [ -f "$RC" ] && ! grep -q '.local/bin' "$RC"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC"
  fi
done
export PATH="$SYMLINK_DIR:$PATH"
success "Symlink created: claude-code → $INSTALL_DIR/claude-code.sh"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}✅  Installation complete!${NC}"
echo ""
echo "  Launch from terminal:  claude-code"
echo "  Launch from GUI:       Search 'Claude Code' in your app menu"
echo "  Update anytime:        claude-code --update"
echo ""
if [ ! -f "$INSTALL_DIR/.env" ] || ! grep -q 'ANTHROPIC_API_KEY=.' "$INSTALL_DIR/.env" 2>/dev/null; then
  echo -e "${YELLOW}  ⚠️  Don't forget to set your API key in $INSTALL_DIR/.env${NC}"
  echo "     ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
fi
