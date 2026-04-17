// Stub: filePersistence types — not part of the leaked source
export const DEFAULT_UPLOAD_CONCURRENCY = 3
export const FILE_COUNT_LIMIT = 100
export const OUTPUTS_SUBDIR = 'outputs'

export interface FailedPersistence {
  file: string
  error: string
}

export interface PersistedFile {
  path: string
  url: string
}

export interface FilesPersistedEventData {
  files: PersistedFile[]
  failed: FailedPersistence[]
}

export type TurnStartTime = number
