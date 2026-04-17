// Stub: cachedMicrocompact — not part of the leaked source
export interface CachedMCState {
  initialized: boolean
}

export async function getCachedMicrocompact(): Promise<CachedMCState> {
  return { initialized: false }
}

export function resetCachedState(): void {}
