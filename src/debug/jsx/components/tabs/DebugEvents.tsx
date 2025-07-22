/**
 * Debug Events Tab
 */

import { text, vstack, hstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../../core/store'
import { CATEGORY_ICONS, LEVEL_COLORS } from '../../../constants'
import type { View } from '@core/types'
import type { DebugEvent } from '../../../types'

export function DebugEvents(): View {
  const state = debugStore.getState()
  const filteredEvents = debugStore.getFilteredEvents()
  
  // Show last 15 events
  const recentEvents = filteredEvents.slice(-15)
  
  return vstack([
    text('📝 Event Log', { color: Colors.cyan, bold: true }),
    text(`Showing ${recentEvents.length} of ${filteredEvents.length} events`),
    state.filter && text(`Filter: "${state.filter}"`, { color: Colors.yellow }),
    text(''),
    ...recentEvents.map(event => renderEvent(event))
  ])
}

function renderEvent(event: DebugEvent): View {
  const time = event.timestamp.toLocaleTimeString()
  const levelColor = Colors[LEVEL_COLORS[event.level] as keyof typeof Colors]
  const icon = CATEGORY_ICONS[event.category] || '•'
  
  const parts: View[] = [
    text(time, { color: Colors.gray }),
    text(' '),
    text(icon),
    text(' '),
    text(`[${event.category}]`, { color: Colors.gray }),
    text(' '),
    text(event.message, { color: levelColor })
  ]
  
  if (event.context?.componentName) {
    parts.push(text(` (${event.context.componentName})`, { color: Colors.gray }))
  }
  
  if (event.context?.duration !== undefined) {
    parts.push(text(` ${event.context.duration.toFixed(2)}ms`, { color: Colors.green }))
  }
  
  return hstack(parts)
}