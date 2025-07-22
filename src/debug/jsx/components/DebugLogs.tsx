/**
 * DebugLogs Component
 * 
 * Standalone component for viewing debug logs
 */

import { useState, useEffect } from 'react'
import { box, text, vstack, hstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { debugStore } from '../../core/store'
import type { DebugEvent } from '../../types'
import { CATEGORY_ICONS, LEVEL_COLORS } from '../../constants'
import { useInput } from '@core/hooks/useInput'
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
  filter
}: DebugLogsProps = {}) {
  const [events, setEvents] = useState<DebugEvent[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  // Subscribe to store updates
  useEffect(() => {
    const updateEvents = () => {
      let filtered = debugStore.getFilteredEvents()
      
      if (category) {
        filtered = filtered.filter(e => e.category === category)
      }
      
      if (filter) {
        const lowerFilter = filter.toLowerCase()
        filtered = filtered.filter(e => 
          e.message.toLowerCase().includes(lowerFilter) ||
          JSON.stringify(e.data).toLowerCase().includes(lowerFilter)
        )
      }
      
      setEvents(filtered.slice(-maxItems))
    }
    
    updateEvents()
    return debugStore.subscribe(updateEvents)
  }, [category, maxItems, filter])
  
  // Keyboard navigation
  useInput((key) => {
    switch (key) {
      case 'ArrowUp':
        setSelectedIndex(Math.max(0, selectedIndex - 1))
        break
      case 'ArrowDown':
        setSelectedIndex(Math.min(events.length - 1, selectedIndex + 1))
        break
      case 'Enter':
        if (events[selectedIndex]) {
          debugStore.setSelectedEvent(events[selectedIndex].id)
        }
        break
    }
  })
  
  return vstack([
    // Header
    box({
      style: {
        borderColor: Colors.gray,
        borderStyle: 'single',
        padding: { left: 1, right: 1 }
      }
    }, [
      hstack([
        text('📝 Debug Logs', { color: Colors.cyan }),
        text(` (${events.length} events)`, { color: Colors.gray })
      ])
    ]),
    
    // Log entries
    ...events.map((event, index) => 
      renderLogEntry(event, index === selectedIndex, { showTimestamp, showLevel })
    )
  ])
}

function renderLogEntry(
  event: DebugEvent,
  isSelected: boolean,
  options: { showTimestamp: boolean, showLevel: boolean }
): View {
  const levelColor = Colors[LEVEL_COLORS[event.level] as keyof typeof Colors]
  const icon = CATEGORY_ICONS[event.category] || '•'
  
  const parts: View[] = []
  
  if (options.showTimestamp) {
    parts.push(text(
      event.timestamp.toLocaleTimeString(), 
      { color: Colors.gray }
    ))
    parts.push(text(' '))
  }
  
  // Category icon
  parts.push(text(icon))
  parts.push(text(' '))
  
  if (options.showLevel) {
    parts.push(text(
      event.level.toUpperCase().padEnd(5),
      { color: levelColor }
    ))
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
  
  return box({
    style: {
      padding: { left: 1 },
      backgroundColor: isSelected ? Colors.blue : undefined,
      color: isSelected ? Colors.white : undefined
    }
  }, [
    hstack(parts)
  ])
}

/**
 * Create a filtered debug log view
 */
export function createDebugLog(options: DebugLogsProps = {}) {
  return <DebugLogs {...options} />
}