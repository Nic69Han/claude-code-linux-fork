// Stub: ConnectorText block type — not part of the leaked source
export interface ConnectorTextBlock {
  type: 'connector_text'
  text: string
}

export function isConnectorTextBlock(block: unknown): block is ConnectorTextBlock {
  return typeof block === 'object' && block !== null && (block as { type?: string }).type === 'connector_text'
}
