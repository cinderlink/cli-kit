/**
 * FilterBox Component
 * 
 * A reusable filtering UI component with preset filters and search
 * Can be used for logs, processes, and any filterable content
 */

import { Effect } from "effect"
import type { View } from "../../core/types"
import { View as ViewUtils } from "../../core"
import { style, Colors } from "../../styling"

const { vstack, hstack, text, styledText } = ViewUtils

export interface FilterPreset {
  readonly name: string
  readonly label: string
  readonly icon?: string
  readonly filter: (item: any) => boolean
}

export interface FilterBoxProps {
  readonly title?: string
  readonly presets?: ReadonlyArray<FilterPreset>
  readonly activePreset?: string
  readonly searchTerm?: string
  readonly onPresetChange?: (preset: string | null) => void
  readonly onSearchChange?: (term: string) => void
  readonly showSearch?: boolean
  readonly searchPlaceholder?: string
  readonly compact?: boolean
}

/**
 * FilterBox component for filtering UI
 */
export const FilterBox = (props: FilterBoxProps): View => {
  const {
    title = "Filters",
    presets = [],
    activePreset,
    searchTerm = "",
    showSearch = true,
    searchPlaceholder = "Search...",
    compact = false
  } = props

  const content = compact ? (
    // Compact horizontal layout
    hstack(
      // Presets
      presets.length > 0 && hstack(
        styledText("Filter: ", style().foreground(Colors.gray)),
        ...presets.map(preset => 
          styledText(
            `${preset.icon || '•'} ${preset.label}`,
            style()
              .foreground(activePreset === preset.name ? Colors.cyan : Colors.gray)
              .bold(activePreset === preset.name)
          )
        ).reduce((acc, item, i) => 
          i === 0 ? [item] : [...acc, text(" | "), item], 
          [] as View[]
        )
      ),
      
      // Search
      showSearch && hstack(
        text("  "),
        text("🔍 "),
        searchTerm 
          ? styledText(searchTerm, style().foreground(Colors.yellow))
          : styledText(searchPlaceholder, style().foreground(Colors.gray).italic())
      )
    )
  ) : (
    // Full layout
    vstack(
      // Preset buttons
      presets.length > 0 && vstack(
        styledText("Quick Filters:", style().foreground(Colors.cyan).bold()),
        text(""),
        ...presets.map(preset => 
          hstack(
            styledText(
              activePreset === preset.name ? "▶" : " ",
              style().foreground(activePreset === preset.name ? Colors.green : Colors.gray)
            ),
            text(preset.icon || "•"),
            styledText(
              preset.label,
              style()
                .foreground(activePreset === preset.name ? Colors.cyan : Colors.white)
                .bold(activePreset === preset.name)
            )
          )
        )
      ),
      
      // Search box
      showSearch && hstack(
        text("🔍"),
        searchTerm 
          ? styledText(searchTerm, style().foreground(Colors.yellow))
          : styledText(searchPlaceholder, style().foreground(Colors.gray).italic())
      )
    )
  )

  return content
}

/**
 * Preset filter configurations for common use cases
 */
export const LOG_FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'errors',
    label: 'Errors Only',
    icon: '❌',
    filter: (log: any) => log.level === 'error' || log.level === 'fatal'
  },
  {
    name: 'warnings',
    label: 'Warnings & Errors',
    icon: '⚠️',
    filter: (log: any) => ['warn', 'error', 'fatal'].includes(log.level)
  },
  {
    name: 'debug',
    label: 'Debug & Above',
    icon: '🔍',
    filter: (log: any) => log.level !== 'trace'
  },
  {
    name: 'recent',
    label: 'Last 5 minutes',
    icon: '🕐',
    filter: (log: any) => Date.now() - log.timestamp.getTime() < 5 * 60 * 1000
  }
]

export const PROCESS_FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'running',
    label: 'Running Only',
    icon: '🟢',
    filter: (proc: any) => proc.status === 'running'
  },
  {
    name: 'stopped',
    label: 'Stopped Only',
    icon: '⚪',
    filter: (proc: any) => proc.status === 'stopped'
  },
  {
    name: 'errors',
    label: 'Errors Only',
    icon: '🔴',
    filter: (proc: any) => proc.status === 'error'
  },
  {
    name: 'active',
    label: 'Active (Running/Starting)',
    icon: '⚡',
    filter: (proc: any) => ['running', 'starting'].includes(proc.status)
  }
]

/**
 * Combined filter and content display
 */
export interface FilterableContentProps<T> {
  readonly items: ReadonlyArray<T>
  readonly renderItem: (item: T, index: number) => View
  readonly filters?: FilterPreset[]
  readonly searchFields?: (keyof T)[]
  readonly title?: string
  readonly emptyMessage?: string
}

export const FilterableContent = <T extends Record<string, any>>(
  props: FilterableContentProps<T>
): View => {
  const {
    items,
    renderItem,
    filters = [],
    searchFields = [],
    title = "Filterable Content",
    emptyMessage = "No items match the current filters"
  } = props

  // In a real implementation, this would be stateful
  // For now, we'll just show the UI structure
  const filteredItems = items

  return vstack(
    // Filter controls
    FilterBox({
      presets: filters,
      compact: true,
      showSearch: searchFields.length > 0
    }),
    
    text(""),
    styledText("─".repeat(80), style().foreground(Colors.gray)),
    text(""),
    
    // Content
    filteredItems.length === 0 ? (
      styledText(emptyMessage, style().foreground(Colors.yellow))
    ) : (
      vstack(...filteredItems.map(renderItem))
    ),
    
    // Status bar
    text(""),
    hstack(
      styledText(`Showing ${filteredItems.length} of ${items.length} items`, style().foreground(Colors.gray))
    )
  )
}