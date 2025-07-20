/**
 * Config Display Component
 */

import { Box, Text, LabeledBox, Table } from '@tuix/components'

export function ConfigDisplay({ config }) {
  if (!config) {
    return <Text style="muted">No configuration loaded</Text>
  }
  
  const configEntries = Object.entries(config).map(([key, value]) => ({
    Key: key,
    Value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    Type: typeof value
  }))
  
  return (
    <LabeledBox label="Configuration">
      <Table data={configEntries} />
    </LabeledBox>
  )
}