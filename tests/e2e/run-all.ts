#!/usr/bin/env bun
/**
 * E2E Test Runner
 * Runs both native and LiteLLM integration tests
 *
 * Usage:
 *   bun run tests/e2e/run-all.ts
 *   bun run tests/e2e/run-all.ts --native      # Native only
 *   bun run tests/e2e/run-all.ts --litellm    # LiteLLM only
 *   bun run tests/e2e/run-all.ts --coverage    # With coverage
 *   bun run tests/e2e/run-all.ts --verbose    # Verbose output
 */

import { resolve } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  native: args.includes('--native'),
  litellm: args.includes('--litellm'),
  coverage: args.includes('--coverage'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg: string, color = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${msg}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  log(title, 'cyan');
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

function printUsage() {
  log('E2E Test Runner for Claude Code Linux Fork', 'cyan');
  console.log('');
  log('Usage:', 'yellow');
  console.log('  bun run tests/e2e/run-all.ts [options]');
  console.log('');
  log('Options:', 'yellow');
  console.log('  --native    Run only native API tests');
  console.log('  --litellm   Run only LiteLLM integration tests');
  console.log('  --coverage  Generate coverage report');
  console.log('  --verbose   Verbose output (show all test output)');
  console.log('  --help      Show this help message');
  console.log('');
  log('Examples:', 'yellow');
  console.log('  # Run all tests');
  console.log('  bun run tests/e2e/run-all.ts');
  console.log('');
  console.log('  # Run only native tests');
  console.log('  ANTHROPIC_API_KEY=sk-ant-... bun run tests/e2e/run-all.ts --native');
  console.log('');
  console.log('  # Run only LiteLLM tests (with proxy running)');
  console.log('  bun run tests/e2e/run-all.ts --litellm');
  console.log('');
  console.log('  # With coverage');
  console.log('  bun run tests/e2e/run-all.ts --coverage');
  console.log('');
}

// Track test results
interface TestSuiteResult {
  name: string;
  testsRun: number;
  passed: number;
  failed: number;
  duration: number;
  errors: string[];
}

const suiteResults: TestSuiteResult[] = [];

// Run a test suite
async function runTestSuite(suitePath: string, suiteName: string): Promise<TestSuiteResult> {
  const start = Date.now();

  log(`Running ${suiteName} tests...`, 'blue');

  try {
    // Use Bun's subprocess to run the test
    const proc = Bun.spawn(['bun', 'run', suitePath], {
      cwd: resolve(__dirname, '../..'),
      env: {
        ...process.env,
        CI: '1',
      },
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await proc.exited;

    const duration = Date.now() - start;
    const passed = exitCode === 0;

    return {
      name: suiteName,
      testsRun: 0,
      passed: passed ? 1 : 0,
      failed: passed ? 0 : 1,
      duration,
      errors: passed ? [] : [`Exit code: ${exitCode}`],
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name: suiteName,
      testsRun: 0,
      passed: 0,
      failed: 1,
      duration,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Print summary
function printSummary() {
  logSection('E2E Test Summary');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const result of suiteResults) {
    log(`\n${result.name}:`, 'yellow');
    log(`  Tests: ${result.testsRun}`);
    log(`  Passed: ${result.passed}`, result.passed > 0 ? 'green' : 'reset');
    log(`  Failed: ${result.failed}`, result.failed > 0 ? 'red' : 'reset');
    log(`  Duration: ${result.duration}ms`);

    if (result.errors.length > 0) {
      log(`  Errors:`, 'red');
      result.errors.forEach(e => log(`    - ${e}`, 'red'));
    }

    totalTests += result.testsRun;
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalDuration += result.duration;
  }

  console.log(`\n${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
  log(`Total: ${totalTests} | Passed: ${totalPassed} | Failed: ${totalFailed}`, 'reset');
  log(`Total Duration: ${totalDuration}ms`);
  console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`);

  if (totalFailed > 0) {
    log('✗ Some tests failed', 'red');
    process.exit(1);
  } else {
    log('✓ All E2E tests passed!', 'green');
    process.exit(0);
  }
}

// Main execution
async function main() {
  if (options.help) {
    printUsage();
    return;
  }

  logSection('Claude Code Linux Fork - E2E Test Suite');

  console.log('Prerequisites:');
  console.log('  • Native tests: export ANTHROPIC_API_KEY=sk-ant-...');
  console.log('  • LiteLLM tests: ./litellm/start.sh --backend <backend>');
  console.log('');

  const shouldRunNative = !options.litellm;
  const shouldRunLiteLLM = !options.native;

  // Run test suites
  if (shouldRunNative) {
    const nativeResult = await runTestSuite(
      resolve(__dirname, 'native/run.ts'),
      'Native Integration'
    );
    suiteResults.push(nativeResult);
  }

  if (shouldRunLiteLLM) {
    const liteLLMResult = await runTestSuite(
      resolve(__dirname, 'litellm/run.ts'),
      'LiteLLM Integration'
    );
    suiteResults.push(liteLLMResult);
  }

  // Print final summary
  printSummary();
}

// Execute
main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});