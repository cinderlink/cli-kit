/**
 * System Monitor View Component
 * 
 * Real-time system stats display with multiple formats.
 */

import { Box, Text, LabeledBox, Table } from '@tuix/components'
import { If, Else } from '@tuix/cli'
import { LineChart } from './common/LineChart'

interface SystemMonitorViewProps {
  stats: any
  format: string
}

export function SystemMonitorView({ stats, format }: SystemMonitorViewProps) {
  return (
    <LabeledBox label="System Monitor">
      <If condition={format === 'table'}>
        <Table 
          data={[
            { Metric: 'CPU', Value: `${stats.cpu}%`, Status: stats.cpu > 80 ? '⚠️' : '✓' },
            { Metric: 'Memory', Value: `${stats.memory}%`, Status: stats.memory > 80 ? '⚠️' : '✓' },
            { Metric: 'Disk', Value: `${stats.disk}%`, Status: stats.disk > 90 ? '⚠️' : '✓' },
            { Metric: 'Network', Value: `${stats.network} MB/s`, Status: '✓' }
          ]}
        />
        
        <Else if={format === 'graph'}>
          <LineChart data={stats.history} />
        </Else>
        
        <Else>
          <Box vertical>
            <Text>CPU: {stats.cpu}%</Text>
            <Text>Memory: {stats.memory}%</Text>
            <Text>Disk: {stats.disk}%</Text>
            <Text>Network: {stats.network} MB/s</Text>
          </Box>
        </Else>
      </If>
    </LabeledBox>
  )
}