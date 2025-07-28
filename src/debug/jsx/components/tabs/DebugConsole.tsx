/**
 * Debug Console Tab
 */

import { text, vstack, box } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../../core/store'
import type { View } from '@core/types'

export function DebugConsole(): View {
  const state = debugStore.getState()
  const loggerEvents = state.events.filter(e => e.category === 'logger')

  return vstack([
    text('💻 Console Output', { color: Colors.cyan, bold: true }),
    text(`${loggerEvents.length} log entries`),
    text(''),
    box(
      {
        style: {
          borderColor: Colors.gray,
          borderStyle: 'single',
          padding: 1,
          maxHeight: 15,
        },
      },
      [
        vstack(
          loggerEvents.slice(-20).map(event =>
            text(event.message, {
              color: Colors[LEVEL_COLORS[event.level] as keyof typeof Colors],
            })
          )
        ),
      ]
    ),
  ])
}

const LEVEL_COLORS = {
  debug: 'gray',
  info: 'white',
  warn: 'yellow',
  error: 'red',
} as const
