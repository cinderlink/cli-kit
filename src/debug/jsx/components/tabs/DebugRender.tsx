/**
 * Debug Render Tab
 */

import { text, vstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../../core/store'
import type { View } from '@core/types'

export function DebugRender(): View {
  const state = debugStore.getState()
  const renderEvents = state.events.filter(e => e.category === 'render' || e.category === 'jsx')
  
  return vstack([
    text('🎨 Render Trace', { color: Colors.cyan, bold: true }),
    text(`${renderEvents.length} render events`),
    text(''),
    ...renderEvents.slice(-10).map(event => {
      const time = event.timestamp.toLocaleTimeString()
      const component = event.context?.componentName || 'Unknown'
      const phase = event.context?.phase || ''
      
      return text(`${time} ${component} ${phase}`)
    })
  ])
}