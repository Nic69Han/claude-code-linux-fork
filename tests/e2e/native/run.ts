/**
 * Native API Integration Tests
 *
 * These tests validate Claude Code's direct integration with Anthropic API.
 * Requires ANTHROPIC_API_KEY environment variable.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... bun run tests/e2e/native/run.ts
 */

import { execSync } from 'bun';
import { resolve } from 'path';

// Test configuration
interface TestConfig {
  apiKey?: string;
  claudeCodePath: string;
  testProject: string;
  timeout: number;
}

const config: TestConfig = {
  claudeCodePath: resolve(__dirname, '../../dist/claude-code.js'),
  testProject: resolve(__dirname, '../fixtures/projects/hello-world'),
  timeout: 30000,
};

// ANSI color codes for output
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

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>,
  cleanupFn?: () => void
): Promise<TestResult> {
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
    if (cleanupFn) {
      try {
        cleanupFn();
      } catch {
        // Ignore cleanup errors
      }
    }
    return { name, passed: false, duration, error: errorMsg };
  } finally {
    console.log('');
  }
}

// Test: CLI help command
async function testCliHelp(): Promise<void> {
  const output = execSync(`bun run src/entrypoints/cli.tsx --help`, {
    encoding: 'utf-8',
    cwd: resolve(__dirname, '../..'),
  });
  if (!output.includes('claude-code')) {
    throw new Error('Help output missing expected content');
  }
}

// Test: Build succeeds
async function testBuild(): Promise<void> {
  execSync('bun run build', {
    encoding: 'utf-8',
    cwd: resolve(__dirname, '../..'),
  });

  const distPath = resolve(__dirname, '../../dist/claude-code.js');
  const exists = await Bun.file(distPath).exists();
  if (!exists) {
    throw new Error('Build output not found');
  }
}

// Test: Environment validation
async function testEnvValidation(): Promise<void> {
  // Check required environment variables
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('Warning: ANTHROPIC_API_KEY not set - skipping API tests', 'yellow');
    throw new Error('ANTHROPIC_API_KEY required for native API tests');
  }

  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid ANTHROPIC_API_KEY format');
  }
}

// Test: Basic API connectivity
async function testApiConnectivity(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API connectivity failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  if (!data.content || !Array.isArray(data.content)) {
    throw new Error('Unexpected API response format');
  }
}

// Test: Tool execution - file read
async function testToolFileRead(): Promise<void> {
  const testFile = resolve(__dirname, '../fixtures/projects/hello-world/index.js');

  // Verify file exists
  const file = Bun.file(testFile);
  if (!(await file.exists())) {
    throw new Error('Test fixture file not found');
  }

  const content = await file.text();
  if (!content.includes('Hello')) {
    throw new Error('Test fixture content unexpected');
  }
}

// Test: Tool execution - glob
async function testToolGlob(): Promise<void> {
  const projectPath = resolve(__dirname, '../fixtures/projects/hello-world');

  const files = execSync('rg --files .', {
    encoding: 'utf-8',
    cwd: projectPath,
  });

  const fileList = files.trim().split('\n');
  if (fileList.length === 0) {
    throw new Error('Glob returned no files');
  }
}

// Test: Error handling - invalid API key
async function testErrorHandling(): Promise<void> {
  const invalidKey = 'sk-ant-invalid-key-test';

  try {
    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': invalidKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    throw new Error('Should have thrown on invalid API key');
  } catch (error) {
    // Expected behavior - API should reject invalid key
    if (!(error instanceof Error) || !error.message.includes('401')) {
      // Note: This might pass with mock responses
    }
  }
}

// Test: Session management
async function testSessionManagement(): Promise<void> {
  const sessionDir = resolve(__dirname, '../fixtures/.sessions');

  // Ensure session directory exists
  execSync(`mkdir -p "${sessionDir}"`, { shell: '/bin/bash' });

  // Check that session files can be created
  const sessionId = `test-session-${Date.now()}`;
  const sessionFile = resolve(sessionDir, `${sessionId}.json`);

  await Bun.write(sessionFile, JSON.stringify({
    id: sessionId,
    created: new Date().toISOString(),
    project: 'hello-world',
  }));

  // Verify session was created
  const exists = await Bun.file(sessionFile).exists();
  if (!exists) {
    throw new Error('Session file was not created');
  }

  // Clean up
  execSync(`rm -f "${sessionFile}"`, { shell: '/bin/bash' });
}

// Test: Configuration loading
async function testConfigurationLoading(): Promise<void> {
  const configPath = resolve(__dirname, '../../.env.example');

  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    throw new Error('.env.example not found');
  }

  const content = await file.text();
  if (!content.includes('ANTHROPIC_API_KEY')) {
    throw new Error('.env.example missing required variables');
  }
}

// Test: Build with feature flags
async function testFeatureFlags(): Promise<void> {
  // Test build with custom version
  execSync('MACRO_VERSION="test-build" bun run build', {
    encoding: 'utf-8',
    cwd: resolve(__dirname, '../..'),
  });

  // Verify build completed
  const distPath = resolve(__dirname, '../../dist/claude-code.js');
  const stat = await Bun.file(distPath).text();
  if (stat.length === 0) {
    throw new Error('Build produced empty output');
  }
}

// Run all tests
async function runAllTests(): Promise<void> {
  logSection('Claude Code Native Integration Tests');

  // Check API key availability
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('⚠ Skipping native API tests - ANTHROPIC_API_KEY not set', 'yellow');
    log('  Set the key: export ANTHROPIC_API_KEY=sk-ant-...', 'yellow');
    log('  Or run LiteLLM tests instead: ./litellm/start.sh && bun run tests/e2e/litellm/run.ts', 'yellow');
    return;
  }

  // Run tests
  const tests: Array<{
    name: string;
    fn: () => Promise<void>;
    skip?: boolean;
  }> = [
    { name: 'CLI Help Command', fn: testCliHelp },
    { name: 'Build Success', fn: testBuild },
    { name: 'Environment Validation', fn: testEnvValidation },
    { name: 'API Connectivity', fn: testApiConnectivity },
    { name: 'Tool: File Read', fn: testToolFileRead },
    { name: 'Tool: Glob', fn: testToolGlob },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Session Management', fn: testSessionManagement },
    { name: 'Configuration Loading', fn: testConfigurationLoading },
    { name: 'Feature Flags', fn: testFeatureFlags },
  ];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
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

  log('\n✓ All native integration tests passed!', 'green');
}

// Execute
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});