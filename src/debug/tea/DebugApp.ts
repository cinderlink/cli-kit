/**
 * TEA-based Debug Application
 * 
 * Proper MVU architecture for the debug interface following TUIX patterns
 */

import { Effect } from 'effect'
import { scopeManager } from '@core/model/scope/manager'
import { EventBus } from '@core/model/events/eventBus'
import type { Component } from '@core/types'
import type { View } from '@core/types'
import type { JSXElement } from '@jsx/types'
import { RichDebugInterface } from '../jsx/components/RichDebugInterface'

// Debug Model - the complete state of our debug application
export interface DebugModel {
  activeTab: 'app' | 'logs' | 'model' | 'view' | 'update' | 'cli' | 'jsx'
  logs: DebugLog[]
  modelState: unknown
  viewTree: ViewTreeNode[]
  updateHistory: UpdateEvent[]
  cliScopes: ScopeInfo[]
  jsxComponents: ComponentInfo[]
  performance: PerformanceMetrics
  appComponent: (() => JSXElement) | JSXElement | null
  commandOutput: string
  commandError: string | null
  commandExecuting: boolean
}

// Supporting types
export interface DebugLog {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  source: string
  data?: unknown
}

export interface ViewTreeNode {
  id: string
  type: string
  props: Record<string, unknown>
  children: ViewTreeNode[]
  depth: number
}

export interface UpdateEvent {
  id: string
  timestamp: Date
  type: string
  previousState: unknown
  newState: unknown
  duration: number
}

export interface ScopeInfo {
  id: string
  path: string
  commands: string[]
  active: boolean
  parent?: string
}

export interface ComponentInfo {
  id: string
  name: string
  props: Record<string, unknown>
  state: unknown
  renderTime: number
}

export interface PerformanceMetrics {
  renderTime: number
  updateCount: number
  lastRender: Date
  memoryUsage: number
  cpuUsage: number
}

// Debug Messages - all possible actions in our debug application
export type DebugMsg = 
  | { _tag: 'SwitchTab'; tab: DebugModel['activeTab'] }
  | { _tag: 'AddLog'; log: DebugLog }
  | { _tag: 'UpdateModelState'; state: unknown }
  | { _tag: 'UpdateViewTree'; tree: ViewTreeNode[] }
  | { _tag: 'AddUpdateEvent'; event: UpdateEvent }
  | { _tag: 'RefreshScopes' }
  | { _tag: 'RefreshComponents' }
  | { _tag: 'UpdatePerformance'; metrics: Partial<PerformanceMetrics> }
  | { _tag: 'ExecuteCommand' }
  | { _tag: 'CommandComplete'; output: string }
  | { _tag: 'CommandError'; error: string }
  | { _tag: 'ClearLogs' }
  | { _tag: 'ClearHistory' }
  | { _tag: 'Refresh' }

// Commands - side effects that our debug application can trigger
export type DebugCommand = Effect.Effect<DebugMsg>

// Initial state
export const initDebugModel = (appComponent?: (() => JSXElement) | JSXElement): DebugModel => ({
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
    lastRender: new Date(),
    memoryUsage: 0,
    cpuUsage: 0
  },
  appComponent: appComponent || null,
  commandOutput: '',
  commandError: null,
  commandExecuting: false
})

// Update function - pure state transitions
export const updateDebugModel = (
  msg: DebugMsg, 
  model: DebugModel
): Effect.Effect<[DebugModel, DebugCommand[]]> => {
  return Effect.gen(function* () {
    const startTime = Date.now()
    
    let newModel: DebugModel
    let commands: DebugCommand[] = []
    
    switch (msg._tag) {
      case 'SwitchTab':
        newModel = {
          ...model,
          activeTab: msg.tab
        }
        
        // Load data for the new tab if needed
        if (msg.tab === 'cli') {
          commands.push(Effect.succeed({ _tag: 'RefreshScopes' }))
        } else if (msg.tab === 'jsx') {
          commands.push(Effect.succeed({ _tag: 'RefreshComponents' }))
        }
        break
        
      case 'AddLog':
        newModel = {
          ...model,
          logs: [...model.logs.slice(-1000), msg.log] // Keep last 1000 logs
        }
        break
        
      case 'UpdateModelState':
        newModel = {
          ...model,
          modelState: msg.state,
          updateHistory: [
            ...model.updateHistory.slice(-100), // Keep last 100 updates
            {
              id: `update-${Date.now()}`,
              timestamp: new Date(),
              type: 'ModelUpdate',
              previousState: model.modelState,
              newState: msg.state,
              duration: Date.now() - startTime
            }
          ]
        }
        break
        
      case 'UpdateViewTree':
        newModel = {
          ...model,
          viewTree: msg.tree
        }
        break
        
      case 'AddUpdateEvent':
        newModel = {
          ...model,
          updateHistory: [...model.updateHistory.slice(-100), msg.event]
        }
        break
        
      case 'RefreshScopes':
        const scopes = scopeManager.getAllScopes()
        newModel = {
          ...model,
          cliScopes: scopes.map(scope => ({
            id: scope.id,
            path: scope.path || '/',
            commands: scope.commands?.map(cmd => cmd.id) || [],
            active: scope.active || false,
            parent: scope.parent
          }))
        }
        break
        
      case 'RefreshComponents':
        // In a real implementation, this would introspect the JSX component tree
        newModel = {
          ...model,
          jsxComponents: [
            // Placeholder - would be populated by JSX runtime introspection
            {
              id: 'root',
              name: 'App',
              props: {},
              state: {},
              renderTime: model.performance.renderTime
            }
          ]
        }
        break
        
      case 'UpdatePerformance':
        newModel = {
          ...model,
          performance: {
            ...model.performance,
            ...msg.metrics,
            updateCount: model.performance.updateCount + 1
          }
        }
        break
        
      case 'ExecuteCommand':
        newModel = {
          ...model,
          commandExecuting: true,
          commandOutput: '',
          commandError: null
        }
        
        // Would trigger actual command execution
        commands.push(
          Effect.succeed({ _tag: 'CommandComplete', output: 'Command executed successfully' })
        )
        break
        
      case 'CommandComplete':
        newModel = {
          ...model,
          commandExecuting: false,
          commandOutput: msg.output
        }
        break
        
      case 'CommandError':
        newModel = {
          ...model,
          commandExecuting: false,
          commandError: msg.error
        }
        break
        
      case 'ClearLogs':
        newModel = {
          ...model,
          logs: []
        }
        break
        
      case 'ClearHistory':
        newModel = {
          ...model,
          updateHistory: []
        }
        break
        
      case 'Refresh':
        commands.push(
          Effect.succeed({ _tag: 'RefreshScopes' }),
          Effect.succeed({ _tag: 'RefreshComponents' })
        )
        newModel = model
        break
        
      default:
        newModel = model
    }
    
    // Update performance metrics
    const renderTime = Date.now() - startTime
    newModel.performance.renderTime = renderTime
    newModel.performance.lastRender = new Date()
    
    return [newModel, commands] as const
  })
}

// View function - render the debug interface
export const viewDebugModel = (model: DebugModel): View => {
  return RichDebugInterface({
    children: model.appComponent ? 
      (typeof model.appComponent === 'function' ? model.appComponent() : model.appComponent) :
      undefined,
    initialState: {
      activeTab: model.activeTab,
      logs: model.logs.map(log => `[${log.level.toUpperCase()}] ${log.message}`),
      modelState: model.modelState,
      viewTree: model.viewTree,
      updateHistory: model.updateHistory,
      cliScopes: model.cliScopes,
      jsxComponents: model.jsxComponents,
      performance: model.performance
    }
  })
}

// Subscriptions - ongoing effects and event listeners
export const debugSubscriptions = (model: DebugModel): Effect.Effect<DebugMsg>[] => {
  const subscriptions: Effect.Effect<DebugMsg>[] = []
  
  // Real-time performance monitoring
  subscriptions.push(
    Effect.gen(function* () {
      yield* Effect.sleep(1000) // Update every second
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
      const cpuUsage = process.cpuUsage().system / 1000000 // Convert to seconds
      
      return {
        _tag: 'UpdatePerformance',
        metrics: {
          memoryUsage,
          cpuUsage
        }
      } as DebugMsg
    }).pipe(Effect.forever)
  )
  
  // Scope change monitoring
  subscriptions.push(
    Effect.gen(function* () {
      yield* Effect.sleep(500) // Check every 500ms
      return { _tag: 'RefreshScopes' } as DebugMsg
    }).pipe(Effect.forever)
  )
  
  return subscriptions
}

// Complete TEA component
export const createDebugComponent = (
  appComponent?: (() => JSXElement) | JSXElement
): Component<DebugModel, DebugMsg> => ({
  init: Effect.succeed([initDebugModel(appComponent), []]),
  update: updateDebugModel,
  view: viewDebugModel,
  subscription: (model) => Effect.succeed(debugSubscriptions(model))
})