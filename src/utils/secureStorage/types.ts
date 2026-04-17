/**
 * Type definitions for secure credential storage.
 *
 * SecureStorageData is stored as a single JSON blob in the platform keyring
 * (macOS Keychain, Linux Secret Service) or in ~/.claude/.credentials.json
 * (chmod 0600) as a plaintext fallback.
 */

// ─── OAuth token data ───────────────────────────────────────────────────────

export interface OAuthTokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes?: string[]
  subscriptionType?: string | null
  rateLimitTier?: string | null
}

// ─── MCP OAuth data ──────────────────────────────────────────────────────────

export interface McpOAuthServerData {
  serverName?: string
  serverUrl?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  scopes?: string[]
  [key: string]: unknown
}

// ─── Main credential blob ────────────────────────────────────────────────────

/**
 * The shape of data stored in the platform keyring.
 * All fields are optional — missing fields mean "not set".
 */
export interface SecureStorageData {
  /** Claude.ai OAuth tokens (primary auth method) */
  claudeAiOauth?: OAuthTokenData

  /** MCP server OAuth tokens, keyed by server identifier */
  mcpOAuth?: Record<string, McpOAuthServerData>

  /** Trusted device token for bridge/IDE integration */
  trustedDeviceToken?: string

  /** Additional fields from plugins or future features */
  [key: string]: unknown
}

// ─── Storage interface ───────────────────────────────────────────────────────

/**
 * Platform-specific credential storage backend.
 * Implementations: macOsKeychainStorage, linuxSecretServiceStorage, plainTextStorage.
 */
export interface SecureStorage {
  /** Human-readable backend name used in analytics/logging */
  name: string

  /**
   * Synchronous read — used in contexts that cannot await.
   * Returns null if no credentials are stored or on error.
   */
  read(): SecureStorageData | null

  /**
   * Asynchronous read — preferred when awaiting is possible.
   * Returns null if no credentials are stored or on error.
   */
  readAsync(): Promise<SecureStorageData | null>

  /**
   * Write the full credential blob.
   * Returns { success: true } on success.
   * Returns { success: false } on failure.
   * May return a { warning } string on partial success (e.g. plaintext fallback).
   */
  update(data: SecureStorageData): { success: boolean; warning?: string }

  /**
   * Delete all stored credentials.
   * Returns true if credentials were deleted (or did not exist).
   */
  delete(): boolean
}
