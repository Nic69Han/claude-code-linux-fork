#!/usr/bin/env bash
# Claude Code E2E Test Environment Setup
# Sets up testing infrastructure for native and LiteLLM integrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Claude Code Linux Fork - E2E Test Setup    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check Bun installation
check_bun() {
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}Error: Bun is not installed${NC}"
        echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi
    echo -e "${GREEN}✓ Bun is installed: $(bun --version)${NC}"
}

# Check Node.js version
check_node() {
    local node_version=$(node -v 2>/dev/null | sed 's/v//')
    if [ -z "$node_version" ]; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi

    local major=$(echo $node_version | cut -d. -f1)
    if [ "$major" -lt 18 ]; then
        echo -e "${RED}Error: Node.js 18+ is required (found v${node_version})${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js v${node_version} installed${NC}"
}

# Check ripgrep
check_ripgrep() {
    if ! command -v rg &> /dev/null; then
        echo -e "${YELLOW}Warning: ripgrep not found - some tests may fail${NC}"
        echo "Install: sudo apt install ripgrep (Debian/Ubuntu) or brew install ripgrep (macOS)"
    else
        echo -e "${GREEN}✓ ripgrep is installed${NC}"
    fi
}

# Install dependencies
install_deps() {
    echo ""
    echo -e "${BLUE}Installing dependencies...${NC}"
    bun install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Create test environment file
create_test_env() {
    local test_env_file="tests/e2e/.env.test"

    cat > "$test_env_file" << 'EOF'
# Claude Code E2E Test Environment
# Copy this to .env.local in tests/e2e/ directory

# Test mode flag
CLAUDE_CODE_TEST_MODE=1
CLAUDE_CODE_E2E=1

# Disable interactive prompts
CLAUDE_CODE_NON_INTERACTIVE=1

# API Keys (use test/mock values or real keys for integration tests)
# ANTHROPIC_API_KEY=sk-ant-test...
# ANTHROPIC_BASE_URL=http://localhost:4000  # For LiteLLM testing

# Disable telemetry
CLAUDE_CODE_TELEMETRY=0

# Use test session directory
CLAUDE_CODE_SESSION_DIR=./tests/e2e/fixtures/.sessions

# Disable external MCP servers
CLAUDE_CODE_MCP_ENABLED=0

# Test configuration
CLAUDE_CODE_PERMISSION_MODE=bypassPermissions
CLAUDE_CODE_ALLOW_DANGEROUSLY_SKIP_PERMISSIONS=1

# LiteLLM settings
LITELLM_BASE_URL=http://localhost:4000
LITELLM_MASTER_KEY=sk-litellm-proxy

# Test timeout (ms)
CLAUDE_CODE_TEST_TIMEOUT=30000

# Verbose logging for tests
LOG_LEVEL=debug
EOF

    echo -e "${GREEN}✓ Created test environment file: $test_env_file${NC}"
}

# Build the project
build_project() {
    echo ""
    echo -e "${BLUE}Building project...${NC}"
    bun run build
    echo -e "${GREEN}✓ Project built${NC}"
}

# Create fixture directories
create_fixtures() {
    echo ""
    echo -e "${BLUE}Creating test fixtures...${NC}"

    mkdir -p tests/e2e/fixtures/{.sessions,projects,projects/hello-world,projects/node-api}

    # Create sample project for testing
    cat > tests/e2e/fixtures/projects/hello-world/package.json << 'EOF'
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "E2E test fixture project",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Tests passed\" && exit 0",
    "build": "echo \"Building...\""
  },
  "dependencies": {}
}
EOF

    cat > tests/e2e/fixtures/projects/hello-world/index.js << 'EOF'
// Hello World - E2E Test Fixture
console.log('Hello from E2E test fixture!');
module.exports = { greeting: 'Hello World!' };
EOF

    cat > tests/e2e/fixtures/projects/hello-world/README.md << 'EOF'
# Hello World

E2E test fixture project.
EOF

    # Create Node.js API test project
    cat > tests/e2e/fixtures/projects/node-api/package.json << 'EOF'
{
  "name": "node-api",
  "version": "1.0.0",
  "description": "Node.js API for E2E tests",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

    cat > tests/e2e/fixtures/projects/node-api/server.js << 'EOF'
// Simple Express API for E2E testing
const express = require('express');
const app = express();
const PORT = 3456;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/echo', (req, res) => {
  res.json({
    method: 'GET',
    path: '/api/echo',
    query: req.query,
    timestamp: Date.now()
  });
});

app.post('/api/echo', (req, res) => {
  res.json({
    method: 'POST',
    path: '/api/echo',
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});
EOF

    echo -e "${GREEN}✓ Test fixtures created${NC}"
}

# Print usage instructions
print_usage() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Setup Complete!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "To run tests:"
    echo ""
    echo -e "  ${GREEN}Native API Tests:${NC}"
    echo -e "    ANTHROPIC_API_KEY=sk-your-key bun run tests/e2e/native/run.ts"
    echo ""
    echo -e "  ${GREEN}LiteLLM Tests:${NC}"
    echo -e "    ./litellm/start.sh --backend openai"
    echo -e "    bun run tests/e2e/litellm/run.ts"
    echo ""
    echo -e "  ${GREEN}All Tests:${NC}"
    echo -e "    bun run tests/e2e/run-all.ts"
    echo ""
    echo -e "  ${GREEN}With Coverage:${NC}"
    echo -e "    bun run tests/e2e/run-all.ts --coverage"
    echo ""
}

# Main execution
main() {
    check_bun
    check_node
    check_ripgrep
    install_deps
    create_test_env
    build_project
    create_fixtures
    print_usage
}

main "$@"