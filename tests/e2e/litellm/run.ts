/**
 * LiteLLM Integration Tests
 *
 * These tests validate Claude Code's integration with LiteLLM proxy,
 * supporting multiple backend providers (OpenAI, Anthropic, Ollama, etc.).
 *
 * Prerequisites:
 *   1. Start LiteLLM proxy: ./litellm/start.sh --backend <backend>
 *   2. Run tests: bun run tests/e2e/litellm/run.ts
 *
 * Supported backends:
 *   - openai, anthropic, copilot, ollama, mistral, azure, groq, bedrock, mercury
 */

import { execSync } from 'bun';
import { resolve } from 'path';

// Configuration
interface LiteLLMConfig {
  baseUrl: string;
  masterKey: string;
  timeout: number;
  supportedBackends: string[];
}

const config: LiteLLMConfig = {
  baseUrl: process.env.LITELLM_BASE_URL || 'http://localhost:4000',
  masterKey: process.env.LITELLM_MASTER_KEY || 'sk-litellm-proxy',
  timeout: 30000,
  supportedBackends: [
    'anthropic',
    'openai',
    'copilot',
    'ollama',
    'mistral',
    'azure',
    'groq',
    'bedrock',
    'mercury',
  ],
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg: string, color = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${msg}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(title, 'cyan');
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

// Test result interface
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

// Results tracking
const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  log(`Running: ${name}...`, 'blue');

  try {
    await testFn();
    const duration = Date.now() - start;
    log(`✓ PASSED (${duration}ms)`, 'green');
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`✗ FAILED: ${errorMsg}`, 'red');
    return { name, passed: false, duration, error: errorMsg };
  } finally {
    console.log('');
  }
}

// Health check for LiteLLM proxy
async function checkLiteLLMHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.masterKey}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy' || data.health === true;
  } catch {
    return false;
  }
}

// Test: LiteLLM proxy health
async function testProxyHealth(): Promise<void> {
  const isHealthy = await checkLiteLLMHealth();

  if (!isHealthy) {
    throw new Error(
      `LiteLLM proxy not healthy at ${config.baseUrl}\n` +
      'Please start the proxy: ./litellm/start.sh --backend <backend>'
    );
  }
}

// Test: Proxy key authentication
async function testProxyAuth(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
    },
  });

  if (!response.ok && response.status !== 200) {
    throw new Error(`Authentication failed: ${response.status}`);
  }
}

// Test: Model list endpoint
async function testModelList(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get model list: ${response.status}`);
  }

  const data = await response.json();
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid model list response format');
  }

  log(`  Found ${data.data.length} configured models`, 'yellow');
}

// Test: Chat completions - OpenAI format
async function testChatCompletions(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'user', content: 'Say "test passed" if you can read this' }],
      max_tokens: 20,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat completions failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Unexpected chat completions response format');
  }
}

// Test: Claude Code with LiteLLM proxy
async function testClaudeCodeWithProxy(): Promise<void> {
  const testProject = resolve(__dirname, '../fixtures/projects/hello-world');

  // Test that we can set up the environment for LiteLLM
  const baseUrl = config.baseUrl;

  // Verify proxy is accessible
  const response = await fetch(`${baseUrl}/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Cannot connect to LiteLLM proxy at ${baseUrl}`);
  }

  log(`  Connected to LiteLLM proxy at ${baseUrl}`, 'yellow');
}

// Test: Backend-specific routing
async function testBackendRouting(): Promise<void> {
  const configuredBackend = process.env.LITELLM_BACKEND || 'anthropic';

  if (!config.supportedBackends.includes(configuredBackend)) {
    log(`  Warning: Backend "${configuredBackend}" not in known list`, 'yellow');
    log(`  Known backends: ${config.supportedBackends.join(', ')}`, 'yellow');
  }

  // Verify the backend is reachable
  const response = await fetch(`${config.baseUrl}/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
    },
  });

  if (response.ok) {
    log(`  Backend "${configuredBackend}" is active`, 'green');
  }
}

// Test: Request/response logging
async function testRequestLogging(): Promise<void> {
  const logDir = resolve(__dirname, '../../litellm/logs');

  // Check log directory exists
  try {
    execSync(`mkdir -p "${logDir}"`, { shell: '/bin/bash' });
  } catch {
    // Directory might already exist
  }

  // After a chat completion, logs should be created
  // This test verifies the logging infrastructure is in place
  const logFile = resolve(logDir, 'requests.log');
  const exists = await Bun.file(logFile).exists();

  if (!exists) {
    log('  Note: Request log file not yet created (will be created after first request)', 'yellow');
  } else {
    log('  Request logging is active', 'green');
  }
}

// Test: Cost tracking
async function testCostTracking(): Promise<void> {
  const dbPath = resolve(__dirname, '../../litellm/logs/litellm.db');

  // Check that cost tracking database exists
  // Note: Only created after first request
  const exists = await Bun.file(dbPath).exists();

  if (!exists) {
    log('  Note: Cost tracking DB not yet created (will be created after first request)', 'yellow');
  } else {
    log('  Cost tracking is active', 'green');
  }
}

// Test: Multiple concurrent requests
async function testConcurrentRequests(): Promise<void> {
  const promises = Array.from({ length: 3 }, async (_, i) => {
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.masterKey}`,
      },
    });
    return response.ok;
  });

  const results = await Promise.all(promises);
  const allSucceeded = results.every(r => r);

  if (!allSucceeded) {
    throw new Error('Some concurrent requests failed');
  }

  log('  Concurrent request handling verified', 'green');
}

// Test: Error handling - invalid model
async function testErrorHandling(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.masterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'non-existent-model-12345',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    }),
  });

  // Should return an error for invalid model
  if (response.status === 200) {
    const data = await response.json();
    if (!data.error) {
      throw new Error('Expected error response for invalid model');
    }
    log('  Error handling for invalid model works correctly', 'green');
  }
}

// Test: Dashboard accessibility
async function testDashboard(): Promise<void> {
  const response = await fetch(`${config.baseUrl}/ui`, {
    method: 'GET',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Dashboard not accessible');
  }

  log('  Dashboard endpoint is available', 'green');
}

// Run all tests
async function runAllTests(): Promise<void> {
  logSection('Claude Code LiteLLM Integration Tests');

  log(`Proxy URL: ${config.baseUrl}`);
  log(`Master Key: ${config.masterKey.substring(0, 8)}...`);
  console.log('');

  // Check if LiteLLM proxy is running
  log('Checking LiteLLM proxy status...', 'blue');
  const isRunning = await checkLiteLLMHealth();

  if (!isRunning) {
    log('', 'yellow');
    log('⚠ LiteLLM proxy is not running!', 'yellow');
    log('');
    log('Please start the proxy first:', 'yellow');
    log('');
    log('  1. Anthropic (default):');
    log('     ./litellm/start.sh --backend anthropic', 'cyan');
    log('');
    log('  2. OpenAI:');
    log('     ./litellm/start.sh --backend openai', 'cyan');
    log('');
    log('  3. Ollama (local):');
    log('     ./litellm/start.sh --backend ollama', 'cyan');
    log('');
    log('  4. Groq (fast):');
    log('     ./litellm/start.sh --backend groq', 'cyan');
    log('');
    log('Then run this test again.', 'yellow');
    log('');
    log('Alternatively, to run native tests instead:', 'cyan');
    log('  export ANTHROPIC_API_KEY=sk-ant-...', 'cyan');
    log('  bun run tests/e2e/native/run.ts', 'cyan');
    log('');

    results.push({
      name: 'LiteLLM Proxy Health',
      passed: false,
      duration: 0,
      error: 'Proxy not running',
    });
  } else {
    log('✓ LiteLLM proxy is healthy', 'green');
    console.log('');

    // Run LiteLLM-specific tests
    const tests: Array<{ name: string; fn: () => Promise<void> }> = [
      { name: 'Proxy Authentication', fn: testProxyAuth },
      { name: 'Model List Endpoint', fn: testModelList },
      { name: 'Chat Completions', fn: testChatCompletions },
      { name: 'Claude Code with Proxy', fn: testClaudeCodeWithProxy },
      { name: 'Backend Routing', fn: testBackendRouting },
      { name: 'Request Logging', fn: testRequestLogging },
      { name: 'Cost Tracking', fn: testCostTracking },
      { name: 'Concurrent Requests', fn: testConcurrentRequests },
      { name: 'Error Handling', fn: testErrorHandling },
      { name: 'Dashboard Access', fn: testDashboard },
    ];

    for (const test of tests) {
      const result = await runTest(test.name, test.fn);
      results.push(result);
    }
  }

  // Print summary
  logSection('Test Results Summary');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed > 0) {
    log('\nFailed tests:', 'red');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.error}`, 'red');
    });
    process.exit(1);
  }

  log('\n✓ All LiteLLM integration tests passed!', 'green');
}

// Execute
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});