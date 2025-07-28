/**
 * Debug Toolbar Component
 *
 * Tab navigation toolbar
 */

import { hstack, text } from '@core/view'
import type { DebugTab } from '../../types'

interface DebugToolbarProps {
  activeTab: DebugTab
  onTabChange: (tab: DebugTab) => void
}

export function DebugToolbar({ activeTab, onTabChange }: DebugToolbarProps) {
  const tabs: Array<{ key: DebugTab; label: string }> = [
    { key: 'scopes', label: 'Scopes' },
    { key: 'events', label: 'Events' },
    { key: 'performance', label: 'Performance' },
    { key: 'state', label: 'State' },
  ]

  return hstack({
    gap: 2,
    children: tabs.map((tab, i) =>
      text({
        style: {
          color: activeTab === tab.key ? 'white' : 'gray',
          bold: activeTab === tab.key,
        },
        children: `[${i + 1}] ${tab.label}`,
      })
    ),
  })
}
