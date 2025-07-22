/**
 * Process Status View Component
 * 
 * Displays the status of a process with visual indicators
 */

import { panel, vstack, hstack, text } from "@ui/components"

export interface ProcessStatusViewProps {
  process: {
    name: string
    status: 'running' | 'stopped' | 'error' | 'starting'
    pid?: number
    startTime?: Date
    restarts?: number
    command?: string
    group?: string
    args?: string[]
  }
  detailed?: boolean
}

const statusColors = {
  running: 'green',
  stopped: 'gray',
  error: 'red',
  starting: 'yellow'
} as const

const statusIcons = {
  running: '🟢',
  stopped: '⚪',
  error: '🔴',
  starting: '🟡'
} as const

export const ProcessStatusView = ({ process, detailed }: ProcessStatusViewProps) => {
  const uptime = process.startTime ? 
    `${Math.floor((Date.now() - process.startTime.getTime()) / 1000)}s` : "-"

  return (
    <panel border="single" style={{ padding: '0.5' }}>
      <vstack>
        <hstack>
          <text>{statusIcons[process.status] || '⚫'}</text>
          <text bold color="cyan">{process.name.padEnd(20)}</text>
          <text color={statusColors[process.status] || 'white'}>
            [{process.status.toUpperCase().padEnd(8)}]
          </text>
          <text color="gray">PID: {(process.pid || "-").toString().padEnd(8)}</text>
          <text color="blue">⏱️  {uptime.padEnd(10)}</text>
          <text color="yellow">🔄 {process.restarts || 0}</text>
        </hstack>
        
        {detailed && (
          <vstack>
            <text color="gray">├─ Command: {process.command || "Unknown"}</text>
            {process.group && <text color="purple">├─ Group: {process.group}</text>}
            {process.args?.length > 0 && <text color="gray">└─ Args: {process.args.join(' ')}</text>}
          </vstack>
        )}
      </vstack>
    </panel>
  )
}