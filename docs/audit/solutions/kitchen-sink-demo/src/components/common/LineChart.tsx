/**
 * Line Chart Component
 * 
 * Simple terminal-based line chart for data visualization.
 */

import { Box, Text } from '@tuix/components'

interface LineChartProps {
  data: number[]
  height?: number
  width?: number
}

export function LineChart({ data, height = 10, width = 40 }: LineChartProps) {
  if (data.length === 0) {
    return <Text style="muted">No data to display</Text>
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Normalize data to chart height
  const normalized = data.map(value => 
    Math.round((value - min) / range * (height - 1))
  )

  // Create chart rows
  const rows = []
  for (let row = height - 1; row >= 0; row--) {
    let line = ''
    for (let col = 0; col < normalized.length; col++) {
      if (normalized[col] === row) {
        line += '●'
      } else if (normalized[col] > row) {
        line += '│'
      } else {
        line += ' '
      }
    }
    rows.push(line)
  }

  return (
    <Box vertical>
      <Box style="border padding:4">
        {rows.map((row, i) => (
          <Text key={i} style="mono">{row}</Text>
        ))}
      </Box>
      <Box horizontal justify="space-between">
        <Text style="muted">{min.toFixed(1)}</Text>
        <Text style="muted">{max.toFixed(1)}</Text>
      </Box>
    </Box>
  )
}