/**
 * Process List Component
 * 
 * Displays a list of processes with status indicators.
 */

import { Box, Text, Table } from '@tuix/components'
import { If } from '@tuix/cli'

interface Process {
  id: string
  name: string
  status: 'running' | 'stopped' | 'error'
  cpu: number
  memory: number
}

interface ProcessListProps {
  processes: Process[]
}

export function ProcessList({ processes }: ProcessListProps) {
  return (
    <Box vertical>
      <If condition={processes.length === 0}>
        <Text style="muted">No processes running</Text>
      </If>
      
      <If condition={processes.length > 0}>
        <Table 
          data={processes.map(p => ({
            Name: p.name,
            Status: getStatusIcon(p.status),
            CPU: `${p.cpu}%`,
            Memory: `${p.memory}MB`
          }))}
        />
      </If>
    </Box>
  )
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'running': return '🟢 Running'
    case 'stopped': return '⚫ Stopped'
    case 'error': return '🔴 Error'
    default: return '❓ Unknown'
  }
}