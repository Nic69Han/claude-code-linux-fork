// Stub: AssistantSessionChooser — not part of the leaked source
import React from 'react'

interface Props {
  sessions: unknown[]
  onSelect: (id: string) => void
  onCancel: () => void
}

export function AssistantSessionChooser({ onCancel }: Props): React.ReactElement {
  React.useEffect(() => { onCancel() }, [])
  return <></>
}
