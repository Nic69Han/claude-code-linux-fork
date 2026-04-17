// Stub: contextCollapse — not part of the leaked source
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js'

export function isContextCollapseEnabled(): boolean {
  return false
}

export async function applyCollapsesIfNeeded(messages: MessageParam[]): Promise<{ messages: MessageParam[]; collapsed: boolean }> {
  return { messages, collapsed: false }
}
