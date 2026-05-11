/**
 * Test Utilities for Claude Code E2E Tests
 *
 * Provides common utilities for test setup, teardown, and assertions.
 */

import { resolve } from 'path';

// Test environment configuration
export interface TestEnvironment {
  projectRoot: string;
  distPath: string;
  fixturesPath: string;
  sessionDir: string;
  apiKey?: string;
  baseUrl: string;
  timeout: number;
}

// Get test environment from environment variables
export function getTestEnvironment(): TestEnvironment {
  return {
    projectRoot: resolve(__dirname, '../..'),
    distPath: resolve(__dirname, '../../dist/claude-code.js'),
    fixturesPath: resolve(__dirname, '../fixtures'),
    sessionDir: resolve(__dirname, '../fixtures/.sessions'),
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'http://localhost:4000',
    timeout: parseInt(process.env.CLAUDE_CODE_TEST_TIMEOUT || '30000'),
  };
}

// Wait for a condition with timeout
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

// Retry a function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Simple assertion helpers
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
    );
  }
}

export function assertContains(str: string, substr: string, message?: string): void {
  if (!str.includes(substr)) {
    throw new Error(
      message || `Expected string to contain "${substr}" but got "${str}"`
    );
  }
}

// Create a temporary test project
export async function createTempProject(name: string, files: Record<string, string>): Promise<string> {
  const projectDir = resolve(getTestEnvironment().fixturesPath, 'projects', name);

  // Create directory structure
  await Bun.write(projectDir + '/.gitkeep', '');

  // Write files
  for (const [path, content] of Object.entries(files)) {
    const filePath = resolve(projectDir, path);
    await Bun.write(filePath, content);
  }

  return projectDir;
}

// Clean up test artifacts
export async function cleanupTestArtifacts(patterns: string[]): Promise<void> {
  const { execSync } = await import('bun');

  for (const pattern of patterns) {
    try {
      execSync(`rm -rf "${pattern}"`, { shell: '/bin/bash' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Mock API response
export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

// Test fixtures
export const fixtures = {
  helloWorld: {
    packageJson: {
      name: 'hello-world',
      version: '1.0.0',
      main: 'index.js',
    },
    indexJs: 'console.log("Hello, World!");',
    readme: '# Hello World\n\nA simple test project.',
  },

  nodeApi: {
    packageJson: {
      name: 'node-api',
      version: '1.0.0',
      main: 'server.js',
    },
    serverJs: `const http = require('http');
const PORT = 3456;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}).listen(PORT);`,
  },

  typescriptProject: {
    packageJson: {
      name: 'typescript-project',
      version: '1.0.0',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        test: 'jest',
      },
    },
    tsconfig: {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        outDir: './dist',
        strict: true,
      },
    },
    indexTs: 'export const greet = (name: string) => `Hello, ${name}!`;',
  },
};

// Export colors for test output
export const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export function logTest(msg: string, color = 'reset') {
  console.log(`${colors[color as keyof typeof colors]}${msg}${colors.reset}`);
}