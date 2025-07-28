/**
 * Debug Overview Tab
 */

import { text, vstack } from '@core/view'
import { Colors } from '@core/terminal/ansi/styles'
import { scopeManager } from '@core/model/scope/manager'
import { debugStore } from '../../../core/store'
import type { View } from '@core/types'
import type { ScopeDef } from '@core/model/scope/types'

export function DebugOverview(): View {
  const state = debugStore.getState()
  const scopes = scopeManager.getAllScopes()
  const matchedScopes = findMatchedScopes(state.commandPath)

  // Count events by category
  const eventCounts = state.events.reduce(
    (acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return vstack([
    text('📊 Debug Overview', { color: Colors.cyan, bold: true }),
    text(''),
    text(`Command Path: ${state.commandPath.join(' → ') || '(root)'}`),
    text(`Total Scopes: ${scopes.length}`),
    text(`Matched Scopes: ${matchedScopes.length}`),
    text(''),
    text('Event Summary:', { color: Colors.yellow }),
    ...Object.entries(eventCounts).map(([category, count]) =>
      text(`  ${category}: ${count} events`)
    ),
    text(''),
    text('Matched Scope Chain:', { color: Colors.yellow }),
    ...matchedScopes.map((scope, i) =>
      text(`  ${' '.repeat(i * 2)}→ ${scope.name} [${scope.type}]`)
    ),
    text(''),
    text(`Total Events: ${state.events.length}`),
    text(`Recording: ${state.paused ? 'PAUSED' : 'ACTIVE'}`, {
      color: state.paused ? Colors.yellow : Colors.green,
    }),
  ])
}

function findMatchedScopes(commandPath: string[]) {
  const scopes = scopeManager.getAllScopes()
  const matched: ScopeDef[] = []

  // Find root
  const root = scopes.find(s => s.type === 'cli')
  if (root) matched.push(root)

  // Find each segment
  let currentPath: string[] = []
  for (const segment of commandPath) {
    currentPath.push(segment)
    const scope = scopes.find(
      s =>
        s.path.join('/') === currentPath.join('/') ||
        (s.name === segment && s.path.length === currentPath.length)
    )
    if (scope) matched.push(scope)
  }

  return matched
}
