/**
 * Linux secure credential storage via libsecret (secret-tool CLI).
 *
 * secret-tool is the CLI frontend for the Secret Service API (D-Bus),
 * which is implemented by:
 *   - GNOME Keyring (default on GNOME/Ubuntu/Fedora)
 *   - KWallet via ksecretservice (KDE)
 *   - Any other Secret Service API-compatible daemon
 *
 * Install: sudo apt install libsecret-tools
 *          sudo dnf install libsecret
 *
 * Falls back to plainTextStorage when:
 *   - secret-tool is not installed
 *   - No Secret Service daemon is running (headless servers, CI)
 *   - D-Bus session bus is unavailable (SSH without -X or no session)
 *
 * Cache behaviour mirrors macOsKeychainStorage: TTL-based with stale-while-error
 * to avoid surfacing transient daemon hiccups as "Not logged in".
 */

import { execFileSync } from 'child_process'
import { execaSync } from 'execa'
import { logForDebugging } from '../debug.js'
import { execFileNoThrow } from '../execFileNoThrow.js'
import { jsonParse, jsonStringify } from '../slowOperations.js'
import type { SecureStorage, SecureStorageData } from './types.js'

// Secret Service attribute names used for lookup
const SS_ATTR_SERVICE = 'service'
const SS_ATTR_ACCOUNT = 'account'

// Label shown in the keyring manager UI
const SS_LABEL = 'Claude Code credentials'

// Cache TTL — mirrors macOS keychain (see macOsKeychainStorage.ts)
const CACHE_TTL_MS = 5_000

interface Cache {
  data: SecureStorageData | null
  cachedAt: number
}

const cacheState: { cache: Cache } = {
  cache: { data: null, cachedAt: 0 },
}

function clearCache(): void {
  cacheState.cache = { data: null, cachedAt: 0 }
}

/**
 * Build the unique service key, mirroring getMacOsKeychainStorageServiceName().
 * Uses CLAUDE_CONFIG_DIR env var (if set) to distinguish non-default profiles.
 */
function getServiceName(): string {
  const suffix = process.env.CLAUDE_CONFIG_DIR
    ? `-${Buffer.from(process.env.CLAUDE_CONFIG_DIR).toString('hex').substring(0, 8)}`
    : ''
  return `claude-code${suffix}`
}

function getAccountName(): string {
  try {
    return process.env.USER || process.env.LOGNAME || require('os').userInfo().username || 'user'
  } catch {
    return 'user'
  }
}

/**
 * Check whether secret-tool is available and the Secret Service daemon is
 * reachable. Returns false on headless servers / SSH sessions without a
 * D-Bus session bus.
 */
let secretToolAvailableCache: boolean | undefined

function isSecretToolAvailable(): boolean {
  if (secretToolAvailableCache !== undefined) return secretToolAvailableCache

  try {
    // 'secret-tool --version' exits 0 and prints to stderr on most versions;
    // a non-zero exit or ENOENT means unavailable.
    execFileSync('secret-tool', ['--version'], {
      stdio: 'pipe',
      timeout: 2_000,
    })
    secretToolAvailableCache = true
  } catch {
    secretToolAvailableCache = false
    logForDebugging(
      '[linux-keyring] secret-tool not available — falling back to plaintext storage',
      { level: 'info' },
    )
  }
  return secretToolAvailableCache
}

export const linuxSecretServiceStorage = {
  name: 'linux-secret-service',

  read(): SecureStorageData | null {
    if (!isSecretToolAvailable()) return null

    const prev = cacheState.cache
    if (Date.now() - prev.cachedAt < CACHE_TTL_MS) {
      return prev.data
    }

    try {
      const stdout = execFileSync(
        'secret-tool',
        [
          'lookup',
          SS_ATTR_SERVICE,
          getServiceName(),
          SS_ATTR_ACCOUNT,
          getAccountName(),
        ],
        { encoding: 'utf-8', stdio: 'pipe', timeout: 5_000 },
      ).trim()

      if (stdout) {
        const data = jsonParse(stdout)
        cacheState.cache = { data, cachedAt: Date.now() }
        return data
      }
    } catch (e) {
      // Exit code 1 with no output = entry not found (normal on first run)
      // Stale-while-error: keep serving previous valid data on transient failures
      if (prev.data !== null) {
        logForDebugging('[linux-keyring] read failed; serving stale cache', {
          level: 'warn',
        })
        cacheState.cache = { data: prev.data, cachedAt: Date.now() }
        return prev.data
      }
    }

    cacheState.cache = { data: null, cachedAt: Date.now() }
    return null
  },

  async readAsync(): Promise<SecureStorageData | null> {
    if (!isSecretToolAvailable()) return null

    const prev = cacheState.cache
    if (Date.now() - prev.cachedAt < CACHE_TTL_MS) {
      return prev.data
    }

    try {
      const { stdout, code } = await execFileNoThrow(
        'secret-tool',
        [
          'lookup',
          SS_ATTR_SERVICE,
          getServiceName(),
          SS_ATTR_ACCOUNT,
          getAccountName(),
        ],
        { useCwd: false, preserveOutputOnError: false },
      )

      if (code === 0 && stdout) {
        const data = jsonParse(stdout.trim())
        cacheState.cache = { data, cachedAt: Date.now() }
        return data
      }
    } catch {
      if (prev.data !== null) {
        logForDebugging(
          '[linux-keyring] readAsync failed; serving stale cache',
          { level: 'warn' },
        )
        cacheState.cache = { data: prev.data, cachedAt: Date.now() }
        return prev.data
      }
    }

    cacheState.cache = { data: null, cachedAt: Date.now() }
    return null
  },

  update(data: SecureStorageData): { success: boolean; warning?: string } {
    if (!isSecretToolAvailable()) return { success: false }

    clearCache()

    try {
      const jsonString = jsonStringify(data)

      // secret-tool reads the secret from stdin, which avoids exposing
      // credentials in the process arguments list (same motivation as
      // macOS 'security -i' approach).
      const result = execaSync(
        'secret-tool',
        [
          'store',
          '--label',
          SS_LABEL,
          SS_ATTR_SERVICE,
          getServiceName(),
          SS_ATTR_ACCOUNT,
          getAccountName(),
        ],
        {
          input: jsonString,
          stdio: ['pipe', 'pipe', 'pipe'],
          reject: false,
          timeout: 10_000,
        },
      )

      if (result.exitCode !== 0) {
        logForDebugging(
          `[linux-keyring] store failed (exit ${result.exitCode}): ${result.stderr}`,
          { level: 'warn' },
        )
        return { success: false }
      }

      cacheState.cache = { data, cachedAt: Date.now() }
      return { success: true }
    } catch (e) {
      logForDebugging(`[linux-keyring] store threw: ${e}`, { level: 'warn' })
      return { success: false }
    }
  },

  delete(): boolean {
    if (!isSecretToolAvailable()) return false

    clearCache()

    try {
      const result = execaSync(
        'secret-tool',
        [
          'clear',
          SS_ATTR_SERVICE,
          getServiceName(),
          SS_ATTR_ACCOUNT,
          getAccountName(),
        ],
        {
          reject: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 5_000,
        },
      )
      // exit 0 = cleared, exit 1 with no matching entry is also "success"
      return result.exitCode === 0 || result.exitCode === 1
    } catch {
      return false
    }
  },
} satisfies SecureStorage
