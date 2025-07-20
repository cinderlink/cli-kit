/**
 * Dashboard View Component
 * 
 * Displays system overview with process info and stats.
 */

import { Box, Text, LabeledBox } from '@tuix/components'
import { $state, $derived, $effect } from '@tuix/reactivity'
import { StatCard } from './common/StatCard'
import { ProcessList } from './common/ProcessList'

interface DashboardViewProps {
  config: any
}

export function DashboardView({ config }: DashboardViewProps) {
  // Component state
  const state = $state({
    processes: [],
    stats: {
      cpu: 0,
      memory: 0,
      uptime: 0
    }
  })

  // Derived values
  const runningCount = $derived(() => 
    state.processes.filter(p => p.status === 'running').length
  )

  // Update stats periodically
  $effect(() => {
    const timer = setInterval(() => {
      state.stats.cpu = Math.random() * 100
      state.stats.memory = Math.random() * 100
      state.stats.uptime += 1
    }, 1000)
    
    return () => clearInterval(timer)
  })

  return (
    <Box vertical>
      <Text style="title">Kitchen Sink Dashboard</Text>
      
      <Box horizontal gap={2}>
        <StatCard label="Running Processes" value={runningCount} />
        <StatCard label="CPU Usage" value={`${state.stats.cpu.toFixed(1)}%`} />
        <StatCard label="Memory Usage" value={`${state.stats.memory.toFixed(1)}%`} />
        <StatCard label="Uptime" value={`${state.stats.uptime}s`} />
      </Box>
      
      <LabeledBox label="Active Processes">
        <ProcessList processes={state.processes} />
      </LabeledBox>
      
      <Box style="muted">
        <Text>Config loaded: {config ? '✓' : '✗'}</Text>
      </Box>
    </Box>
  )
}