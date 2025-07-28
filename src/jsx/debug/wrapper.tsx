/**
 * Debug Wrapper for JSX Applications
 *
 * Provides debug UI when TUIX_DEBUG=true without using runes
 * to avoid component context issues
 */

import { jsx } from '../runtime'
import { vstack, hstack, text, box } from '@core/view'
import { scopeManager } from '@core/model/scope/manager'
import { debugStore, debug } from '../../debug/core/store'
import type { View } from '@core/types'
import type { JSX } from '../runtime'

export interface DebugWrapperProps {
  children: JSX.Element | JSX.Element[]
}

/**
 * Debug wrapper that provides debug information without using runes
 * This is used when TUIX_DEBUG=true to show debug UI
 */
export function DebugWrapper({ children }: DebugWrapperProps): JSX.Element {
  // Log debug activation
  debug.system('Debug wrapper active')

  // Get current debug state
  const scopes = scopeManager.getAllScopes()
  const commandScopes = scopes.filter(s => s.type === 'command')
  const pluginScopes = scopes.filter(s => s.type === 'plugin')

  // Create debug header
  const header = jsx(
    'box',
    {
      border: 'double',
      borderColor: 'cyan',
      padding: { horizontal: 1 },
    },
    jsx(
      'hstack',
      {},
      jsx(
        'text',
        {
          style: {
            bold: true,
            color: 'cyan',
            backgroundColor: 'black',
          },
        },
        '🔍 TUIX DEBUG'
      ),
      jsx('text', {}, ' | '),
      jsx(
        'text',
        { style: { dim: true } },
        `Commands: ${commandScopes.length} | Plugins: ${pluginScopes.length} | Total Scopes: ${scopes.length}`
      )
    )
  )

  // Create debug info panel
  const debugInfo = jsx(
    'box',
    {
      border: 'single',
      borderColor: 'gray',
      padding: 1,
    },
    jsx(
      'vstack',
      {},
      jsx('text', { style: { bold: true } }, 'Debug Information'),
      jsx('text', {}, ''),
      jsx('text', {}, `Process: ${process.pid}`),
      jsx('text', {}, `Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`),
      jsx('text', {}, `Uptime: ${Math.round(process.uptime())}s`),
      jsx('text', {}, ''),
      jsx('text', { style: { dim: true } }, 'Press Ctrl+C to exit')
    )
  )

  // Create main layout
  return jsx('vstack', {}, header, jsx('hstack', {}, jsx('box', { flex: 1 }, children), debugInfo))
}
