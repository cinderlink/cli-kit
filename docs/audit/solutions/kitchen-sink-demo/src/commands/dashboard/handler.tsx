/**
 * Dashboard Command Handler
 * 
 * Renders the dashboard UI with real-time metrics.
 */

import { Box, Text, LabeledBox } from '@tuix/components'
import { $state, $effect, $derived } from '@tuix/reactivity'
import { StatCard } from '../../components/common/StatCard'
import { ProcessList } from '../../components/common/ProcessList'
import { LineChart } from '../../components/common/LineChart'
import type { DashboardArgs, DashboardFlags, DashboardOptions } from './schema'

interface DashboardHandlerProps {
  args: DashboardArgs
  flags: DashboardFlags
  options: DashboardOptions
  config: any
}

export function DashboardHandler({ args, flags, options, config }: DashboardHandlerProps) {
  // Reactive state with runes
  const state = $state({
    processes: [],
    metrics: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0
    },
    history: {
      cpu: [],
      memory: []
    },
    uptime: 0
  })

  // Derived values
  const runningCount = $derived(() => 
    state.processes.filter(p => p.status === 'running').length
  )

  const activeMetrics = $derived(() => 
    flags.metrics.map(m => ({
      name: m,
      value: state.metrics[m]
    }))
  )

  // Update metrics periodically based on refresh flag
  $effect(() => {
    const timer = setInterval(() => {
      // Simulate metric updates
      state.metrics.cpu = Math.random() * 100
      state.metrics.memory = Math.random() * 100
      state.metrics.disk = Math.random() * 100
      state.metrics.network = Math.random() * 10
      
      // Track history
      state.history.cpu.push(state.metrics.cpu)
      state.history.memory.push(state.metrics.memory)
      
      // Keep history limited
      if (state.history.cpu.length > 20) {
        state.history.cpu.shift()
        state.history.memory.shift()
      }
      
      state.uptime++
    }, flags.refresh)
    
    return () => clearInterval(timer)
  })

  // Apply theme
  const themeClass = options.theme === 'auto' 
    ? 'theme-auto' 
    : `theme-${options.theme}`

  return (
    <Box vertical className={themeClass}>
      <Text style="title">
        Kitchen Sink Dashboard {flags.compact && '(Compact)'}
      </Text>
      
      {!flags.compact && (
        <Text style="muted">
          Refreshing every {flags.refresh}ms • Theme: {options.theme}
        </Text>
      )}
      
      {/* Metric cards */}
      <Box horizontal gap={2}>
        {activeMetrics.map(metric => (
          <StatCard 
            key={metric.name}
            label={metric.name.toUpperCase()}
            value={`${metric.value.toFixed(1)}%`}
            variant={metric.value > 80 ? 'warning' : 'default'}
          />
        ))}
        <StatCard label="Uptime" value={`${state.uptime}s`} />
        <StatCard label="Processes" value={runningCount} variant="success" />
      </Box>
      
      {/* Charts - only show if not compact */}
      {!flags.compact && (
        <Box horizontal gap={2}>
          <LabeledBox label="CPU History">
            <LineChart data={state.history.cpu} height={8} />
          </LabeledBox>
          
          <LabeledBox label="Memory History">
            <LineChart data={state.history.memory} height={8} />
          </LabeledBox>
        </Box>
      )}
      
      {/* Process list */}
      <LabeledBox label="Active Processes">
        <ProcessList processes={state.processes} />
      </LabeledBox>
      
      {/* Config info */}
      <Box style="muted">
        <Text>Config: {config ? '✓ Loaded' : '✗ Not loaded'}</Text>
      </Box>
    </Box>
  )
}