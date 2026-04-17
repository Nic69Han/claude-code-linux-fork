import { createFallbackStorage } from './fallbackStorage.js'
import { linuxSecretServiceStorage } from './linuxSecretServiceStorage.js'
import { macOsKeychainStorage } from './macOsKeychainStorage.js'
import { plainTextStorage } from './plainTextStorage.js'
import type { SecureStorage } from './types.js'

/**
 * Get the appropriate secure storage implementation for the current platform.
 *
 * Priority order:
 *   macOS  → macOS Keychain → plaintext fallback
 *   Linux  → Secret Service (libsecret/GNOME Keyring/KWallet) → plaintext fallback
 *   other  → plaintext only
 *
 * The plaintext fallback file (~/.claude/.credentials.json) is written with
 * chmod 0600 so only the owner can read it.
 */
export function getSecureStorage(): SecureStorage {
  if (process.platform === 'darwin') {
    return createFallbackStorage(macOsKeychainStorage, plainTextStorage)
  }

  if (process.platform === 'linux') {
    // linuxSecretServiceStorage returns false from isSecretToolAvailable()
    // on headless servers — createFallbackStorage then immediately uses
    // plainTextStorage (chmod 0600) without ever spawning secret-tool.
    return createFallbackStorage(linuxSecretServiceStorage, plainTextStorage)
  }

  return plainTextStorage
}
