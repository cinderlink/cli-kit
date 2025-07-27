/**
 * Debug MVU Integration
 * 
 * Provides MVU-aware debug wrapping for applications
 */

import { Effect } from "effect"
import type { Component, Cmd, View } from "@core/types"
import { box, vstack, hstack, text, empty } from "@core/view"

// Debug state model
export interface DebugModel {
  activeTab: string
  logs: string[]
  output: string[]
  events: Array<{ timestamp: number; type: string; data: unknown }>
  isVisible: boolean
  performance: {
    renderCount: number
    lastRenderTime: number
    avgRenderTime: number
  }
}

// Debug messages
export type DebugMsg =
  | { type: "SwitchTab"; tab: string }
  | { type: "ToggleVisibility" }
  | { type: "AddLog"; message: string }
  | { type: "AddOutput"; content: string }
  | { type: "RecordEvent"; event: string; data: unknown }
  | { type: "UpdatePerformance"; renderTime: number }

// Initialize debug model
export const initDebugModel = (): DebugModel => ({
  activeTab: "app",
  logs: [],
  output: [],
  events: [],
  isVisible: true,
  performance: {
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0
  }
})

// Update debug state
export const updateDebug = (msg: DebugMsg, model: DebugModel): [DebugModel, Cmd<DebugMsg>[]] => {
  switch (msg.type) {
    case "SwitchTab":
      return [{ ...model, activeTab: msg.tab }, []]
      
    case "ToggleVisibility":
      return [{ ...model, isVisible: !model.isVisible }, []]
      
    case "AddLog":
      return [{ ...model, logs: [...model.logs, msg.message].slice(-100) }, []]
      
    case "AddOutput":
      return [{ ...model, output: [...model.output, msg.content].slice(-100) }, []]
      
    case "RecordEvent":
      return [{
        ...model,
        events: [...model.events, {
          timestamp: Date.now(),
          type: msg.event,
          data: msg.data
        }].slice(-50)
      }, []]
      
    case "UpdatePerformance":
      const { renderCount, avgRenderTime } = model.performance
      const newAvg = (avgRenderTime * renderCount + msg.renderTime) / (renderCount + 1)
      return [{
        ...model,
        performance: {
          renderCount: renderCount + 1,
          lastRenderTime: msg.renderTime,
          avgRenderTime: newAvg
        }
      }, []]
      
    default:
      return [model, []]
  }
}

// Type for wrapped model
export interface DebugWrappedModel<AppModel> {
  app: AppModel
  debug: DebugModel
}

// Type for wrapped message
export type DebugWrappedMsg<AppMsg> =
  | { type: "App"; msg: AppMsg }
  | { type: "Debug"; msg: DebugMsg }

// Check if message is for debug
export const isDebugMsg = <AppMsg>(msg: DebugWrappedMsg<AppMsg>): msg is { type: "Debug"; msg: DebugMsg } =>
  msg.type === "Debug"

/**
 * Wrap an MVU app with debug functionality
 * 
 * This wraps the app's model, messages, and view to add debug capabilities
 * when TUIX_DEBUG environment variable is set to 'true'
 */
export const wrapWithDebug = <Model, Msg>(
  app: Component<Model, Msg>
): Component<DebugWrappedModel<Model>, DebugWrappedMsg<Msg>> => ({
  init: Effect.gen(function* () {
    const [appModel, appCmds] = yield* app.init
    const debugModel = initDebugModel()
    
    // Wrap app commands
    const wrappedCmds = appCmds.map(cmd => 
      Effect.map(cmd, (msg): DebugWrappedMsg<Msg> => ({ type: "App", msg }))
    )
    
    return [
      { app: appModel, debug: debugModel },
      wrappedCmds as Cmd<DebugWrappedMsg<Msg>>[]
    ]
  }),
  
  update: (msg, model) => Effect.gen(function* () {
    if (isDebugMsg(msg)) {
      // Handle debug message
      const [newDebug, debugCmds] = updateDebug(msg.msg, model.debug)
      const wrappedCmds = debugCmds.map(cmd =>
        Effect.map(cmd, (debugMsg): DebugWrappedMsg<Msg> => ({ type: "Debug", msg: debugMsg }))
      )
      return [{ ...model, debug: newDebug }, wrappedCmds as Cmd<DebugWrappedMsg<Msg>>[]]
    } else {
      // Handle app message
      const startTime = performance.now()
      const [newApp, appCmds] = yield* app.update(msg.msg, model.app)
      const renderTime = performance.now() - startTime
      
      // Wrap app commands
      const wrappedCmds = appCmds.map(cmd =>
        Effect.map(cmd, (appMsg): DebugWrappedMsg<Msg> => ({ type: "App", msg: appMsg }))
      )
      
      // Add performance tracking
      const perfCmd = Effect.succeed<DebugWrappedMsg<Msg>>({
        type: "Debug",
        msg: { type: "UpdatePerformance", renderTime }
      })
      
      return [
        { ...model, app: newApp },
        [...wrappedCmds, perfCmd] as Cmd<DebugWrappedMsg<Msg>>[]
      ]
    }
  }),
  
  view: (model) => {
    // Create debug UI view
    const debugUI = createDebugUI(model.debug, (msg: DebugMsg): DebugWrappedMsg<Msg> => ({ type: "Debug", msg }))
    
    // Get app view with wrapped dispatch
    const appView = app.view(model.app)
    
    // Combine views based on visibility
    if (!model.debug.isVisible) {
      return appView
    }
    
    // Return debug-wrapped view
    return vstack([
      debugUI,
      box(appView, { border: true, padding: 1 })
    ])
  },
  
  subscriptions: app.subscriptions ? (model) => app.subscriptions!(model.app) : undefined
})

/**
 * Create debug UI view
 */
function createDebugUI<Msg>(model: DebugModel, dispatch: (msg: DebugMsg) => Msg): View {
  const tabs = ['app', 'logs', 'output', 'events', 'performance']
  
  return vstack([
    // Tab bar
    hstack(
      tabs.map(tab =>
        text(` ${tab} `, {
          bold: model.activeTab === tab,
          underline: model.activeTab === tab
        })
      )
    ),
    
    // Tab content
    box(renderTabContent(model), {
      height: 10,
      border: true
    })
  ])
}

function renderTabContent(model: DebugModel): View {
  switch (model.activeTab) {
    case 'logs':
      return vstack(
        model.logs.map(log => text(log))
      )
      
    case 'output':
      return vstack(
        model.output.map(out => text(out))
      )
      
    case 'events':
      return vstack(
        model.events.map(event =>
          text(`${new Date(event.timestamp).toISOString()} - ${event.type}: ${JSON.stringify(event.data)}`)
        )
      )
      
    case 'performance':
      return vstack([
        text(`Render count: ${model.performance.renderCount}`),
        text(`Last render: ${model.performance.lastRenderTime.toFixed(2)}ms`),
        text(`Avg render: ${model.performance.avgRenderTime.toFixed(2)}ms`)
      ])
      
    default:
      return text('App view active')
  }
}

/**
 * Enable debug mode for an app
 * 
 * Checks TUIX_DEBUG environment variable and wraps the app if enabled
 */
export const enableDebugIfNeeded = <Model, Msg>(
  app: Component<Model, Msg>
): Component<DebugWrappedModel<Model> | Model, DebugWrappedMsg<Msg> | Msg> => {
  if (process.env.TUIX_DEBUG === 'true') {
    return wrapWithDebug(app)
  }
  return app
}