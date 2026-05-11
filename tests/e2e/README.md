# Claude Code E2E Tests

This directory contains end-to-end (E2E) tests for the Claude Code Linux Fork project.

## Directory Structure

```
tests/
├── e2e/
│   ├── native/          # Native Anthropic API tests
│   │   └── run.ts       # Native integration test runner
│   ├── litellm/         # LiteLLM proxy integration tests
│   │   └── run.ts       # LiteLLM test runner
│   ├── fixtures/        # Test fixtures and mock data
│   │   ├── .sessions/   # Test session storage
│   │   └── projects/    # Sample projects for testing
│   ├── utils/           # Test utilities and helpers
│   │   └── test-helpers.ts
│   ├── setup.sh         # Test environment setup script
│   └── run-all.ts       # Combined test runner
├── unit/                # Unit tests (future)
└── integration/         # Integration tests (future)
```

## Quick Start

### 1. Setup Test Environment

```bash
# Make setup script executable
chmod +x tests/e2e/setup.sh

# Run setup (installs deps, creates fixtures, builds project)
./tests/e2e/setup.sh
```

### 2. Run Tests

#### All Tests
```bash
bun run tests/e2e/run-all.ts
```

#### Native API Tests Only
```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run native tests
bun run tests/e2e/native/run.ts
```

#### LiteLLM Tests Only
```bash
# Start LiteLLM proxy (choose a backend)
./litellm/start.sh --backend anthropic

# Run LiteLLM tests
bun run tests/e2e/litellm/run.ts
```

### 3. Test Options

```bash
# Verbose output
bun run tests/e2e/run-all.ts --verbose

# With coverage
bun run tests/e2e/run-all.ts --coverage

# Specific test suite
bun run tests/e2e/run-all.ts --native    # Native only
bun run tests/e2e/run-all.ts --litellm   # LiteLLM only

# Help
bun run tests/e2e/run-all.ts --help
```

## Test Environments

### Native Integration

Tests direct communication with Anthropic API:
- API authentication and connectivity
- Tool execution (file read, glob, grep)
- Session management
- Configuration loading
- Error handling

**Requirements:**
- `ANTHROPIC_API_KEY` environment variable
- Valid Anthropic API key with sufficient credits

### LiteLLM Integration

Tests communication through LiteLLM proxy:
- Proxy health and authentication
- Model routing and availability
- Chat completions
- Request logging
- Cost tracking
- Concurrent request handling
- Dashboard access

**Requirements:**
- LiteLLM proxy running (see below)
- Optional: Backend API keys (OpenAI, etc.)

## Starting LiteLLM Proxy

```bash
# Anthropic (default)
./litellm/start.sh --backend anthropic

# OpenAI
./litellm/start.sh --backend openai

# GitHub Copilot
./litellm/start.sh --backend copilot

# Ollama (local)
./litellm/start.sh --backend ollama

# Groq
./litellm/start.sh --backend groq

# Custom port
./litellm/start.sh --backend openai --port 8080
```

Available backends: `anthropic`, `openai`, `copilot`, `ollama`, `mistral`, `azure`, `groq`, `bedrock`, `mercury`

## Adding New Tests

### Native Test Example

```typescript
// tests/e2e/native/run.ts
async function testNewFeature(): Promise<void> {
  // Your test implementation
  const result = await someFunction();
  if (result !== expected) {
    throw new Error('Test failed');
  }
}
```

### LiteLLM Test Example

```typescript
// tests/e2e/litellm/run.ts
async function testLiteLLMFeature(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
}
```

## Debugging Tests

### Verbose Mode

```bash
bun run tests/e2e/run-all.ts --verbose
```

### Check API Keys

```bash
# Verify your API key is set
echo $ANTHROPIC_API_KEY

# Test with curl directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-haiku-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

### Check LiteLLM Proxy

```bash
# Check if proxy is running
curl http://localhost:4000/health

# Check logs
tail -f litellm/logs/requests.log
```

### Session Logs

Test sessions are stored in: `tests/e2e/fixtures/.sessions/`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Bun
        uses: oven-sh/setup-bun@v1

      - name: Setup
        run: ./tests/e2e/setup.sh

      - name: Run Native Tests
        run: bun run tests/e2e/native/run.ts
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Run LiteLLM Tests
        run: |
          ./litellm/start.sh --backend openai &
          sleep 5
          bun run tests/e2e/litellm/run.ts
```

## Troubleshooting

### Common Issues

1. **"ANTHROPIC_API_KEY not set"**
   - Set the environment variable: `export ANTHROPIC_API_KEY=sk-ant-...`

2. **"LiteLLM proxy not healthy"**
   - Start the proxy: `./litellm/start.sh --backend anthropic`
   - Check if port 4000 is in use: `lsof -i :4000`

3. **"Build output not found"**
   - Run setup: `./tests/e2e/setup.sh`
   - Or build manually: `bun run build`

4. **"ripgrep not found"**
   - Install: `sudo apt install ripgrep` (Linux)
   - Or: `brew install ripgrep` (macOS)

### Getting Help

- Check the main [README.md](../../README.md) for project overview
- Review [LiteLLM docs](https://docs.litellm.ai/) for proxy configuration
- Open an issue on GitHub for bugs or questions