// Stub: snipCompact — not part of the leaked source
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js'

export interface SnipResult {
  messages: MessageParam[]
  snipped: boolean
}

export function snipCompactIfNeeded(messages: MessageParam[]): SnipResult {
  return { messages, snipped: false }
}
