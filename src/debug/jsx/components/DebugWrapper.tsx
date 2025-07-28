/**
 * Debug Wrapper Component
 *
 * Main debug UI wrapper that intercepts logs and output, routing them to tabs
 * Uses debugWrapperStore for state management
 */

import { $effect } from '@core/update/reactivity/runes'
import { debugStore } from '../../core/store'
import { debugWrapperStore } from '../stores/debugWrapperStore'
import { box, vstack, hstack, text, empty } from '@core/view'
import { spacer } from '@core/view/layout'
import type { View } from '@core/types'
import { Effect } from 'effect'

interface DebugWrapperProps {
  children?: View
}

export function DebugWrapper({ children }: DebugWrapperProps): View {
  // Use debug wrapper store for state management

  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = debugStore.subscribe(state => {
      // Track state changes silently
    })

    return () => unsubscribe()
  })

  // Intercept console.log and stdout
  $effect(() => {
    // Store original functions
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    const originalConsoleInfo = console.info
    const originalStdoutWrite = process.stdout.write.bind(process.stdout)
    const originalStderrWrite = process.stderr.write.bind(process.stderr)

    // Intercept console methods
    console.log = (...args: unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      debugWrapperStore.addLog(`[LOG] ${message}`)
      // Only write to original if not in app view
      if (debugWrapperStore.activeTab !== 'app') {
        originalConsoleLog(...args)
      }
    }

    console.error = (...args: unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      debugWrapperStore.addLog(`[ERROR] ${message}`)
      if (debugWrapperStore.activeTab !== 'app') {
        originalConsoleError(...args)
      }
    }

    console.warn = (...args: unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      debugWrapperStore.addLog(`[WARN] ${message}`)
      if (debugWrapperStore.activeTab !== 'app') {
        originalConsoleWarn(...args)
      }
    }

    console.info = (...args: unknown[]) => {
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      debugWrapperStore.addLog(`[INFO] ${message}`)
      if (debugWrapperStore.activeTab !== 'app') {
        originalConsoleInfo(...args)
      }
    }

    // Intercept stdout/stderr
    process.stdout.write = function (chunk: string | Uint8Array, ...args: unknown[]): boolean {
      const str = chunk?.toString() || ''
      // Filter out debug output to prevent recursion
      if (
        !str.includes('[TUIX DEBUG]') &&
        !str.includes('[DebugWrapper]') &&
        !str.includes('DEBUG MODE') &&
        !str.includes('Registered Scopes:')
      ) {
        debugWrapperStore.addOutput(str)
      }
      // Only write to original if not in app view
      if (debugWrapperStore.activeTab !== 'app') {
        return originalStdoutWrite(chunk, ...args)
      }
      return true
    }

    process.stderr.write = function (chunk: string | Uint8Array, ...args: unknown[]): boolean {
      const str = chunk?.toString() || ''
      debugWrapperStore.addOutput(`[STDERR] ${str}`)
      // Only write to original if not in app view
      if (debugWrapperStore.activeTab !== 'app') {
        return originalStderrWrite(chunk, ...args)
      }
      return true
    }

    // Cleanup on unmount
    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      console.info = originalConsoleInfo
      process.stdout.write = originalStdoutWrite
      process.stderr.write = originalStderrWrite
    }
  })

  // Keyboard handler
  $effect(() => {
    const handleKey = (key: Buffer) => {
      const keyStr = key.toString()

      // Handle quit separately since it's not in the store
      if (keyStr === 'q' || keyStr === 'Q') {
        import('@core/runtime/interactive').then(({ Interactive }) => {
          Effect.runSync(Interactive.exit(0))
        })
        return
      }

      // Use store to handle other keys
      debugWrapperStore.handleKeypress(keyStr)
    }

    process.stdin.on('data', handleKey)
    return () => process.stdin.off('data', handleKey)
  })

  if (!debugWrapperStore.isVisible) {
    return children || empty
  }

  // Create tab bar
  const tabBar = hstack(
    text(debugWrapperStore.getTabDisplay('app')),
    text(debugWrapperStore.getTabDisplay('logs')),
    text(debugWrapperStore.getTabDisplay('output')),
    text(debugWrapperStore.getTabDisplay('scopes')),
    text(debugWrapperStore.getTabDisplay('events')),
    text(debugWrapperStore.getTabDisplay('performance')),
    text(debugWrapperStore.getTabDisplay('state'))
  )

  // Create tab content based on active tab
  let tabContent: View = empty

  if (debugWrapperStore.activeTab === 'app') {
    tabContent = vstack(
      text('Application Output'),
      text('Your app renders here. Press 2-7 to view debug info.'),
      text(''),
      children || empty
    )
  } else if (debugWrapperStore.activeTab === 'logs') {
    const recentLogs = debugWrapperStore.getRecentLogs(20)
    tabContent = vstack(
      text(`Console Logs (${debugWrapperStore.logCount} total)`),
      text(''),
      ...recentLogs.map(log => text(log))
    )
  } else if (debugWrapperStore.activeTab === 'output') {
    const lines = debugWrapperStore.getRecentOutput(20)
    tabContent = vstack(
      text(`Process Output (${lines.length} lines)`),
      text(''),
      ...lines.map(line => text(line))
    )
  } else if (debugWrapperStore.activeTab === 'scopes') {
    tabContent = text('Scopes view not implemented yet')
  } else if (debugWrapperStore.activeTab === 'events') {
    tabContent = text('Events view not implemented yet')
  } else if (debugWrapperStore.activeTab === 'performance') {
    tabContent = text('Performance view not implemented yet')
  } else if (debugWrapperStore.activeTab === 'state') {
    tabContent = text('State view not implemented yet')
  }

  // Status bar
  const statusBar = hstack(
    text('D: toggle | 1-7: tabs | C: clear logs/output | Q: quit'),
    spacer(),
    text(`Debug Mode: ${debugWrapperStore.activeTab}`)
  )

  // Return the debug panel
  return vstack(box(vstack(tabBar, text(''), box(tabContent), text(''), statusBar)))
}
