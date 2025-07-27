/**
 * Rich Debug Interface Component
 * 
 * A proper Bubbletea-inspired TUI debug interface that follows the TUIX architecture
 */

import { $state, $derived, $effect } from '@core/update/reactivity/runes'
import { vstack, hstack, text, box, empty } from '@core/view'
import { scopeManager } from '@core/model/scope/manager'
import { LargeText } from '@ui/components/display/large-text'
import { Button } from '@ui/components/forms/button/Button'
import { Modal } from '@ui/components/feedback/modal/Modal'
import { Flex } from '@ui/components/layout/flex/Flex'
import { spacer } from '@core/view/layout'
import type { View } from '@core/types'
import type { ViewTreeNode, UpdateEvent, ScopeInfo, ComponentInfo } from '../../tea/DebugApp'

interface DebugState {
  activeTab: 'app' | 'logs' | 'model' | 'view' | 'update' | 'cli' | 'jsx'
  logs: string[]
  modelState: unknown
  viewTree: ViewTreeNode[]
  updateHistory: UpdateEvent[]
  cliScopes: ScopeInfo[]
  jsxComponents: ComponentInfo[]
  performance: {
    renderTime: number
    updateCount: number
    lastRender: Date
  }
}

interface RichDebugInterfaceProps {
  children?: View
  initialState?: Partial<DebugState>
}

export function RichDebugInterface({ 
  children = empty, 
  initialState = {} 
}: RichDebugInterfaceProps): View {
  
  // Reactive debug state using TUIX runes
  const debugState = $state<DebugState>({
    activeTab: 'app',
    logs: [],
    modelState: null,
    viewTree: [],
    updateHistory: [],
    cliScopes: [],
    jsxComponents: [],
    performance: {
      renderTime: 0,
      updateCount: 0,
      lastRender: new Date()
    },
    ...initialState
  })
  
  // Derived state for computed values
  const activeScopes = $derived(() => scopeManager.getAllScopes())
  const tabCount = $derived(() => ({
    logs: debugState.logs.length,
    scopes: activeScopes.length,
    components: debugState.jsxComponents.length,
    updates: debugState.updateHistory.length
  }))
  
  // Effects for real-time data updates
  $effect(() => {
    // Update performance metrics
    debugState.performance.lastRender = new Date()
    debugState.performance.updateCount += 1
  })
  
  // Header with TUIX logo and debug badge
  const header = vstack(
    hstack(
      LargeText({
        content: 'TUIX',
        gradient: { from: '#00d4ff', to: '#ff00d4' },
        style: 'bold'
      }),
      spacer(),
      box({
        border: 'single',
        borderColor: 'yellow',
        padding: { horizontal: 1 }
      }, [
        text('DEBUG')
      ])
    ),
    box({
      border: 'single',
      borderColor: 'blue',
      width: '100%',
      height: 1
    }, [empty])
  )
  
  // Tab navigation buttons
  const tabButtons = hstack(
    Button({
      content: `App${debugState.activeTab === 'app' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'app' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'app'
    }),
    Button({
      content: `Logs (${tabCount.logs})${debugState.activeTab === 'logs' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'logs' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'logs'
    }),
    Button({
      content: `Model${debugState.activeTab === 'model' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'model' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'model'
    }),
    Button({
      content: `View${debugState.activeTab === 'view' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'view' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'view'
    }),
    Button({
      content: `Update (${tabCount.updates})${debugState.activeTab === 'update' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'update' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'update'
    }),
    Button({
      content: `CLI (${tabCount.scopes})${debugState.activeTab === 'cli' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'cli' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'cli'
    }),
    Button({
      content: `JSX (${tabCount.components})${debugState.activeTab === 'jsx' ? ' ●' : ''}`,
      variant: debugState.activeTab === 'jsx' ? 'primary' : 'secondary',
      size: 'sm',
      onClick: () => debugState.activeTab = 'jsx'
    })
  )
  
  // Main content area based on active tab
  const getTabContent = (): View => {
    switch (debugState.activeTab) {
      case 'app':
        return box({
          border: 'double',
          borderColor: 'green',
          title: 'Application View',
          padding: 1
        }, [
          vstack(
            text('🎯 Your application renders here:'),
            text(''),
            children,
            text(''),
            text('💡 Switch tabs to explore debug information')
          )
        ])
        
      case 'logs':
        return box({
          border: 'single',
          borderColor: 'yellow',
          title: `Console Logs (${debugState.logs.length})`,
          padding: 1
        }, [
          vstack(
            text('📋 Recent log entries:'),
            text(''),
            ...debugState.logs.slice(-15).map((log, i) => 
              hstack(
                text(`${i + 1}.`.padStart(3)),
                text(log)
              )
            ),
            debugState.logs.length === 0 ? text('(No logs captured yet)') : empty
          )
        ])
        
      case 'model':
        return box({
          border: 'single',
          borderColor: 'blue',
          title: 'MVU Model State',
          padding: 1
        }, [
          vstack(
            text('🏗️  Current application state:'),
            text(''),
            debugState.modelState ? 
              text(JSON.stringify(debugState.modelState, null, 2)) :
              text('(No model state captured)'),
            text(''),
            hstack(
              text('Performance: '),
              text(`${debugState.performance.renderTime}ms render, ${debugState.performance.updateCount} updates`)
            )
          )
        ])
        
      case 'view':
        return box({
          border: 'single',
          borderColor: 'magenta',
          title: 'View Tree Structure',
          padding: 1
        }, [
          vstack(
            text('🌳 Component hierarchy:'),
            text(''),
            ...debugState.viewTree.map(node => text(`- ${node.type} (${node.id})`)),
            debugState.viewTree.length === 0 ? text('(No view tree captured)') : empty
          )
        ])
        
      case 'update':
        return box({
          border: 'single',
          borderColor: 'cyan',
          title: `Update History (${debugState.updateHistory.length})`,
          padding: 1
        }, [
          vstack(
            text('⚡ Recent state updates:'),
            text(''),
            ...debugState.updateHistory.slice(-10).map((update, i) => 
              vstack(
                text(`${i + 1}. ${update.type || 'Update'}`),
                text(`   Duration: ${update.duration}ms`),
                text('')
              )
            ),
            debugState.updateHistory.length === 0 ? text('(No updates captured)') : empty
          )
        ])
        
      case 'cli':
        return box({
          border: 'single',
          borderColor: 'red',
          title: `CLI Scopes (${activeScopes.length})`,
          padding: 1
        }, [
          vstack(
            text('⌨️  Active command scopes:'),
            text(''),
            ...activeScopes.map(scope => 
              vstack(
                text(`• ${scope.id}`),
                text(`  Path: ${scope.path || '/'}`),
                text(`  Commands: ${scope.commands?.length || 0}`),
                text('')
              )
            ),
            activeScopes.length === 0 ? text('(No scopes registered)') : empty
          )
        ])
        
      case 'jsx':
        return box({
          border: 'single',
          borderColor: 'white',
          title: `JSX Components (${debugState.jsxComponents.length})`,
          padding: 1
        }, [
          vstack(
            text('⚛️  Rendered JSX components:'),
            text(''),
            ...debugState.jsxComponents.map(component => 
              text(`- ${component.name} (${component.props?.length || 0} props)`)
            ),
            debugState.jsxComponents.length === 0 ? text('(No components tracked)') : empty
          )
        ])
        
      default:
        return text('Unknown tab')
    }
  }
  
  // Footer with status and controls
  const footer = box({
    border: 'single',
    borderColor: 'gray',
    width: '100%'
  }, [
    hstack(
      text('🔍 Debug Mode Active'),
      spacer(),
      text(`Tab: ${debugState.activeTab}`),
      spacer(),
      text(`Updated: ${debugState.performance.lastRender.toLocaleTimeString()}`),
      spacer(),
      text('Q: Quit | R: Refresh | C: Clear')
    )
  ])
  
  // Complete layout
  return Flex({
    direction: 'column',
    height: '100%'
  }, [
    header,
    box({ padding: { vertical: 1 } }, [tabButtons]),
    Flex({
      direction: 'column',
      flex: 1
    }, [
      getTabContent()
    ]),
    footer
  ])
}