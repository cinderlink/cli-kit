/**
 * DebugLogs Component
 *
 * Standalone component for viewing debug logs
 */

import { $state, $effect } from '@core/update/reactivity/runes'
import { box, text, vstack, hstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../core/store'
import type { DebugEvent } from '../../types'
import { CATEGORY_ICONS, LEVEL_COLORS } from '../../constants'
import type { View } from '@core/types'

export interface DebugLogsProps {
  category?: DebugEvent['category']
  maxItems?: number
  showTimestamp?: boolean
  showLevel?: boolean
  filter?: string
}

export function DebugLogs({
  category,
  maxItems = 20,
  showTimestamp = true,
  showLevel = true,
  filter,
}: DebugLogsProps = {}) {
  const events = $state<DebugEvent[]>([])
  const selectedIndex = $state(0)

  // Subscribe to store updates
  $effect(() => {
    const updateEvents = () => {
      let filtered = debugStore.getFilteredEvents()

      if (category) {
        filtered = filtered.filter(e => e.category === category)
      }

      if (filter) {
        const lowerFilter = filter.toLowerCase()
        filtered = filtered.filter(
          e =>
            e.message.toLowerCase().includes(lowerFilter) ||
            JSON.stringify(e.data).toLowerCase().includes(lowerFilter)
        )
      }

      events.value = filtered.slice(-maxItems)
    }

    updateEvents()
    const unsubscribe = debugStore.subscribe(updateEvents)

    return () => unsubscribe()
  })

  // Keyboard navigation
  $effect(() => {
    const handleKey = (key: Buffer) => {
      const keyStr = key.toString()
      switch (keyStr) {
        case '\u001b[A': // Arrow Up
          selectedIndex.value = Math.max(0, selectedIndex.value - 1)
          break
        case '\u001b[B': // Arrow Down
          selectedIndex.value = Math.min(events.value.length - 1, selectedIndex.value + 1)
          break
        case '\r': // Enter
          if (events.value[selectedIndex.value]) {
            debugStore.setSelectedEvent(events.value[selectedIndex.value].id)
          }
          break
      }
    }

    process.stdin.on('data', handleKey)
    return () => process.stdin.off('data', handleKey)
  })

  return vstack([
    // Header
    box(
      {
        style: {
          borderColor: Colors.gray,
          borderStyle: 'single',
          padding: { left: 1, right: 1 },
        },
      },
      [
        hstack([
          text('📝 Debug Logs', { color: Colors.cyan }),
          text(` (${events.value.length} events)`, { color: Colors.gray }),
        ]),
      ]
    ),

    // Log entries
    ...events.value.map((event, index) =>
      renderLogEntry(event, index === selectedIndex.value, { showTimestamp, showLevel })
    ),
  ])
}

function renderLogEntry(
  event: DebugEvent,
  isSelected: boolean,
  options: { showTimestamp: boolean; showLevel: boolean }
): View {
  const levelColor = Colors[LEVEL_COLORS[event.level] as keyof typeof Colors]
  const icon = CATEGORY_ICONS[event.category] || '•'

  const parts: View[] = []

  if (options.showTimestamp) {
    parts.push(text(event.timestamp.toLocaleTimeString(), { color: Colors.gray }))
    parts.push(text(' '))
  }

  // Category icon
  parts.push(text(icon))
  parts.push(text(' '))

  if (options.showLevel) {
    parts.push(text(event.level.toUpperCase().padEnd(5), { color: levelColor }))
    parts.push(text(' '))
  }

  // Message
  parts.push(text(event.message))

  // Context info
  if (event.context?.componentName) {
    parts.push(text(` [${event.context.componentName}]`, { color: Colors.gray }))
  }

  if (event.context?.duration !== undefined) {
    parts.push(text(` ${event.context.duration.toFixed(2)}ms`, { color: Colors.green }))
  }

  return box(
    {
      style: {
        padding: { left: 1 },
        backgroundColor: isSelected ? Colors.blue : undefined,
        color: isSelected ? Colors.white : undefined,
      },
    },
    [hstack(parts)]
  )
}

/**
 * Create a filtered debug log view
 */
export function createDebugLog(options: DebugLogsProps = {}) {
  return <DebugLogs {...options} />
}
