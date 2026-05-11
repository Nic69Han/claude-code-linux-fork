#!/usr/bin/env bash
# Claude Code Linux Fork - Easy Startup Script
# Interactive menu for quick startup with any backend

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║           Claude Code Linux Fork - Easy Startup                       ║"
    echo "║                                                                      ║"
    echo -e "║   ${NC}Terminal AI Assistant for Software Engineering${CYAN}                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prereqs() {
    local missing=0

    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check Bun
    if command -v bun &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Bun: $(bun --version)"
    else
        echo -e "  ${RED}✗${NC} Bun not found - install: curl -fsSL https://bun.sh/install | bash"
        missing=1
    fi

    # Check ripgrep
    if command -v rg &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} ripgrep installed"
    else
        echo -e "  ${YELLOW}⚠${NC} ripgrep not found - install: sudo apt install ripgrep"
    fi

    # Check .env file
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo -e "  ${GREEN}✓${NC} .env file found"
    else
        echo -e "  ${YELLOW}⚠${NC} .env file not found (copy from .env.example)"
    fi

    # Check API keys
    echo ""
    echo -e "${BLUE}Checking API keys...${NC}"

    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        echo -e "  ${GREEN}✓${NC} ANTHROPIC_API_KEY set"
    else
        echo -e "  ${YELLOW}⚠${NC} ANTHROPIC_API_KEY not set"
    fi

    if [ -n "${MINIMAX_API_KEY:-}" ]; then
        echo -e "  ${GREEN}✓${NC} MINIMAX_API_KEY set"
    else
        echo -e "  ${YELLOW}⚠${NC} MINIMAX_API_KEY not set"
    fi

    if [ -n "${OPENAI_API_KEY:-}" ]; then
        echo -e "  ${GREEN}✓${NC} OPENAI_API_KEY set"
    else
        echo -e "  ${YELLOW}⚠${NC} OPENAI_API_KEY not set"
    fi

    echo ""
    return $missing
}

# Check if LiteLLM is running
check_litellm() {
    if curl -s --max-time 2 http://localhost:4000/health >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start LiteLLM proxy
start_litellm() {
    local backend=$1

    echo ""
    echo -e "${BLUE}Starting LiteLLM proxy with ${CYAN}${backend}${BLUE} backend...${NC}"
    echo ""

    # Check if already running
    if check_litellm; then
        echo -e "${YELLOW}LiteLLM proxy is already running on port 4000${NC}"
        read -p "Kill and restart? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "litellm.*--port 4000" 2>/dev/null || true
            sleep 1
        else
            echo -e "${GREEN}Using existing LiteLLM proxy${NC}"
            return 0
        fi
    fi

    # Start in background
    cd "$SCRIPT_DIR"
    ./litellm/start.sh --backend "$backend" --port 4000 &
    LITELLM_PID=$!

    # Wait for startup
    echo -e "${BLUE}Waiting for LiteLLM to start...${NC}"
    for i in {1..30}; do
        if check_litellm; then
            echo -e "${GREEN}✓ LiteLLM proxy started successfully!${NC}"
            return 0
        fi
        sleep 1
        if ! kill -0 $LITELLM_PID 2>/dev/null; then
            echo -e "${RED}✗ LiteLLM failed to start${NC}"
            return 1
        fi
    done

    echo -e "${RED}✗ LiteLLM startup timeout${NC}"
    return 1
}

# Build project
build_project() {
    echo ""
    echo -e "${BLUE}Building project...${NC}"

    cd "$PROJECT_ROOT"
    if [ -f "dist/claude-code.js" ]; then
        echo -e "  Build already exists"
    else
        bun run build
    fi
    echo -e "${GREEN}✓ Build complete${NC}"
}

# Start Claude Code
start_claude_code() {
    local use_litellm=$1
    local port=${2:-4000}

    echo ""
    echo -e "${BLUE}Starting Claude Code...${NC}"

    cd "$PROJECT_ROOT"

    if [ "$use_litellm" = "true" ]; then
        echo -e "${CYAN}Using LiteLLM proxy at http://localhost:$port${NC}"
        ./claude-code.sh --litellm --litellm-port "$port"
    else
        echo -e "${CYAN}Using direct API${NC}"
        ./claude-code.sh
    fi
}

# Quick start (no menu)
quick_start() {
    local backend=${1:-}

    print_banner

    # Check prereqs
    check_prereqs

    # Start LiteLLM
    if [ -n "$backend" ]; then
        start_litellm "$backend" || return 1
    fi

    # Build
    build_project

    # Start Claude Code
    if check_litellm; then
        start_claude_code "true"
    else
        start_claude_code "false"
    fi
}

# Interactive menu
interactive_menu() {
    local choice

    print_banner
    check_prereqs

    echo ""
    echo -e "${BOLD}Select an option:${NC}"
    echo ""
    echo "  ${CYAN}1)${NC}  Start with Anthropic API        (requires ANTHROPIC_API_KEY)"
    echo "  ${CYAN}2)${NC}  Start with MiniMax AI           (requires MINIMAX_API_KEY)"
    echo "  ${CYAN}3)${NC}  Start with OpenAI               (requires OPENAI_API_KEY)"
    echo "  ${CYAN}4)${NC}  Start with Ollama (local)       (no API key needed)"
    echo "  ${CYAN}5)${NC}  Start with Groq                 (requires GROQ_API_KEY)"
    echo "  ${CYAN}6)${NC}  Start with Mistral AI           (requires MISTRAL_API_KEY)"
    echo "  ${CYAN}7)${NC}  Start with GitHub Copilot      (requires GITHUB_TOKEN)"
    echo "  ${CYAN}8)${NC}  Start with Azure OpenAI         (requires AZURE credentials)"
    echo "  ${CYAN}9)${NC}  Start with AWS Bedrock          (requires AWS credentials)"
    echo "  ${CYAN}10)${NC} Start with Mercury AI            (requires INCEPTION_API_KEY)"
    echo ""
    echo "  ${CYAN}A)${NC}  Start Claude Code with existing LiteLLM (port 4000)"
    echo "  ${CYAN}B)${NC}  Build only (no proxy, no launch)"
    echo "  ${CYAN}C)${NC}  Open LiteLLM dashboard (browser)"
    echo "  ${CYAN}D)${NC}  Check .env configuration"
    echo ""
    echo "  ${CYAN}Q)${NC}  Quit"
    echo ""

    read -p "Enter choice [1-10, A-D, Q]: " choice

    case "$choice" in
        1)  start_litellm "anthropic" && build_project && start_claude_code "true" ;;
        2)  start_litellm "minimax" && build_project && start_claude_code "true" ;;
        3)  start_litellm "openai" && build_project && start_claude_code "true" ;;
        4)  start_litellm "ollama" && build_project && start_claude_code "true" ;;
        5)  start_litellm "groq" && build_project && start_claude_code "true" ;;
        6)  start_litellm "mistral" && build_project && start_claude_code "true" ;;
        7)  start_litellm "copilot" && build_project && start_claude_code "true" ;;
        8)  start_litellm "azure" && build_project && start_claude_code "true" ;;
        9)  start_litellm "bedrock" && build_project && start_claude_code "true" ;;
        10) start_litellm "mercury" && build_project && start_claude_code "true" ;;
        A|a)
            build_project
            start_claude_code "true"
            ;;
        B|b)
            build_project
            echo ""
            echo -e "${GREEN}Build complete. Run again and choose a backend to start LiteLLM.${NC}"
            ;;
        C|c)
            if check_litellm; then
                xdg-open http://localhost:4000/ui 2>/dev/null || echo "Open http://localhost:4000/ui in your browser"
            else
                echo -e "${RED}LiteLLM proxy is not running${NC}"
                echo "Start it first with any option 1-10"
            fi
            ;;
        D|d)
            echo ""
            echo -e "${BOLD}Current .env configuration:${NC}"
            echo ""
            if [ -f "$PROJECT_ROOT/.env" ]; then
                grep -E "^[A-Z].*=" "$PROJECT_ROOT/.env" | while IFS='=' read -r key value; do
                    if [[ "$key" =~ KEY|TOKEN|SECRET|PASSWORD ]]; then
                        echo "  $key=***"
                    else
                        echo "  $key=$value"
                    fi
                done
            else
                echo -e "${YELLOW}.env file not found${NC}"
                echo "Copy .env.example to .env and configure your API keys"
            fi
            echo ""
            ;;
        Q|q) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}" ;;
    esac
}

# Main
main() {
    if [ $# -gt 0 ]; then
        # Command line mode
        case "$1" in
            -h|--help)
                echo "Claude Code Linux Fork - Easy Startup"
                echo ""
                echo "Usage:"
                echo "  $0              Interactive menu"
                echo "  $0 <backend>    Quick start with backend"
                echo "  $0 --build      Build only"
                echo ""
                echo "Available backends:"
                echo "  anthropic, minimax, openai, ollama, groq, mistral"
                echo "  copilot, azure, bedrock, mercury"
                ;;
            --build)
                build_project
                ;;
            anthropic|minimax|openai|ollama|groq|mistral|copilot|azure|bedrock|mercury)
                quick_start "$1"
                ;;
            *)
                echo -e "${RED}Unknown backend: $1${NC}"
                echo "Run '$0 --help' for usage"
                exit 1
                ;;
        esac
    else
        # Interactive mode
        interactive_menu
    fi
}

main "$@"