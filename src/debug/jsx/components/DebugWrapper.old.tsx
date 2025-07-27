/**
 * Debug Wrapper Component
 * 
 * Main debug UI wrapper that intercepts logs and output, routing them to tabs
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
  // Track active tab
  const activeTab = $state<ExtendedDebugTab>('app')
  
  // Track visibility
  const isVisible = $state(true)
  
  // Store intercepted output
  const logs = $state<string[]>([])
  const output = $state<string[]>([])
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = debugStore.subscribe((state) => {
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
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      logs.value = [...logs.value, `[LOG] ${message}`]
      // Only write to original if not in app view
      if (activeTab.value !== 'app') {
        originalConsoleLog(...args)
      }
    }
    
    console.error = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      logs.value = [...logs.value, `[ERROR] ${message}`]
      if (activeTab.value !== 'app') {
        originalConsoleError(...args)
      }
    }
    
    console.warn = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      logs.value = [...logs.value, `[WARN] ${message}`]
      if (activeTab.value !== 'app') {
        originalConsoleWarn(...args)
      }
    }
    
    console.info = (...args: unknown[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      logs.value = [...logs.value, `[INFO] ${message}`]
      if (activeTab.value !== 'app') {
        originalConsoleInfo(...args)
      }
    }
    
    // Intercept stdout/stderr
    process.stdout.write = function(chunk: string | Uint8Array, ...args: unknown[]): boolean {
      const str = chunk?.toString() || ''
      // Filter out debug output to prevent recursion
      if (!str.includes('[TUIX DEBUG]') && 
          !str.includes('[DebugWrapper]') &&
          !str.includes('DEBUG MODE') &&
          !str.includes('Registered Scopes:')) {
        output.value = [...output.value, str]
      }
      // Only write to original if not in app view
      if (activeTab.value !== 'app') {
        return originalStdoutWrite(chunk, ...args)
      }
      return true
    }
    
    process.stderr.write = function(chunk: string | Uint8Array, ...args: unknown[]): boolean {
      const str = chunk?.toString() || ''
      output.value = [...output.value, `[STDERR] ${str}`]
      // Only write to original if not in app view
      if (activeTab.value !== 'app') {
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
      switch (keyStr) {
        case 'd':
        case 'D':
          isVisible.value = !isVisible.value
          break
        case '1':
          activeTab.value = 'app'
          break
        case '2':
          activeTab.value = 'logs'
          break
        case '3':
          activeTab.value = 'output'
          break
        case '4':
          activeTab.value = 'scopes'
          break
        case '5':
          activeTab.value = 'events'
          break
        case '6':
          activeTab.value = 'performance'
          break
        case '7':
          activeTab.value = 'state'
          break
        case 'c':
        case 'C':
          // Clear current view
          if (activeTab.value === 'logs') {
            logs.value = []
          } else if (activeTab.value === 'output') {
            output.value = []
          }
          break
        case 'q':
        case 'Q':
          // Use proper shutdown through Interactive module
          import('@core/runtime/interactive').then(({ Interactive }) => {
            Effect.runSync(Interactive.exit(0))
          })
          break
      }
    }
    
    process.stdin.on('data', handleKey)
    return () => process.stdin.off('data', handleKey)
  })
  
  if (!isVisible.value) {
    return children || empty
  }
  
  // Create tab bar
  const tabBar = hstack(
    text(activeTab.value === 'app' ? '[1] App' : ' 1  App '),
    text(activeTab.value === 'logs' ? `[2] Logs (${logs.value.length})` : ` 2  Logs (${logs.value.length}) `),
    text(activeTab.value === 'output' ? `[3] Output (${output.value.length})` : ` 3  Output (${output.value.length}) `),
    text(activeTab.value === 'scopes' ? '[4] Scopes' : ' 4  Scopes '),
    text(activeTab.value === 'events' ? '[5] Events' : ' 5  Events '),
    text(activeTab.value === 'performance' ? '[6] Perf' : ' 6  Perf '),
    text(activeTab.value === 'state' ? '[7] State' : ' 7  State ')
  )
  
  // Create tab content based on active tab
  let tabContent: View = empty
  
  if (activeTab.value === 'app') {
    tabContent = vstack(
      text('Application Output'),
      text('Your app renders here. Press 2-7 to view debug info.'),
      text(''),
      children || empty
    )
  } else if (activeTab.value === 'logs') {
    const recentLogs = logs.value.slice(-20)
    tabContent = vstack(
      text(`Console Logs (${logs.value.length} total)`),
      text(''),
      ...recentLogs.map(log => text(log))
    )
  } else if (activeTab.value === 'output') {
    const fullOutput = output.value.join('')
    const lines = fullOutput.split('\n').slice(-20)
    tabContent = vstack(
      text(`Process Output (${lines.length} lines)`),
      text(''),
      ...lines.map(line => text(line))
    )
  } else if (activeTab.value === 'scopes') {
    tabContent = text('Scopes view not implemented yet')
  } else if (activeTab.value === 'events') {
    tabContent = text('Events view not implemented yet')
  } else if (activeTab.value === 'performance') {
    tabContent = text('Performance view not implemented yet')
  } else if (activeTab.value === 'state') {
    tabContent = text('State view not implemented yet')
  }
  
  // Status bar
  const statusBar = hstack(
    text('D: toggle | 1-7: tabs | C: clear logs/output | Q: quit'),
    spacer(),
    text(`Debug Mode: ${activeTab.value}`)
  )
  
  // Return the debug panel
  return vstack(
    box(
      vstack(
        tabBar,
        text(''),
        box(tabContent),
        text(''),
        statusBar
      )
    )
  )
}