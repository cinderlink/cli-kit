/**
 * Process List Component
 * 
 * Demonstrates DataTable usage with process manager plugin
 */

import { DataTable, Text } from '@tuix/components'
import { useProcessManager } from '@tuix/plugin-process-manager'
import { useAppState } from '../hooks/useAppState'

export function ProcessList() {
  const pm = useProcessManager()
  const { setSelectedProcess } = useAppState()
  const processes = pm.list()
  
  return (
    <DataTable
      data={processes}
      columns={[
        { key: 'pid', title: 'PID', width: 10 },
        { key: 'name', title: 'Name', width: 30 },
        { 
          key: 'status', 
          title: 'Status', 
          width: 15,
          render: (status) => (
            <Text color={status === 'running' ? 'green' : 'red'}>
              {status}
            </Text>
          )
        },
        { key: 'cpu', title: 'CPU %', width: 10 },
        { key: 'memory', title: 'Memory', width: 15 },
        { key: 'uptime', title: 'Uptime', width: 20 }
      ]}
      onRowClick={(process) => setSelectedProcess(process)}
      sortable={true}
      filterable={true}
    />
  )
}