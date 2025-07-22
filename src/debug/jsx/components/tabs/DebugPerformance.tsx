/**
 * Debug Performance Tab
 */

import { text, vstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../../core/store'
import type { View } from '@core/types'

export function DebugPerformance(): View {
  const performanceMetrics = debugStore.getPerformanceReport()
  
  return vstack([
    text('⚡ Performance Metrics', { color: Colors.cyan, bold: true }),
    text(''),
    text('Component Performance:', { color: Colors.yellow }),
    ...performanceMetrics.slice(0, 10).map(metric => 
      vstack([
        text(`  ${metric.name}:`),
        text(`    Calls: ${metric.count}`),
        text(`    Avg: ${metric.avgTime.toFixed(2)}ms`, { 
          color: metric.avgTime > 16 ? Colors.red : Colors.green 
        }),
        text(`    Max: ${metric.maxTime.toFixed(2)}ms`),
        text(`    Total: ${metric.totalTime.toFixed(2)}ms`),
        text('')
      ])
    )
  ])
}